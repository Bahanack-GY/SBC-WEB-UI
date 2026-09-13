import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

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
                } else setError(res.message || 'Introuvable');
            } catch (e: any) { setError(e?.message || 'Erreur'); }
            finally { setLoading(false); }
        })();
    }, [id]);

    const submit = async () => {
        if (!id) return;
        const price = parseInt(askingPrice, 10);
        if (!price || price < 1) { setError('Prix invalide.'); return; }
        setSubmitting(true); setError(null);
        try {
            const res = await sbcApiService.createResaleListing(id, price);
            if (res.apiReportedSuccess) {
                navigate(`/events/mes-billets/${id}`, { replace: true });
            } else {
                setError(res.message || 'Impossible de créer l\'annonce.');
            }
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setSubmitting(false); }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
    if (error && !ticket) return <div className="p-8 text-center text-red-600">{error}</div>;

    const maxSuggested = ticketType ? Math.round(ticketType.price * 1.2) : null;

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Revendre mon billet</h1>
            </div>
            <div className="p-4 space-y-4">
                <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-xs text-gray-500 uppercase">Billet</div>
                    <div className="font-semibold">{ticket?.serial}</div>
                    <div className="text-sm text-gray-600">{event?.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {ticketType?.name} · prix original {ticketType?.price?.toLocaleString('fr-FR')} XAF
                    </div>
                </div>

                <label className="block">
                    <span className="text-sm text-gray-700">Votre prix de revente (XAF)</span>
                    <input
                        type="number"
                        value={askingPrice}
                        onChange={(e) => setAskingPrice(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-lg font-semibold mt-2"
                    />
                </label>

                {maxSuggested && (
                    <div className="text-xs text-gray-500">
                        La limite dépend de l'événement — jusqu'à environ {maxSuggested.toLocaleString('fr-FR')} XAF pour ce type de billet.
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs">
                    <strong>Comment ça marche :</strong> une commission SBC est prélevée sur le prix de revente. Une fois vendu, votre ancien billet est invalidé et un nouveau QR est généré pour l'acheteur. Vous pouvez annuler l'annonce à tout moment tant que le billet n'a pas été acheté.
                </div>

                {error && <div className="text-red-600 text-sm">{error}</div>}

                <button onClick={submit} disabled={submitting} className="w-full bg-[#115CF6] text-white font-semibold py-3 rounded-xl">
                    {submitting ? '...' : 'Mettre en revente'}
                </button>
            </div>
        </div>
    );
}
