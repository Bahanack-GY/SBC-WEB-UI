import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import { cn } from '../lib/utils';

const KINDS: { value: string; label: string; resaleOnly?: boolean }[] = [
    { value: 'EVENT_NOT_AS_ADVERTISED', label: "L'événement ne correspond pas à la description" },
    { value: 'RESALE_INVALID_TICKET', label: 'Le billet acheté en revente est invalide', resaleOnly: true },
    { value: 'RESALE_NOT_RECEIVED', label: "Je n'ai pas reçu le billet acheté en revente", resaleOnly: true },
    { value: 'OTHER', label: 'Autre problème' },
];

const MIN_LENGTH = 10;

export default function OpenDispute() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as { ticketId?: string; resaleOrderId?: string; eventTitle?: string; serial?: string };
    // The resale-specific kinds only make sense for a ticket bought on the
    // marketplace — otherwise they'd be dead options that admins must triage.
    const kinds = state.resaleOrderId ? KINDS : KINDS.filter((k) => !k.resaleOnly);

    const [kind, setKind] = useState<string>(state.resaleOrderId ? 'RESALE_INVALID_TICKET' : 'OTHER');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState(false);

    const tooShort = description.trim().length < MIN_LENGTH;

    const submit = async () => {
        if (tooShort) { setError(`Décrivez le problème en au moins ${MIN_LENGTH} caractères.`); return; }
        setSubmitting(true); setError(null);
        try {
            const res = await sbcApiService.openTicketDispute({
                kind: kind as any,
                description: description.trim(),
                ticketId: state.ticketId,
                resaleOrderId: state.resaleOrderId,
            });
            if (res.apiReportedSuccess) setOk(true);
            else setError(res.message || "Impossible d'enregistrer le signalement.");
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Signaler un problème</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-4">
                {ok ? (
                    <div className="bg-success-soft rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <span className="grid size-12 place-items-center rounded-pill bg-success text-white">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} />
                        </span>
                        <p className="text-base font-bold text-ink">Signalement enregistré</p>
                        <p className="text-sm text-ink-2 text-pretty">
                            L'équipe SBC va l'examiner. Vous serez notifié dès qu'une décision est prise.
                        </p>
                        <button
                            onClick={() => navigate('/events/mes-disputes')}
                            className="mt-2 rounded-pill bg-primary px-5 py-2 text-sm font-semibold text-white"
                        >
                            Suivre mes signalements
                        </button>
                    </div>
                ) : (
                    <>
                        {(state.eventTitle || state.serial) && (
                            <div className="bg-surface border border-border rounded-card p-3">
                                {state.eventTitle && <p className="text-sm font-medium text-ink">{state.eventTitle}</p>}
                                {state.serial && <p className="text-xs text-ink-2 mt-0.5">Billet {state.serial}</p>}
                                {state.resaleOrderId && <p className="text-xs text-accent mt-0.5">Acheté sur la marketplace de revente</p>}
                            </div>
                        )}

                        <label className="block">
                            <span className="text-sm font-medium text-ink">Type de problème</span>
                            <select
                                value={kind}
                                onChange={(e) => setKind(e.target.value)}
                                className="mt-2 w-full rounded-card border border-border bg-surface px-3 py-3 text-sm text-ink focus:outline-none focus:border-primary"
                            >
                                {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                            </select>
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-ink">Description</span>
                            <textarea
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); setError(null); }}
                                placeholder="Décrivez ce qui s'est passé…"
                                rows={6}
                                className="mt-2 w-full rounded-card border border-border bg-surface px-3 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
                            />
                            <span className={cn('mt-1 block text-[11px]', tooShort ? 'text-ink-3' : 'text-success')}>
                                {description.trim().length}/{MIN_LENGTH} caractères minimum
                            </span>
                        </label>

                        {error && <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">{error}</p>}

                        <button
                            onClick={submit}
                            disabled={submitting || tooShort}
                            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Envoi…' : 'Envoyer le signalement'}
                        </button>

                        <button onClick={() => navigate('/events/mes-disputes')} className="w-full py-2 text-sm text-ink-2">
                            Voir mes signalements précédents
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
