import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';

interface TicketType { _id: string; name: string; price: number; available: number; maxPerOrder: number; }
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

    const total = useMemo(() => {
        return ticketTypes.reduce((s, tt) => s + (selection[tt._id] || 0) * tt.price, 0);
    }, [selection, ticketTypes]);

    const anySelected = Object.values(selection).some((n) => n > 0);

    if (!event) {
        return (
            <div className="p-8 text-center">
                <p>Sélectionnez un événement pour acheter.</p>
                <button onClick={() => navigate('/events')} className="mt-4 text-[#115CF6]">← Retour</button>
            </div>
        );
    }

    const submit = async () => {
        if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
            setError('Nom, prénom et téléphone sont obligatoires.');
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
            if (!res.apiReportedSuccess || !res.body?.data?.paymentSessionId) {
                setError(res.message || 'Impossible de démarrer le paiement.');
                setSubmitting(false);
                return;
            }
            const url = sbcApiService.generatePaymentUrl(res.body?.data.paymentSessionId);
            window.location.href = url;
        } catch (e: any) {
            setError(e?.message || 'Erreur réseau.');
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold truncate">Achat — {event.title}</h1>
            </div>
            <div className="p-4 space-y-4">
                <div>
                    <h2 className="text-base font-semibold mb-2">Vos billets</h2>
                    <div className="space-y-2">
                        {ticketTypes.filter(t => t.available > 0).map((tt) => (
                            <div key={tt._id} className="flex items-center justify-between border border-gray-200 rounded-xl p-3">
                                <div>
                                    <div className="font-medium">{tt.name}</div>
                                    <div className="text-xs text-gray-500">{tt.price.toLocaleString('fr-FR')} XAF · max {tt.maxPerOrder}/commande</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelection((s) => ({ ...s, [tt._id]: Math.max(0, (s[tt._id] || 0) - 1) }))}
                                        className="w-8 h-8 rounded-full border border-gray-300"
                                    >−</button>
                                    <span className="w-8 text-center">{selection[tt._id] || 0}</span>
                                    <button
                                        onClick={() => setSelection((s) => ({ ...s, [tt._id]: Math.min(tt.maxPerOrder, Math.min(tt.available, (s[tt._id] || 0) + 1)) }))}
                                        className="w-8 h-8 rounded-full border border-gray-300"
                                    >+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t pt-4">
                    <h2 className="text-base font-semibold mb-2">Vos informations</h2>
                    <div className="grid grid-cols-2 gap-2">
                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" className="border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" className="border border-gray-300 rounded-xl px-3 py-2 text-sm col-span-2" />
                        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optionnel)" type="email" className="border border-gray-300 rounded-xl px-3 py-2 text-sm col-span-2" />
                    </div>
                </div>

                <div className="border-t pt-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-500">Total à payer</div>
                        <div className="text-xl font-bold text-[#115CF6]">{total.toLocaleString('fr-FR')} XAF</div>
                    </div>
                    <button
                        onClick={submit}
                        disabled={!anySelected || submitting}
                        className="bg-[#115CF6] text-white font-semibold px-6 py-3 rounded-xl disabled:bg-gray-300"
                    >
                        {submitting ? '...' : 'Payer'}
                    </button>
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}
            </div>
        </div>
    );
}
