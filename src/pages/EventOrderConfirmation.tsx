import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Clock01Icon, AlertCircleIcon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { statusInfo, TONE_CLASS, xaf } from '../lib/eventStatus';
import { cn } from '../lib/utils';

/**
 * Confirmation screen for a ticket order (§10).
 *
 * The payment itself happens in another tab, and only the server may decide a
 * payment succeeded (§9) — so this screen polls the order rather than trusting
 * anything the payment page hands back. It stops polling once the order is
 * settled, or after a few minutes, so a forgotten tab is not a background loop.
 */
const POLL_MS = 4000;
const MAX_POLLS = 75; // ~5 minutes

export default function EventOrderConfirmation() {
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const eventTitle = (location.state as { eventTitle?: string } | null)?.eventTitle;

    const [order, setOrder] = useState<any>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gaveUp, setGaveUp] = useState(false);
    const polls = useRef(0);

    const fetchOrder = useCallback(async () => {
        if (!orderId) return null;
        try {
            const res = await sbcApiService.getTicketOrder(orderId);
            if (res.apiReportedSuccess && res.body?.data) {
                setOrder(res.body.data.order ?? res.body.data);
                setTickets(res.body.data.tickets ?? []);
                return (res.body.data.order ?? res.body.data)?.status as string | undefined;
            }
            setError(res.message || 'Commande introuvable.');
        } catch (e: any) {
            setError(e?.message || 'Erreur réseau.');
        } finally {
            setLoading(false);
        }
        return null;
    }, [orderId]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        let cancelled = false;

        const tick = async () => {
            const status = await fetchOrder();
            if (cancelled) return;
            const settled = status === 'PAID' || status === 'FAILED' || status === 'CANCELLED' || status === 'REFUNDED';
            if (settled) return;
            if (++polls.current >= MAX_POLLS) { setGaveUp(true); return; }
            timer = setTimeout(tick, POLL_MS);
        };
        tick();

        return () => { cancelled = true; clearTimeout(timer); };
    }, [fetchOrder]);

    const status: string | undefined = order?.status;
    const paid = status === 'PAID';
    const failed = status === 'FAILED' || status === 'CANCELLED';
    const st = statusInfo('order', status);

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate('/events')} />
                <h1 className="text-xl font-bold text-ink">Votre commande</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-3">
                {loading ? (
                    <Skeleton height="h-48" rounded="rounded-card" />
                ) : error && !order ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                        <p className="text-sm font-semibold text-ink">{error}</p>
                        <button onClick={() => navigate('/events/mes-billets')} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                            Mes billets
                        </button>
                    </div>
                ) : (
                    <>
                        <section className={cn(
                            'rounded-card p-5 text-center',
                            paid ? 'bg-success-soft' : failed ? 'bg-danger-soft' : 'bg-accent-soft',
                        )}>
                            <span className={cn(
                                'mx-auto grid size-12 place-items-center rounded-pill',
                                paid ? 'bg-success text-white' : failed ? 'bg-danger text-white' : 'bg-accent text-white',
                            )}>
                                <HugeiconsIcon icon={paid ? CheckmarkCircle02Icon : failed ? AlertCircleIcon : Clock01Icon} size={24} />
                            </span>
                            <p className="mt-3 text-base font-bold text-ink">
                                {paid ? 'Paiement confirmé' : failed ? 'Paiement non abouti' : 'Paiement en cours…'}
                            </p>
                            <p className="mt-1 text-sm text-ink-2 text-pretty">
                                {paid
                                    ? `Vos billets sont émis${eventTitle ? ` pour ${eventTitle}` : ''} et disponibles dans « Mes billets ».`
                                    : failed
                                        ? "Aucun montant n'a été retenu. Vous pouvez relancer l'achat depuis l'événement."
                                        : gaveUp
                                            ? "Nous n'avons pas encore reçu la confirmation de l'opérateur. Vos billets apparaîtront automatiquement dans « Mes billets » dès qu'elle arrive."
                                            : "Terminez le paiement dans l'onglet ouvert. Cette page se met à jour toute seule."}
                            </p>
                            {!paid && !failed && !gaveUp && (
                                <span className="mt-3 inline-block size-2 animate-pulse rounded-pill bg-accent" aria-hidden />
                            )}
                        </section>

                        <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-ink-2">Statut</span>
                                <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>{st.label}</span>
                            </div>
                            {typeof order?.total === 'number' && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-ink-2">Montant</span>
                                    <span className="text-sm font-semibold text-ink tabular-nums">{xaf(order.total)}</span>
                                </div>
                            )}
                            {orderId && (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-ink-2">Référence</span>
                                    <span className="text-xs font-mono text-ink-2">{orderId.slice(-10)}</span>
                                </div>
                            )}
                        </section>

                        {tickets.length > 0 && (
                            <section className="bg-surface border border-border rounded-card p-4">
                                <p className="text-sm font-semibold text-ink mb-2">
                                    {tickets.length} billet{tickets.length > 1 ? 's' : ''} émis
                                </p>
                                <ul className="flex flex-col gap-1.5">
                                    {tickets.map((t: any) => (
                                        <li key={t._id} className="flex items-center gap-2 text-sm text-ink-2">
                                            <HugeiconsIcon icon={Ticket01Icon} size={15} className="text-primary shrink-0" />
                                            <span className="font-medium text-ink">{t.serial}</span>
                                            {t.holderName && <span className="truncate">· {t.holderName}</span>}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <button
                            onClick={() => navigate('/events/mes-billets')}
                            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                        >
                            Voir mes billets
                        </button>
                        <button onClick={() => navigate('/events')} className="w-full py-2 text-sm text-ink-2">
                            Retour aux événements
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
