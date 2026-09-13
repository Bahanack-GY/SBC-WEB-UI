import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import { markEventsSeen } from '../components/events/NewEventPopup';

interface EventListItem {
    _id: string;
    slug: string;
    title: string;
    posterFileId?: string;
    city: string;
    venue: string;
    startsAt: string;
    priceFrom?: number | null;
    category?: string;
}

const posterUrl = (fileId?: string) => fileId ? sbcApiService.generateThumbnailUrl(fileId, 512) : '';

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return iso;
    }
};

export default function Events() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [city, setCity] = useState('');
    const [items, setItems] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async (opts: { q?: string; city?: string } = {}) => {
        setLoading(true);
        setError(null);
        try {
            const res = await sbcApiService.listPublicEvents({
                q: opts.q?.trim() || undefined,
                city: opts.city?.trim() || undefined,
                limit: 30,
            });
            if (res.apiReportedSuccess && res.body?.data?.items) {
                const list: EventListItem[] = res.body.data.items;
                setItems(list);
                // Bump the "seen" marker to the newest event id so the Home
                // popup stops nagging about it.
                if (list.length > 0) {
                    const newest = [...list].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0];
                    markEventsSeen(newest._id);
                }
            } else setError(res.message || 'Impossible de charger les événements.');
        } catch (e: any) {
            setError(e?.message || 'Erreur réseau.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const grouped = useMemo(() => {
        const now = Date.now();
        return {
            upcoming: items.filter((e) => new Date(e.startsAt).getTime() >= now).slice(0, 20),
        };
    }, [items]);

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Événements</h1>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex gap-2">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') load({ q, city }); }}
                        placeholder="Rechercher un événement..."
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
                    />
                    <button
                        onClick={() => load({ q, city })}
                        className="bg-[#115CF6] text-white font-medium px-5 rounded-xl"
                    >
                        Chercher
                    </button>
                </div>

                <div className="flex gap-2">
                    <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ville (optionnel)"
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
                    />
                    <button
                        onClick={() => navigate('/events/mes-billets')}
                        className="border border-[#115CF6] text-[#115CF6] font-medium px-4 rounded-xl text-sm"
                    >
                        Mes billets
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => navigate('/events/revente')}
                        className="bg-gray-100 text-gray-800 font-medium py-3 rounded-xl"
                    >
                        Marketplace revente
                    </button>
                    <button
                        onClick={() => navigate('/events/organizer')}
                        className="bg-gray-100 text-gray-800 font-medium py-3 rounded-xl"
                    >
                        Espace organisateur
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
                )}

                {loading ? (
                    <div className="text-center text-gray-500 py-8">Chargement...</div>
                ) : grouped.upcoming.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Aucun événement à venir pour le moment.</div>
                ) : (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-800">À venir</h2>
                        {grouped.upcoming.map((ev, i) => (
                            <motion.div
                                key={ev._id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => navigate(`/events/${encodeURIComponent(ev.slug)}`)}
                                className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm cursor-pointer active:opacity-70"
                            >
                                {ev.posterFileId && (
                                    <img src={posterUrl(ev.posterFileId)} alt={ev.title} className="w-full h-40 object-cover" loading="lazy" />
                                )}
                                <div className="p-4">
                                    <div className="text-xs text-gray-500 uppercase">{ev.category || 'Événement'}</div>
                                    <div className="text-base font-semibold text-gray-900 mt-1">{ev.title}</div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {formatDate(ev.startsAt)} · {ev.venue}
                                    </div>
                                    <div className="mt-2 text-sm text-[#115CF6] font-medium">
                                        {ev.priceFrom !== undefined && ev.priceFrom !== null
                                            ? `à partir de ${ev.priceFrom.toLocaleString('fr-FR')} XAF`
                                            : 'Voir les prix'}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
