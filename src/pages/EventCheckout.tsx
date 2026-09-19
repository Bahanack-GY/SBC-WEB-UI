import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';
import { xaf } from '../lib/eventStatus';
import { cn } from '../lib/utils';

interface TicketType {
    _id: string;
    name: string;
    price: number;
    available: number;
    maxPerOrder: number;
    onSale?: boolean;
}
interface EventDoc { _id: string; slug: string; title: string; }

export default function EventCheckout() {
    useParams<{ slug: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const state = (location.state ?? {}) as { event?: EventDoc; ticketTypes?: TicketType[] };
    const [event] = useState<EventDoc | undefined>(state.event);
    const [ticketTypes] = useState<TicketType[]>(state.ticketTypes ?? []);
    const [selection, setSelection] = useState<Record<string, number>>({});
    const [firstName, setFirstName] = useState(user?.name?.split(' ')[0] || '');
    const [lastName, setLastName] = useState(user?.name?.split(' ').slice(1).join(' ') || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');
    const [email, setEmail] = useState(user?.email || '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const buyable = ticketTypes.filter((t) => t.available > 0 && t.onSale !== false);
    const total = useMemo(
        () => ticketTypes.reduce((s, tt) => s + (selection[tt._id] || 0) * tt.price, 0),
        [selection, ticketTypes],
    );
    const count = Object.values(selection).reduce((s, n) => s + n, 0);

    if (!event) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-10">
                <div className="bg-surface border border-border rounded-card p-6 text-center">
                    <p className="text-sm font-semibold text-ink">Sélectionnez un événement pour acheter.</p>
                    <button onClick={() => navigate('/events')} className="mt-3 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                        Voir les événements
                    </button>
                </div>
            </div>
        );
    }

    const submit = async () => {
        if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
            setError('Prénom, nom et téléphone sont obligatoires.');
            return;
        }
        const items = Object.entries(selection).filter(([, n]) => n > 0).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
        if (items.length === 0) { setError('Sélectionnez au moins un billet.'); return; }

        setSubmitting(true);
        setError(null);
        try {
            const res = await sbcApiService.createTicketOrder({
                eventId: event._id,
                items,
                holder: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() || undefined },
            });
            const orderId = res.body?.data?.orderId;
            const sessionId = res.body?.data?.paymentSessionId;
            if (!res.apiReportedSuccess || !sessionId) {
                setError(res.message || 'Impossible de démarrer le paiement.');
                setSubmitting(false);
                return;
            }
            // Payment opens in its own tab, and this one becomes the confirmation
            // screen (§10): the buyer always has somewhere that tells them where
            // their tickets are, whatever the payment page does afterwards.
            window.open(sbcApiService.generatePaymentUrl(sessionId), '_blank', 'noopener,noreferrer');
            navigate(`/events/commande/${orderId}`, { replace: true, state: { eventTitle: event.title } });
        } catch (e: any) {
            setError(e?.message || 'Erreur réseau.');
            setSubmitting(false);
        }
    };

    const inputClass = 'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary';

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-bold text-ink truncate">Achat — {event.title}</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-4">
                <section className="flex flex-col gap-2">
                    <h2 className="text-base font-bold text-ink">Vos billets</h2>
                    {buyable.length === 0 ? (
                        <p className="bg-surface border border-border rounded-card p-4 text-sm text-ink-2">
                            Aucun billet n'est en vente actuellement pour cet événement.
                        </p>
                    ) : buyable.map((tt) => {
                        const n = selection[tt._id] || 0;
                        const max = Math.min(tt.maxPerOrder, tt.available);
                        return (
                            <div key={tt._id} className="bg-surface border border-border rounded-card p-3 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-medium text-ink">{tt.name}</p>
                                    <p className="text-xs text-ink-2 mt-0.5">{xaf(tt.price)} · {max} max par commande</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        aria-label={`Retirer un billet ${tt.name}`}
                                        onClick={() => setSelection((s) => ({ ...s, [tt._id]: Math.max(0, (s[tt._id] || 0) - 1) }))}
                                        disabled={n === 0}
                                        className="size-9 rounded-pill border border-border text-ink disabled:opacity-40"
                                    >−</button>
                                    <span className="w-6 text-center text-sm font-semibold text-ink tabular-nums">{n}</span>
                                    <button
                                        aria-label={`Ajouter un billet ${tt.name}`}
                                        onClick={() => setSelection((s) => ({ ...s, [tt._id]: Math.min(max, (s[tt._id] || 0) + 1) }))}
                                        disabled={n >= max}
                                        className="size-9 rounded-pill border border-border text-ink disabled:opacity-40"
                                    >+</button>
                                </div>
                            </div>
                        );
                    })}
                </section>

                <section className="flex flex-col gap-2">
                    <h2 className="text-base font-bold text-ink">Vos informations</h2>
                    <p className="text-xs text-ink-2 -mt-1">Elles figureront sur le billet présenté à l'entrée.</p>
                    <div className="grid grid-cols-2 gap-2">
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" className={inputClass} autoComplete="given-name" />
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" className={inputClass} autoComplete="family-name" />
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" inputMode="tel" autoComplete="tel" className={cn(inputClass, 'col-span-2')} />
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optionnel)" type="email" autoComplete="email" className={cn(inputClass, 'col-span-2')} />
                    </div>
                </section>

                {error && <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">{error}</p>}

                <div className="bg-surface border border-border rounded-card p-4 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs text-ink-2">Total à payer</p>
                        <p className="text-xl font-bold text-ink tabular-nums">{xaf(total)}</p>
                        {count > 0 && <p className="text-[11px] text-ink-2">{count} billet{count > 1 ? 's' : ''}</p>}
                    </div>
                    <button
                        onClick={submit}
                        disabled={count === 0 || submitting}
                        className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Ouverture du paiement…' : 'Payer'}
                    </button>
                </div>

                <p className="text-[11px] text-ink-3 text-center">
                    Le paiement s'ouvre dans un nouvel onglet. Vos billets sont émis dès que le paiement est confirmé par l'opérateur.
                </p>
            </div>
        </div>
    );
}
