import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

interface TicketType {
    _id: string;
    name: string;
    description?: string;
    price: number;
    available: number;
    maxPerOrder: number;
}

interface EventDoc {
    _id: string;
    slug: string;
    title: string;
    description: string;
    posterFileId?: string;
    videoFileId?: string;
    city: string;
    venue: string;
    address: string;
    startsAt: string;
    endsAt: string;
    resaleEnabled: boolean;
    shareUrls?: { link?: string; whatsapp?: string; facebook?: string };
}

const posterUrl = (fileId?: string) => fileId ? sbcApiService.generateThumbnailUrl(fileId, 800) : '';
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function EventDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [event, setEvent] = useState<EventDoc | null>(null);
    const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!slug) return;
        (async () => {
            try {
                const res = await sbcApiService.getPublicEventBySlug(slug);
                if (res.apiReportedSuccess && res.body?.data) {
                    setEvent(res.body?.data.event);
                    setTicketTypes(res.body?.data.ticketTypes);
                } else {
                    setError(res.message || 'Introuvable');
                }
            } catch (e: any) {
                setError(e?.message || 'Erreur');
            } finally { setLoading(false); }
        })();
    }, [slug]);

    const share = async () => {
        const url = event?.shareUrls?.link || window.location.href;
        const text = `Découvrez ${event?.title} sur SBC`;
        try {
            if (navigator.share) await navigator.share({ title: event?.title, text, url });
            else await navigator.clipboard.writeText(url);
        } catch { /* user cancelled */ }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;
    if (error || !event) return <div className="p-8 text-center text-red-600">{error || 'Introuvable'}</div>;

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold truncate">{event.title}</h1>
            </div>
            {event.posterFileId && (
                <img src={posterUrl(event.posterFileId)} alt={event.title} className="w-full h-56 object-cover" />
            )}
            {event.videoFileId && (
                <video
                    src={sbcApiService.generateSettingsFileUrl(event.videoFileId)}
                    poster={event.posterFileId ? posterUrl(event.posterFileId) : undefined}
                    className="w-full max-h-96 bg-black"
                    controls
                    playsInline
                    preload="metadata"
                />
            )}
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-xl font-bold">{event.title}</h1>
                    <div className="text-sm text-gray-600 mt-1">{fmt(event.startsAt)} — {fmt(event.endsAt)}</div>
                    <div className="text-sm text-gray-600">{event.venue} · {event.city}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{event.address}</div>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{event.description}</p>

                <div className="border-t pt-4">
                    <h2 className="text-base font-semibold mb-2">Billets</h2>
                    {ticketTypes.length === 0 ? (
                        <div className="text-sm text-gray-500">Aucun billet en vente pour l'instant.</div>
                    ) : (
                        <div className="space-y-2">
                            {ticketTypes.map((tt) => (
                                <div key={tt._id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium">{tt.name}</div>
                                        {tt.description && <div className="text-xs text-gray-500">{tt.description}</div>}
                                        <div className="text-xs text-gray-500 mt-1">
                                            {tt.available > 0 ? `${tt.available} disponible(s)` : 'Épuisé'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[#115CF6] font-semibold">{tt.price.toLocaleString('fr-FR')} XAF</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        onClick={() => navigate(`/events/${encodeURIComponent(event.slug)}/checkout`, { state: { event, ticketTypes } })}
                        disabled={ticketTypes.every(t => t.available <= 0)}
                        className="bg-[#115CF6] text-white font-semibold py-3 rounded-xl disabled:bg-gray-300"
                    >
                        Acheter un billet
                    </button>
                    <button onClick={share} className="border border-[#115CF6] text-[#115CF6] font-semibold py-3 rounded-xl">
                        Partager
                    </button>
                </div>
            </div>
        </div>
    );
}
