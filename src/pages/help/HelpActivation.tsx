import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    AlertCircleIcon, CancelCircleIcon, CheckmarkCircle02Icon, Clock01Icon, CreditCardIcon, Search01Icon,
} from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import {
    asList, dateTimeFr, idOf, isActivated, money, payinStatus, supportErrorText, unwrap,
    type ActivationStatus, type CheckResult, type Payin, type Tone,
} from './support';
import { Card, ErrorNote, HelpPage, Pill, Skeletons } from './ui';
import { inputCls, primaryBtn, secondaryBtn, toneClass } from './styles';
import { cn } from '../../lib/utils';

type Outcome = { target: string; result?: CheckResult; error?: string };

const RESULT: Record<CheckResult['result'], { title: string; text: string; tone: Tone; icon: typeof Clock01Icon }> = {
    confirmed: {
        title: 'Paiement confirmé',
        text: 'L’opérateur confirme votre paiement : votre compte s’active. Cela peut prendre une minute.',
        tone: 'success', icon: CheckmarkCircle02Icon,
    },
    pending: {
        title: 'Paiement en attente',
        text: 'L’opérateur n’a pas encore confirmé ce paiement. Nous continuons à vérifier tout seuls : votre compte s’activera dès la confirmation. Revenez dans quelques minutes.',
        tone: 'warning', icon: Clock01Icon,
    },
    not_found: {
        title: 'Paiement introuvable',
        text: 'L’opérateur ne trouve pas ce paiement. Nous avons transmis votre dossier à un agent : il vérifie et vous répond dans « Mes demandes ».',
        tone: 'danger', icon: AlertCircleIcon,
    },
    failed: {
        title: 'Paiement échoué',
        text: 'L’opérateur indique que ce paiement n’a pas abouti : SBC n’a rien reçu. Vous pouvez payer de nouveau depuis la page Abonnement. Si votre compte Mobile Money a quand même été débité, écrivez à un agent.',
        tone: 'danger', icon: CancelCircleIcon,
    },
    provider_unavailable: {
        title: 'Vérification impossible pour le moment',
        text: 'Le service de l’opérateur ne répond pas. Un agent va vérifier votre paiement à la main : suivez sa réponse dans « Mes demandes ».',
        tone: 'warning', icon: AlertCircleIcon,
    },
};

/**
 * « Mon compte n'est pas activé »: the member's recent payments, a recheck of
 * one of them (or of a reference from the operator's SMS), and the answer in
 * plain French. A payment the operator cannot find opens a ticket server-side.
 */
