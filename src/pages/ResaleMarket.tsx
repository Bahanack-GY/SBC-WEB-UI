import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';

interface ListingRow {
    _id: string;
    askingPrice: number;
    originalPrice: number;
    event?: { _id: string; title: string; startsAt: string; venue: string; city: string; posterFileId?: string };
    ticketType?: { name: string };
}

const posterUrl = (fileId?: string) => fileId ? sbcApiService.generateThumbnailUrl(fileId, 512) : '';
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function ResaleMarket() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [items, setItems] = useState<ListingRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [buyingId, setBuyingId] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await sbcApiService.listPublicResale({ limit: 30 });
                if (res.apiReportedSuccess) setItems(res.body?.data?.items || []);
                else setError(res.message || 'Erreur');
            } catch (e: any) { setError(e?.message || 'Erreur réseau'); }
            finally { setLoading(false); }
        })();
    }, []);

    const buy = async (listing: ListingRow) => {
        if (!user) { setError('Connectez-vous pour acheter.'); return; }
        setBuyingId(listing._id); setError(null);
        try {
            const res = await sbcApiService.buyResaleListing(listing._id, {
                firstName: user.name?.split(' ')[0] || 'Client',
                lastName: user.name?.split(' ').slice(1).join(' ') || 'SBC',
                phone: user.phoneNumber || '',
                email: user.email,
            });
            if (!res.apiReportedSuccess || !res.body?.data?.paymentSessionId) {
                setError(res.message || 'Impossible de démarrer le paiement.');
                setBuyingId(null);
                return;
            }
            window.location.href = sbcApiService.generatePaymentUrl(res.body.data.paymentSessionId);
        } catch (e: any) { setError(e?.message || 'Erreur réseau'); setBuyingId(null); }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Billets en revente</h1>
            </div>
            <div className="p-4 space-y-3">
                {loading && <div className="text-center text-gray-500 py-8">Chargement...</div>}
                {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
                {!loading && items.length === 0 && (
                    <div className="text-center text-gray-500 py-8">Aucun billet en revente pour l'instant.</div>
                )}
                {items.map((l) => (
                    <div key={l._id} className="border border-gray-200 rounded-2xl overflow-hidden">
                        {l.event?.posterFileId && (
                            <img src={posterUrl(l.event.posterFileId)} alt={l.event?.title} className="w-full h-40 object-cover" />
                        )}
                        <div className="p-4">
                            <div className="font-semibold">{l.event?.title || '—'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{l.event?.startsAt && fmt(l.event.startsAt)}</div>
                            <div className="text-xs text-gray-500">{l.event?.venue} · {l.event?.city}</div>
                            <div className="mt-2 text-xs text-gray-500">{l.ticketType?.name || 'Billet'}</div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <div className="text-lg font-bold text-[#115CF6]">{l.askingPrice.toLocaleString('fr-FR')} XAF</div>
                                {l.originalPrice !== l.askingPrice && (
                                    <div className="text-xs text-gray-400 line-through">{l.originalPrice.toLocaleString('fr-FR')} XAF</div>
                                )}
                            </div>
                            <button
                                onClick={() => buy(l)}
                                disabled={buyingId === l._id}
                                className="mt-3 w-full bg-[#115CF6] text-white font-semibold py-2 rounded-xl disabled:bg-gray-300"
                            >
                                {buyingId === l._id ? '...' : 'Acheter ce billet'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
