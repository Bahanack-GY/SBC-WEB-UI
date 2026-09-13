import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function MyTicketScreen() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        (async () => {
            try {
                const res = await sbcApiService.getMyTicket(id);
                if (res.apiReportedSuccess) setData(res.body?.data);
                else setError(res.message || 'Introuvable');
            } catch (e: any) { setError(e?.message || 'Erreur'); }
            finally { setLoading(false); }
        })();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
    if (error || !data) return <div className="p-8 text-center text-red-600">{error || 'Introuvable'}</div>;

    const { ticket, event, ticketType, qrImageDataUrl, activeResaleListing } = data;
    const canResell = ticket.status === 'ISSUED' && event?.resaleEnabled && !activeResaleListing;
    const isListed = Boolean(activeResaleListing);

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Mon billet</h1>
            </div>
            <div className="p-4 space-y-4">
                <div className="border-2 border-dashed border-[#115CF6] rounded-2xl p-6 text-center bg-blue-50/40">
                    <div className="text-xs uppercase text-gray-500">Billet</div>
                    <div className="text-lg font-bold text-gray-900">{ticket.serial}</div>
                    <div className="text-sm text-gray-600 mt-2">{ticket.holderName}</div>
                    {qrImageDataUrl ? (
                        <img src={qrImageDataUrl} alt="QR Code" className="mx-auto mt-4 w-56 h-56 rounded-xl bg-white p-2 border" />
                    ) : (
                        <div className="mt-4 text-sm text-red-600">
                            Ce billet n'est plus valide ({ticket.status}).
                        </div>
                    )}
                    <div className="mt-3 text-xs text-gray-500">Statut : <span className="font-semibold">{ticket.status}</span></div>
                </div>

                <div className="border border-gray-200 rounded-2xl p-4 space-y-1">
                    <div className="font-semibold text-gray-900">{event?.title}</div>
                    <div className="text-sm text-gray-600">{event?.startsAt && fmt(event.startsAt)}</div>
                    <div className="text-sm text-gray-600">{event?.venue}</div>
                    <div className="text-xs text-gray-500">{event?.address}</div>
                    <div className="text-xs text-gray-500 mt-2">Type : {ticketType?.name}</div>
                </div>

                {isListed && (
                    <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 text-sm">
                        <div className="font-semibold text-amber-900">Ce billet est en revente</div>
                        <div className="text-xs text-amber-800 mt-1">
                            Prix demandé : {activeResaleListing.askingPrice?.toLocaleString('fr-FR')} XAF
                        </div>
                        <button
                            onClick={async () => {
                                if (!activeResaleListing?._id) return;
                                await sbcApiService.cancelMyResaleListing(activeResaleListing._id);
                                window.location.reload();
                            }}
                            className="mt-3 text-xs bg-white border border-amber-300 text-amber-800 font-medium px-3 py-1.5 rounded-lg"
                        >
                            Retirer l'annonce
                        </button>
                    </div>
                )}

                {canResell && (
                    <button
                        onClick={() => navigate(`/events/mes-billets/${ticket._id}/revendre`)}
                        className="w-full border border-[#115CF6] text-[#115CF6] font-semibold py-3 rounded-xl"
                    >
                        Revendre mon billet
                    </button>
                )}
            </div>
        </div>
    );
}
