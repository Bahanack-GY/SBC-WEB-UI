import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Exchange01Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { ticketStatusInfo, TONE_CLASS, xaf } from '../lib/eventStatus';
import { cn } from '../lib/utils';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'full' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function MyTicketScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [withdrawing, setWithdrawing] = useState(false);

    const load = useCallback(async () => {
        if (!id) return;
        try {
            const res = await sbcApiService.getMyTicket(id);
            if (res.apiReportedSuccess) setData(res.body?.data);
            else setError(res.message || 'Billet introuvable.');
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-3 flex flex-col gap-3">
                <Skeleton height="h-10" rounded="rounded-card" />
                <Skeleton height="h-80" rounded="rounded-card" />
                <Skeleton height="h-28" rounded="rounded-card" />
            </div>
        );
    }
    if (error || !data) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-10">
                <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                    <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                    <p className="text-sm font-semibold text-ink">{error || 'Billet introuvable.'}</p>
                    <button onClick={() => navigate('/events/mes-billets')} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                        Mes billets
                    </button>
                </div>
            </div>
        );
    }

    const { ticket, event, ticketType, qrImageDataUrl, activeResaleListing, resaleOrder } = data;
    const isListed = Boolean(activeResaleListing);
    const st = ticketStatusInfo(ticket.status, isListed);
    // §28 eligibility: paid, unused, not cancelled/refunded, resale allowed by the organizer.
    const canResell = ticket.status === 'ISSUED' && event?.resaleEnabled && !isListed;

    const withdrawListing = async () => {
        if (!activeResaleListing?._id) return;
        setWithdrawing(true);
        try {
            await sbcApiService.cancelMyResaleListing(activeResaleListing._id);
            await load();
        } catch (e: any) { setError(e?.message || "Impossible de retirer l'annonce."); }
        finally { setWithdrawing(false); }
    };

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Mon billet</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-3">
                {/* The ticket itself — QR first, it is what gets scanned at the door. */}
                <section className="bg-surface border border-border rounded-card p-5 text-center">
                    {ticket.previousTicketId && (
                        <p className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                            <HugeiconsIcon icon={Exchange01Icon} size={12} />
                            Acheté via la marketplace de revente
                        </p>
                    )}
                    <p className="text-xs text-ink-2">Billet</p>
                    <p className="text-lg font-bold text-ink tabular-nums">{ticket.serial}</p>
                    <p className="text-sm text-ink-2 mt-1">{ticket.holderName}</p>

                    {qrImageDataUrl ? (
                        <img src={qrImageDataUrl} alt="QR Code du billet" className="mx-auto mt-4 size-56 rounded-tile border border-border bg-white p-2" />
                    ) : (
                        <p className="mt-4 rounded-tile bg-danger-soft p-3 text-sm text-danger">
                            Ce billet n'est plus valide et ne peut pas être scanné.
                        </p>
                    )}

                    <span className={cn('mt-4 inline-block rounded-pill px-3 py-1 text-xs font-bold uppercase tracking-wide', TONE_CLASS[st.tone])}>
                        {st.label}
                    </span>
                </section>

                <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-1">
                    <p className="font-semibold text-ink">{event?.title}</p>
                    {event?.startsAt && (
                        <p className="text-sm text-ink-2">
                            {fmtDate(event.startsAt)} · {fmtTime(event.startsAt)}
                        </p>
                    )}
                    <p className="text-sm text-ink-2">{event?.venue}</p>
                    <p className="text-xs text-ink-3">{event?.address}</p>
                    <p className="text-xs text-ink-2 mt-2">Type de billet : <span className="font-medium text-ink">{ticketType?.name}</span></p>
                </section>

                {isListed && (
                    <section className="bg-accent-soft rounded-card p-4">
                        <p className="text-sm font-semibold text-ink">Ce billet est en vente sur la marketplace</p>
                        <p className="text-xs text-ink-2 mt-1">
                            Prix demandé : <span className="font-semibold text-ink">{xaf(activeResaleListing.askingPrice)}</span>
                            {typeof activeResaleListing.originalPrice === 'number' && (
                                <> · prix d'origine {xaf(activeResaleListing.originalPrice)}</>
                            )}
                        </p>
                        <p className="text-xs text-ink-2 mt-1">
                            Tant qu'il n'est pas vendu, vous pouvez retirer l'annonce et garder votre billet.
                        </p>
                        <button
                            onClick={withdrawListing}
                            disabled={withdrawing}
                            className="mt-3 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-60"
                        >
                            {withdrawing ? 'Retrait…' : "Retirer l'annonce"}
                        </button>
                    </section>
                )}

                {canResell && (
                    <button
                        onClick={() => navigate(`/events/mes-billets/${ticket._id}/revendre`)}
                        className="w-full rounded-xl border border-primary py-3 text-sm font-semibold text-primary hover:bg-primary-soft transition-colors"
                    >
                        Revendre mon billet
                    </button>
                )}

                <button
                    onClick={() => navigate('/events/signaler', {
                        state: {
                            ticketId: ticket._id,
                            // A ticket bought on the marketplace carries its resale order, so the
                            // dispute lands on the right kind (§28 litiges).
                            resaleOrderId: resaleOrder?._id,
                            eventTitle: event?.title,
                            serial: ticket.serial,
                        },
                    })}
                    className="w-full py-2 text-sm text-ink-2"
                >
                    Signaler un problème avec ce billet
                </button>
            </div>
        </div>
    );
}
