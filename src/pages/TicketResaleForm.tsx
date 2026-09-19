import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { xaf } from '../lib/eventStatus';
import { cn } from '../lib/utils';

/** Fallback only — the event carries the real ceiling (§28 "par exemple 100 % ou 120 %"). */
const DEFAULT_MAX_PCT = 120;

export default function TicketResaleForm() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [ticket, setTicket] = useState<any>(null);
    const [ticketType, setTicketType] = useState<any>(null);
    const [event, setEvent] = useState<any>(null);
    const [askingPrice, setAskingPrice] = useState('');

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await sbcApiService.getMyTicket(id);
                if (res.apiReportedSuccess && res.body?.data) {
                    setTicket(res.body.data.ticket);
                    setTicketType(res.body.data.ticketType);
                    setEvent(res.body.data.event);
                    setAskingPrice(String(res.body.data.ticketType?.price ?? ''));
                } else setError(res.message || 'Billet introuvable.');
            } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const originalPrice: number | undefined = ticketType?.price;
    const maxPct: number = event?.maxResalePricePct ?? DEFAULT_MAX_PCT;
    const maxPrice = useMemo(
        () => (typeof originalPrice === 'number' ? Math.round((originalPrice * maxPct) / 100) : null),
        [originalPrice, maxPct],
    );

    const price = parseInt(askingPrice, 10);
    const priceValid = Number.isFinite(price) && price >= 1;
    const overCap = priceValid && maxPrice !== null && price > maxPrice;

    const submit = async () => {
        if (!id) return;
        if (!priceValid) { setError('Indiquez un prix valide.'); return; }
        if (overCap) { setError(`Le prix ne peut pas dépasser ${xaf(maxPrice!)} pour ce billet.`); return; }
        setSubmitting(true); setError(null);
        try {
            const res = await sbcApiService.createResaleListing(id, price);
            if (res.apiReportedSuccess) navigate(`/events/mes-billets/${id}`, { replace: true });
            else setError(res.message || "Impossible de créer l'annonce.");
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setSubmitting(false); }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-3 flex flex-col gap-3">
                <Skeleton height="h-10" rounded="rounded-card" />
                <Skeleton height="h-28" rounded="rounded-card" />
                <Skeleton height="h-36" rounded="rounded-card" />
            </div>
        );
    }
    if (error && !ticket) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-10">
                <p className="bg-surface border border-border rounded-card p-6 text-center text-sm font-semibold text-danger">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Revendre mon billet</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-4">
                <section className="bg-surface border border-border rounded-card p-4">
                    <p className="text-xs text-ink-2">Billet</p>
                    <p className="font-semibold text-ink">{ticket?.serial}</p>
                    <p className="text-sm text-ink-2 mt-0.5">{event?.title}</p>
                    <p className="text-xs text-ink-2 mt-1">
                        {ticketType?.name} · prix d'origine <span className="font-medium text-ink">{xaf(originalPrice)}</span>
                    </p>
                </section>

                <label className="block">
                    <span className="text-sm font-medium text-ink">Votre prix de revente</span>
                    <span className="relative mt-2 block">
                        <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={maxPrice ?? undefined}
                            value={askingPrice}
                            onChange={(e) => { setAskingPrice(e.target.value); setError(null); }}
                            aria-invalid={overCap}
                            className={cn(
                                'w-full rounded-card border bg-surface px-3 py-3 pr-14 text-lg font-semibold text-ink focus:outline-none',
                                overCap ? 'border-danger' : 'border-border focus:border-primary',
                            )}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">XAF</span>
                    </span>
                </label>

                {maxPrice !== null && (
                    <div className={cn('rounded-card p-3 text-xs', overCap ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-ink-2')}>
                        {overCap
                            ? <>Prix trop élevé : le maximum autorisé est <strong className="font-semibold">{xaf(maxPrice)}</strong> ({maxPct} % du prix d'origine).</>
                            : <>Prix maximum autorisé pour ce billet : <strong className="font-semibold text-ink">{xaf(maxPrice)}</strong> ({maxPct} % du prix d'origine).</>}
                    </div>
                )}

                <div className="bg-primary-soft rounded-card p-3 text-xs text-ink-2">
                    <p className="font-semibold text-ink">Comment ça marche</p>
                    <ul className="mt-1 flex flex-col gap-1">
                        <li>· Une commission SBC est prélevée sur le prix de revente.</li>
                        <li>· Une fois vendu, votre billet est invalidé et un nouveau QR est délivré à l'acheteur.</li>
                        <li>· Le montant net est crédité sur votre solde organisateur SBC.</li>
                        <li>· Vous pouvez retirer l'annonce tant que le billet n'a pas été acheté.</li>
                    </ul>
                </div>

                {error && <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">{error}</p>}

                <button
                    onClick={submit}
                    disabled={submitting || !priceValid || overCap}
                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Publication…' : 'Mettre en revente'}
                </button>
            </div>
        </div>
    );
}
