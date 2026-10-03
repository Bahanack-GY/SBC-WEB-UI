import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, CheckmarkCircle02Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { VOTE_TX_STATUS, challengePath, errorMessage, fmtDateTime, info } from '../../lib/animation';
import { TONE_CLASS, xaf } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

/**
 * After a vote purchase: the payment runs in another tab and only the
 * server's webhook decides the outcome, so this screen polls the transaction.
 */
const POLL_MS = 3000;
const MAX_MS = 10 * 60_000;

export default function VotePaymentStatus() {
    const { txId = '' } = useParams<{ txId: string }>();
    const navigate = useNavigate();

    const [data, setData] = useState<any>(null);
    const [eventSlug, setEventSlug] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gaveUp, setGaveUp] = useState(false);
    const started = useRef(Date.now());

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        started.current = Date.now();
        const tick = async () => {
            let status: string | undefined;
            try {
                const res = await animationApi.myVoteTransaction(txId);
                if (cancelled) return;
                if (res.apiReportedSuccess && res.body?.data) {
                    setData(res.body.data);
                    setError(null);
                    status = res.body.data.transaction?.status;
                } else if (res.statusCode >= 400 && res.statusCode < 500) {
                    setError(errText(res));
                    setLoading(false);
                    return; // not found / not mine: no point polling
                }
            } catch { /* transient: keep polling */ }
            if (cancelled) return;
            setLoading(false);
            if (status && status !== 'PENDING') return;
            if (Date.now() - started.current >= MAX_MS) { setGaveUp(true); return; }
            timer = setTimeout(tick, POLL_MS);
        };
        tick();
        return () => { cancelled = true; clearTimeout(timer); };
    }, [txId]);

    // The challenge link needs the event slug, which only the challenge carries.
    const challengeId: string | undefined = data?.challenge?._id ?? data?.transaction?.challengeId;
    useEffect(() => {
        if (!challengeId || eventSlug) return;
        animationApi.challenge(String(challengeId))
            .then((r) => { if (r.apiReportedSuccess && r.body?.data?.event?.slug) setEventSlug(r.body.data.event.slug); })
            .catch(() => undefined);
    }, [challengeId, eventSlug]);

    const tx = data?.transaction;
    const ch = data?.challenge;
    const cand = data?.candidate;
    const status: string | undefined = tx?.status;
    const st = info(VOTE_TX_STATUS, status);
    const base = eventSlug && ch?.slug ? challengePath(eventSlug, ch.slug) : null;
    const candidateUrl = base && cand ? `${base}/candidats/${cand.number}` : null;
    const votes = typeof tx?.votes === 'number' ? `${tx.votes.toLocaleString('fr-FR')} vote${tx.votes > 1 ? 's' : ''}` : 'Vos votes';

    const success = status === 'SUCCESS' && !tx?.lateSettlement;
    const late = Boolean(tx?.lateSettlement) && (status === 'SUCCESS' || status === 'REFUNDED');
    const refunded = status === 'REFUNDED' || late;
    const failed = status === 'FAILED' || status === 'CANCELLED';

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(candidateUrl || '/events/mes-defis')} />
                <h1 className="text-xl font-bold text-ink">Achat de votes</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-3">
                {loading ? (
                    <Skeleton height="h-48" rounded="rounded-card" />
                ) : error && !data ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                        <p className="text-sm font-semibold text-ink">{error}</p>
                        <button onClick={() => navigate('/events/mes-defis')} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                            Mes achats de votes
                        </button>
                    </div>
                ) : (
                    <>
                        <section className={cn('rounded-card p-5 text-center', success ? 'bg-success-soft' : failed ? 'bg-danger-soft' : refunded ? 'bg-primary-soft' : 'bg-accent-soft')}>
                            <span className={cn(
                                'mx-auto grid size-12 place-items-center rounded-pill text-white',
                                success ? 'bg-success' : failed ? 'bg-danger' : refunded ? 'bg-primary' : 'bg-accent',
                            )}>
                                <HugeiconsIcon icon={success || refunded ? CheckmarkCircle02Icon : failed ? AlertCircleIcon : Clock01Icon} size={24} />
                            </span>
                            <p className="mt-3 text-base font-bold text-ink text-balance">
                                {success ? `${votes} crédité${tx.votes > 1 ? 's' : ''} à ${cand?.displayName ?? 'votre candidat'}`
                                    : late ? 'Paiement reçu après la clôture'
                                        : refunded ? 'Remboursé'
                                            : failed ? 'Paiement non abouti'
                                                : 'Paiement en cours…'}
                            </p>
                            <p className="mt-1 text-sm text-ink-2 text-pretty">
                                {success ? 'Merci pour votre soutien ! Le classement se met à jour dans quelques secondes.'
                                    : late ? 'Paiement reçu après la clôture des votes : vous êtes intégralement remboursé sur votre solde SBC.'
                                        : refunded ? 'Le montant a été remboursé sur votre solde SBC.'
                                            : failed ? 'Aucun vote n’a été crédité. Vous pouvez réessayer depuis la page du candidat.'
                                                : gaveUp ? 'Nous n’avons pas encore reçu la confirmation de l’opérateur. Vos votes seront crédités automatiquement dès qu’elle arrive.'
                                                    : 'Paiement en cours… finalisez le paiement dans l’onglet ouvert. Cette page se met à jour toute seule.'}
                            </p>
                            {status === 'PENDING' && !gaveUp && <span className="mt-3 inline-block size-2 animate-pulse rounded-pill bg-accent" aria-hidden />}
                        </section>

                        {status === 'PENDING' && tx?.paymentSessionId && (
                            <button
                                onClick={() => window.open(sbcApiService.generatePaymentUrl(tx.paymentSessionId), '_blank', 'noopener,noreferrer')}
                                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                            >
                                Rouvrir la page de paiement
                            </button>
                        )}

                        <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
                            {cand && (
                                <div className="flex items-center gap-3 pb-2 border-b border-border">
                                    <span className="size-10 shrink-0 rounded-pill bg-surface-2 overflow-hidden grid place-items-center text-sm font-bold text-ink-3">
                                        {cand.photoFileId ? <img src={sbcApiService.generateThumbnailUrl(cand.photoFileId, 96)} alt="" className="size-full object-cover" /> : cand.displayName?.[0]?.toUpperCase()}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-ink truncate">{cand.displayName} · n°{cand.number}</span>
                                        {ch?.name && <span className="block text-xs text-ink-2 truncate">{ch.name}</span>}
                                    </span>
                                </div>
                            )}
                            <Row label="Statut"><span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>{st.label}</span></Row>
                            {tx?.packageSnapshot?.label && <Row label="Pack"><span className="text-sm text-ink">{tx.packageSnapshot.label}</span></Row>}
                            {typeof tx?.votes === 'number' && <Row label="Votes"><span className="text-sm font-semibold text-ink tabular-nums">{tx.votes}</span></Row>}
                            {typeof tx?.amount === 'number' && <Row label="Montant"><span className="text-sm font-semibold text-ink tabular-nums">{xaf(tx.amount)}</span></Row>}
                            {tx?.createdAt && <Row label="Date"><span className="text-xs text-ink-2">{fmtDateTime(tx.createdAt)}</span></Row>}
                            <Row label="Référence"><span className="text-xs font-mono text-ink-2">{txId.slice(-10)}</span></Row>
                        </section>

                        {candidateUrl && (
                            <button
                                onClick={() => navigate(candidateUrl)}
                                className={cn(
                                    'w-full rounded-xl py-3 text-sm font-semibold transition-colors',
                                    failed ? 'bg-primary text-white hover:bg-primary-hover' : 'border border-border bg-surface text-ink',
                                )}
                            >
                                {failed ? 'Réessayer' : `Retour à ${cand?.displayName ?? 'la page du candidat'}`}
                            </button>
                        )}
                        {base && (
                            <button onClick={() => navigate(`${base}/live`)} className="w-full py-2 text-sm font-semibold text-primary">
                                Voir le classement en direct
                            </button>
                        )}
                        <button onClick={() => navigate('/events/mes-defis')} className="w-full py-2 text-sm text-ink-2">
                            Mes achats de votes
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-ink-2">{label}</span>
            {children}
        </div>
    );
}
