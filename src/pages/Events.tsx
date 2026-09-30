import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, FilterHorizontalIcon, Cancel01Icon, FireIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { markEventsSeen } from '../components/events/NewEventPopup';
import { xaf } from '../lib/eventStatus';
import { cn } from '../lib/utils';

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
    /** Optional popularity signal from the server (event.totals.ticketsSold). */
    ticketsSold?: number;
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

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function Events() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [category, setCategory] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [showPast, setShowPast] = useState(false);
    const [items, setItems] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeFilterCount = [country, city, category, dateFrom, dateTo, priceMin, priceMax].filter(Boolean).length;

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await sbcApiService.listPublicEvents({
                q: q.trim() || undefined,
                country: country || undefined,
                city: city.trim() || undefined,
                category: category || undefined,
                dateFrom: dateFrom || undefined,
                dateTo: dateTo || undefined,
                priceMin: priceMin ? Number(priceMin) : undefined,
                priceMax: priceMax ? Number(priceMax) : undefined,
                includePast: showPast ? true : undefined,
                limit: 30,
            });
            if (res.apiReportedSuccess && res.body?.data?.items) {
                const list: EventListItem[] = res.body.data.items;
                setItems(list);
                if (!showPast && list.length > 0) {
                    const newest = [...list].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0];
                    markEventsSeen(newest._id);
                }
            } else setError(res.message || 'Impossible de charger les événements.');
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setLoading(false); }
    };

    // Filters apply immediately; the search box waits 400ms after typing stops.
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [country, city, category, dateFrom, dateTo, priceMin, priceMax, showPast]);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(load, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
        /* eslint-disable-next-line react-hooks/exhaustive-deps */
    }, [q]);

    const resetFilters = () => {
        setCountry(''); setCity(''); setCategory('');
        setDateFrom(''); setDateTo(''); setPriceMin(''); setPriceMax('');
    };

    /**
     * Sections of §3. "Populaires" only appears when the server sends a sales
     * signal and something actually sold — an empty or invented ranking would be
     * worse than no section at all.
     */
    const sections = useMemo(() => {
        if (showPast) return [{ key: 'past', title: `${items.length} événement${items.length > 1 ? 's' : ''} passé${items.length > 1 ? 's' : ''}`, items }];
        const soon = items.filter((e) => new Date(e.startsAt).getTime() - Date.now() < WEEK_MS);
        const popular = [...items].filter((e) => (e.ticketsSold ?? 0) > 0).sort((a, b) => (b.ticketsSold ?? 0) - (a.ticketsSold ?? 0)).slice(0, 3);
        const out: { key: string; title: string; hot?: boolean; items: EventListItem[] }[] = [];
        if (popular.length >= 2) out.push({ key: 'popular', title: 'Populaires', hot: true, items: popular });
        if (soon.length > 0) out.push({ key: 'soon', title: 'Cette semaine', items: soon });
        const rest = items.filter((e) => !soon.includes(e));
        out.push({ key: 'upcoming', title: out.length ? 'Tous les événements à venir' : 'À venir', items: rest.length ? rest : items });
        return out;
    }, [items, showPast]);

    const inputClass = 'w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary';

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Événements</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-3">
                <label className="relative block">
                    <span className="sr-only">Rechercher un événement</span>
                    <HugeiconsIcon icon={Search01Icon} size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Rechercher un événement…"
                        className="w-full rounded-card border border-border bg-surface py-3 pl-10 pr-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
                    />
                </label>

                <div className="flex gap-2">
                    <div role="tablist" aria-label="Période" className="flex flex-1 gap-1 bg-surface-2 rounded-pill p-1">
                        {([[false, 'À venir'], [true, 'Passés']] as const).map(([val, label]) => (
                            <button
                                key={label}
                                role="tab"
                                aria-selected={showPast === val}
                                onClick={() => setShowPast(val)}
                                className={cn('flex-1 rounded-pill py-2 text-sm font-medium', showPast === val ? 'bg-surface text-ink' : 'text-ink-2')}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowFilters((v) => !v)}
                        aria-expanded={showFilters}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-pill border px-3 text-sm font-semibold',
                            activeFilterCount ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink',
                        )}
                    >
                        <HugeiconsIcon icon={FilterHorizontalIcon} size={16} />
                        Filtres{activeFilterCount ? ` (${activeFilterCount})` : ''}
                    </button>
                </div>

                {showFilters && (
                    <section className="bg-surface border border-border rounded-card p-3 flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <select value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} aria-label="Pays">
                                <option value="">Tous les pays</option>
                                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                            </select>
                            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className={inputClass} aria-label="Ville" />
                        </div>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} aria-label="Catégorie">
                            <option value="">Toutes catégories</option>
                            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] text-ink-2">
                                À partir du
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={cn(inputClass, 'mt-1')} />
                            </label>
                            <label className="text-[11px] text-ink-2">
                                Jusqu'au
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={cn(inputClass, 'mt-1')} />
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] text-ink-2">
                                Prix min (XAF)
                                <input type="number" inputMode="numeric" min={0} value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0" className={cn(inputClass, 'mt-1')} />
                            </label>
                            <label className="text-[11px] text-ink-2">
                                Prix max (XAF)
                                <input type="number" inputMode="numeric" min={0} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="—" className={cn(inputClass, 'mt-1')} />
                            </label>
                        </div>
                        {activeFilterCount > 0 && (
                            <button onClick={resetFilters} className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-surface-2 py-2 text-sm font-medium text-ink-2">
                                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                Effacer les filtres
                            </button>
                        )}
                    </section>
                )}

                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => navigate('/events/mes-billets')} className="rounded-xl border border-primary py-2 text-sm font-semibold text-primary">Mes billets</button>
                    <button onClick={() => navigate('/events/revente')} className="rounded-xl border border-border bg-surface py-2 text-sm font-semibold text-ink">Revente</button>
                    <button onClick={() => navigate('/events/organizer')} className="rounded-xl border border-border bg-surface py-2 text-sm font-semibold text-ink">Organiser</button>
                </div>

                {error && <p className="bg-surface border border-border rounded-card p-4 text-sm text-danger">{error}</p>}

                {loading ? (
                    <div className="flex flex-col gap-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="h-56" rounded="rounded-card" />)}
                    </div>
                ) : items.length === 0 ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <p className="text-sm font-semibold text-ink">
                            {showPast ? 'Aucun événement passé' : activeFilterCount || q ? 'Aucun événement ne correspond' : 'Aucun événement pour le moment'}
                        </p>
                        <p className="text-xs text-ink-2">
                            {activeFilterCount || q ? 'Essayez d’élargir votre recherche.' : 'Les prochains événements SBC apparaîtront ici.'}
                        </p>
                        {(activeFilterCount > 0 || q) && (
                            <button onClick={() => { resetFilters(); setQ(''); }} className="mt-2 text-sm font-semibold text-primary">Effacer la recherche</button>
                        )}
                    </div>
                ) : (
                    sections.map((section) => (
                        <section key={section.key} className="flex flex-col gap-2">
                            <h2 className="text-sm font-bold text-ink flex items-center gap-1.5">
                                {'hot' in section && section.hot && <HugeiconsIcon icon={FireIcon} size={15} className="text-accent" />}
                                {section.title}
                            </h2>
                            {section.items.map((ev, i) => {
                                const isPast = new Date(ev.endsAt).getTime() < Date.now();
                                return (
                                    <motion.button
                                        key={`${section.key}-${ev._id}`}
                                        type="button"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(i * 0.03, 0.2) }}
                                        onClick={() => navigate(`/events/${encodeURIComponent(ev.slug)}`)}
                                        className={cn('text-left bg-surface border border-border rounded-card overflow-hidden', isPast && 'opacity-70')}
                                    >
                                        {ev.posterFileId && (
                                            <span className="relative block">
                                                <img
                                                    src={posterUrl(ev.posterFileId)}
                                                    alt=""
                                                    aria-hidden
                                                    loading="lazy"
                                                    className={cn('w-full h-40 object-cover', isPast && 'grayscale')}
                                                />
                                                {isPast && (
                                                    <span className="absolute top-2 left-2 rounded-pill bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                                        Passé
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                        <span className="block p-4">
                                            <span className="block text-[11px] uppercase tracking-wide text-ink-3">{ev.category || 'Événement'}</span>
                                            <span className="block text-base font-semibold text-ink mt-0.5">{ev.title}</span>
                                            <span className="block text-sm text-ink-2 mt-1">{formatDate(ev.startsAt)} · {ev.venue}</span>
                                            {(ev.city || ev.country) && (
                                                <span className="block text-xs text-ink-3">
                                                    {ev.city}{ev.country && ev.city ? ', ' : ''}{ev.country}
                                                </span>
                                            )}
                                            {!isPast && (
                                                <span className="mt-2 block text-sm font-semibold text-primary">
                                                    {typeof ev.priceFrom === 'number' ? `à partir de ${xaf(ev.priceFrom)}` : 'Voir les prix'}
                                                </span>
                                            )}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