export default function HelpActivation() {
    const queryClient = useQueryClient();
    const status = useQuery({
        queryKey: ['support', 'activation'],
        queryFn: async () => unwrap<ActivationStatus>(await sbcApiService.supportActivationStatus()),
    });
    const [reference, setReference] = useState('');
    const [refError, setRefError] = useState<string | null>(null);
    const [checking, setChecking] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    const check = async (target: { sessionId?: string; reference?: string }) => {
        const key = target.sessionId ?? `ref:${target.reference}`;
        setChecking(key);
        setOutcome(null);
        try {
            const result = unwrap<CheckResult>(await sbcApiService.supportActivationCheck(target));
            setOutcome({ target: key, result });
            if (result.result === 'confirmed') {
                // The paywall reads this query: let it see the new pack at once.
                void queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
                void queryClient.invalidateQueries({ queryKey: ['support', 'activation'] });
            }
            if (result.ticketId || result.ticket) void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
        } catch (e) {
            setOutcome({ target: key, error: supportErrorText(e, 'activation') });
        } finally {
            setChecking(null);
        }
    };

    const submitReference = (e: React.FormEvent) => {
        e.preventDefault();
        const ref = reference.trim();
        if (ref.length < 4) { setRefError('Saisissez la référence complète, telle qu’elle figure dans le SMS de l’opérateur.'); return; }
        setRefError(null);
        void check({ reference: ref });
    };

    const payins = asList<Payin>(status.data?.payins, 'payins');
    const activated = isActivated(status.data);

    return (
        <HelpPage title="Activation de mon compte">
            {status.isLoading ? (
                <Skeletons count={3} />
            ) : status.isError ? (
                <ErrorNote onRetry={() => status.refetch()}>{supportErrorText(status.error)}</ErrorNote>
            ) : activated ? (
                <Card>
                    <p className="flex items-center gap-2 font-semibold text-success">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} /> Votre compte est activé
                    </p>
                    <p className="mt-1 text-sm text-ink-2">Votre pack est actif : tout SBC vous est ouvert.</p>
                    <Link to="/" className={cn(primaryBtn, 'mt-3')}>Aller à l’accueil</Link>
                </Card>
            ) : (
                <>
                    <p className="text-sm text-ink-2">
                        Vous avez payé mais votre compte n’est pas activé ? Choisissez votre paiement ci-dessous : nous
                        redemandons à l’opérateur s’il l’a bien reçu.
                    </p>
                    <Card title="Mes paiements récents" icon={CreditCardIcon}>
                        {payins.length === 0 ? (
                            <p className="text-sm text-ink-2">
                                Aucun paiement récent sur votre compte. Si vous avez payé, saisissez plus bas la référence
                                reçue par SMS de l’opérateur.
                            </p>
                        ) : (
                            <ul className="divide-y divide-border -my-1">
                                {payins.map((p) => {
                                    const s = payinStatus(p.status);
                                    return (
                                        <li key={p.sessionId} className="py-3 space-y-2">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-ink">{money(p.amount, p.currency) || 'Paiement'}</p>
                                                    <p className="text-xs text-ink-3">{[dateTimeFr(p.createdAt), p.gateway].filter(Boolean).join(' · ')}</p>
                                                </div>
                                                <Pill tone={s.tone}>{s.label}</Pill>
                                            </div>
                                            <button type="button" onClick={() => check({ sessionId: p.sessionId })} disabled={checking !== null}
                                                className={secondaryBtn} aria-label={`Vérifier le paiement ${money(p.amount, p.currency)} du ${dateTimeFr(p.createdAt)}`}>
                                                {checking === p.sessionId ? 'Vérification…' : 'Vérifier ce paiement'}
                                            </button>
                                            {outcome?.target === p.sessionId && <OutcomeCard outcome={outcome} />}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>

                    <Card title="J’ai une référence de paiement" icon={Search01Icon}>
                        <form onSubmit={submitReference} noValidate className="space-y-2">
                            <label htmlFor="payment-reference" className="block text-sm text-ink-2">
                                La référence (ou l’identifiant de transaction) figure dans le SMS de confirmation de l’opérateur.
                            </label>
                            <input id="payment-reference" value={reference} onChange={(e) => { setReference(e.target.value); setRefError(null); }}
                                placeholder="Ex : MP241117.1234.A56789" autoComplete="off" maxLength={80}
                                aria-invalid={!!refError} aria-describedby={refError ? 'payment-reference-error' : undefined}
                                className={cn(inputCls, 'h-11')} />
                            {refError && <p id="payment-reference-error" role="alert" className="text-xs text-danger">{refError}</p>}
                            <button type="submit" disabled={checking !== null} className={primaryBtn}>
                                {checking?.startsWith('ref:') ? 'Vérification…' : 'Vérifier cette référence'}
                            </button>
                        </form>
                        {outcome?.target.startsWith('ref:') && <div className="mt-3"><OutcomeCard outcome={outcome} /></div>}
                    </Card>

                    <p className="text-xs text-ink-3 text-center">
                        Toujours bloqué ? <Link to="/aide/demandes/nouvelle?categorie=activation" className="text-primary underline">Écrire à un agent</Link>
                    </p>
                </>
            )}
        </HelpPage>
    );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
    if (outcome.error) return <ErrorNote>{outcome.error}</ErrorNote>;
    const r = outcome.result!;
    const view = RESULT[r.result] ?? RESULT.pending;
    const ticketId = r.ticketId || idOf(r.ticket);
    const hasTicket = r.result === 'not_found' || r.result === 'provider_unavailable';
    return (
        <div role="status" className={cn('rounded-tile p-3 space-y-2', toneClass(view.tone))}>
            <p className="flex items-center gap-2 font-semibold">
                <HugeiconsIcon icon={view.icon} size={20} /> {view.title}
            </p>
            <p className="text-sm text-ink-2">{view.text}</p>
            {r.result === 'confirmed' && <Link to="/" className={primaryBtn}>Aller à l’accueil</Link>}
            {r.result === 'failed' && (
                <div className="flex flex-col gap-2">
                    <Link to="/abonnement" className={primaryBtn}>Payer de nouveau</Link>
                    <Link to="/aide/demandes/nouvelle?categorie=activation" className={secondaryBtn}>Écrire à un agent</Link>
                </div>
            )}
            {hasTicket && (
                <Link to={ticketId ? `/aide/demandes/${encodeURIComponent(ticketId)}` : '/aide/demandes'} className={secondaryBtn}>
                    Voir ma demande
                </Link>
            )}
        </div>
    );
}
