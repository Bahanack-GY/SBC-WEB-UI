import { useEffect, useMemo, useRef, useState } from 'react';
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
    country?: string;
    venue: string;
    startsAt: string;
    endsAt: string;
    priceFrom?: number | null;
    category?: string;
}

const posterUrl = (fileId?: string) => fileId ? sbcApiService.generateThumbnailUrl(fileId, 512) : '';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Common SBC-served countries. Free-text still allowed on the backend. */
const COUNTRIES = [
    { code: 'CM', label: 'Cameroun' },
    { code: 'CI', label: "Côte d'Ivoire" },
    { code: 'SN', label: 'Sénégal' },
    { code: 'BJ', label: 'Bénin' },
    { code: 'TG', label: 'Togo' },
    { code: 'BF', label: 'Burkina Faso' },
    { code: 'ML', label: 'Mali' },
    { code: 'GN', label: 'Guinée' },
    { code: 'CD', label: 'RD Congo' },
    { code: 'CG', label: 'Congo-Brazzaville' },
    { code: 'GA', label: 'Gabon' },
    { code: 'TD', label: 'Tchad' },
    { code: 'NE', label: 'Niger' },
];

const CATEGORIES = [
    { value: 'concert', label: 'Concert' },
    { value: 'conference', label: 'Conférence' },
    { value: 'formation', label: 'Formation' },
    { value: 'sport', label: 'Sport' },
    { value: 'festival', label: 'Festival' },
    { value: 'salon', label: 'Salon / Exposition' },
    { value: 'religieux', label: 'Religieux' },
    { value: 'autre', label: 'Autre' },
];

export default function Events() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [country, setCountry] = useState('');
    const [category, setCategory] = useState('');
    const [showPast, setShowPast] = useState(false);
    const [items, setItems] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = async (params: { q?: string; country?: string; category?: string; includePast?: boolean } = {}) => {
        setLoading(true);
        setError(null);
        try {
            const res = await sbcApiService.listPublicEvents({
                q: params.q?.trim() || undefined,
                country: params.country?.trim() || undefined,
                category: params.category?.trim() || undefined,
                includePast: params.includePast ? true : undefined,
                limit: 30,
            });
            if (res.apiReportedSuccess && res.body?.data?.items) {
                const list: EventListItem[] = res.body.data.items;
                setItems(list);
                if (!params.includePast && list.length > 0) {
                    const newest = [...list].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0];
                    markEventsSeen(newest._id);
                }
            } else setError(res.message || 'Impossible de charger les événements.');
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setLoading(false); }
    };

    // Initial + reload on filter changes (country/category/showPast are immediate).
    useEffect(() => {
        load({ q, country, category, includePast: showPast });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [country, category, showPast]);

    // Debounced search — 400ms after typing stops.
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            load({ q, country, category, includePast: showPast });
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q]);

    const grouped = useMemo(() => ({ items }), [items]);

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Événements</h1>
            </div>
            <div className="p-4 space-y-4">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="🔍 Rechercher un événement..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#115CF6]"
                />

                <div className="grid grid-cols-2 gap-2">
                    <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                        <option value="">Tous les pays</option>
                        {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                    </select>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                        <option value="">Toutes catégories</option>
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => setShowPast(false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${!showPast ? 'bg-white shadow' : 'text-gray-500'}`}
                    >
                        À venir
                    </button>
                    <button
                        onClick={() => setShowPast(true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${showPast ? 'bg-white shadow' : 'text-gray-500'}`}
                    >
                        Passés
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => navigate('/events/mes-billets')}
                        className="flex-1 border border-[#115CF6] text-[#115CF6] font-medium py-2 rounded-xl text-sm"
                    >
                        Mes billets
                    </button>
                    <button
                        onClick={() => navigate('/events/revente')}
                        className="flex-1 bg-gray-100 text-gray-800 font-medium py-2 rounded-xl text-sm"
                    >
                        Marketplace
                    </button>
                    <button
                        onClick={() => navigate('/events/organizer')}
                        className="flex-1 bg-gray-100 text-gray-800 font-medium py-2 rounded-xl text-sm"
                    >
                        Organiser
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
                )}

                {loading ? (
                    <div className="text-center text-gray-500 py-8">Chargement...</div>
                ) : grouped.items.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        {showPast ? 'Aucun événement passé.' : 'Aucun événement pour le moment.'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            {showPast ? `${grouped.items.length} événement(s) passé(s)` : 'À venir'}
                        </h2>
                        {grouped.items.map((ev, i) => {
                            const isPast = new Date(ev.endsAt).getTime() < Date.now();
                            return (
                                <motion.div
                                    key={ev._id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => navigate(`/events/${encodeURIComponent(ev.slug)}`)}
                                    className={`border rounded-2xl overflow-hidden bg-white shadow-sm cursor-pointer active:opacity-70 ${isPast ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}
                                >
                                    {ev.posterFileId && (
                                        <div className="relative">
                                            <img
                                                src={posterUrl(ev.posterFileId)}
                                                alt={ev.title}
                                                className={`w-full h-40 object-cover ${isPast ? 'grayscale' : ''}`}
                                                loading="lazy"
                                            />
                                            {isPast && (
                                                <div className="absolute top-2 left-2 bg-gray-800 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                                                    Passé
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 text-xs uppercase text-gray-500">
                                            <span>{ev.category || 'Événement'}</span>
                                            {!ev.posterFileId && isPast && (
                                                <span className="bg-gray-200 text-gray-700 font-bold tracking-wider px-2 py-0.5 rounded-full">Passé</span>
                                            )}
                                        </div>
                                        <div className="text-base font-semibold text-gray-900 mt-1">{ev.title}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {formatDate(ev.startsAt)} · {ev.venue}
                                        </div>
                                        {(ev.country || ev.city) && (
                                            <div className="text-xs text-gray-500">
                                                {ev.city}{ev.country && ev.city ? ', ' : ''}{ev.country}
                                            </div>
                                        )}
                                        {!isPast && (
                                            <div className="mt-2 text-sm text-[#115CF6] font-medium">
                                                {ev.priceFrom !== undefined && ev.priceFrom !== null
                                                    ? `à partir de ${ev.priceFrom.toLocaleString('fr-FR')} XAF`
                                                    : 'Voir les prix'}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
