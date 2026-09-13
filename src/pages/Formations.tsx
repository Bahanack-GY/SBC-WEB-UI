import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    Search01Icon,
    Cancel01Icon,
    BookOpen01Icon,
    ArrowUpRight01Icon,
    LockIcon,
    Megaphone01Icon,
    ChartIncreaseIcon,
    Mic01Icon,
    BotIcon,
    Globe02Icon,
    AiMagicIcon,
    Coins01Icon,
    ShoppingBag01Icon,
    AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import ProtectedRoute from '../components/common/ProtectedRoute';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { useFormations, type Formation } from '../hooks/useFormations';
import { cn } from '../lib/utils';

type Icon = typeof BookOpen01Icon;

/**
 * Formations carry no category or icon field — only a title — so the tile is
 * picked from the title. First match wins; anything unrecognised gets a book.
 * ponytail: keyword map. Add a `category` to the formation schema if admins
 * ever need to choose the icon themselves.
 */
const ICON_RULES: { test: RegExp; icon: Icon; tint: string }[] = [
    { test: /market/i, icon: Megaphone01Icon, tint: 'bg-primary-soft text-primary' },
    { test: /trad|indice|bourse|forex/i, icon: ChartIncreaseIcon, tint: 'bg-success-soft text-success' },
    { test: /orat|parole|discours/i, icon: Mic01Icon, tint: 'bg-accent-soft text-accent' },
    { test: /bot|whatsapp/i, icon: BotIcon, tint: 'bg-success-soft text-success' },
    // Whole word: "Machine à Cash" contains "chine" and was getting the China globe.
    { test: /\bchine\b|import/i, icon: Globe02Icon, tint: 'bg-danger-soft text-danger' },
    { test: /\bia\b|intelligence|creator/i, icon: AiMagicIcon, tint: 'bg-primary-soft text-primary' },
    { test: /cash|argent|revenu/i, icon: Coins01Icon, tint: 'bg-accent-soft text-accent' },
    { test: /revente|digit|produit/i, icon: ShoppingBag01Icon, tint: 'bg-primary-soft text-primary' },
];
const iconFor = (title: string) =>
    ICON_RULES.find((r) => r.test.test(title)) ?? { icon: BookOpen01Icon, tint: 'bg-surface-2 text-ink-2' };

/** Where the link goes, so members know a tap leaves the app. */
const sourceOf = (link: string) => {
    if (/t\.me|telegram/i.test(link)) return 'Groupe Telegram';
    if (/youtu/i.test(link)) return 'Vidéos YouTube';
    if (/wa\.me|whatsapp/i.test(link)) return 'Groupe WhatsApp';
    return 'Lien externe';
};

const PACK_NAME: Record<string, string> = { CLASSIQUE: 'Pack Classique', CIBLE: 'Pack Ciblé' };

// Admin-set titles mix casing ("Art Oratoire", "REVENTE PRODUITS DIGITAUX").
// All-caps titles are softened to sentence case; the rest are left as typed.
// Acronyms keep their capitals, or "AVEC IA" would read "avec ia".
const ACRONYMS = /\b(ia|sbc|pdf|tiktok)\b/gi;
const displayTitle = (title: string) =>
    title === title.toUpperCase() && /[A-ZÀ-Ý]{3}/.test(title)
        ? (title.charAt(0) + title.slice(1).toLowerCase()).replace(ACRONYMS, (w) => (w.toLowerCase() === 'tiktok' ? 'TikTok' : w.toUpperCase()))
        : title;

// Accent-insensitive search: "creation" must find "CRÉATION".
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function DecorationBadge({ decoration }: { decoration?: string }) {
    if (decoration === 'new') {
        return <span className="shrink-0 rounded-pill bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">Nouveau</span>;
    }
    if (decoration === 'orange' || decoration === 'gold') {
        return (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-pill bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                <span className="size-1.5 rounded-pill bg-accent" aria-hidden />
                À la une
            </span>
        );
    }
    return null;
}

function FormationRow({ formation, index }: { formation: Formation; index: number }) {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const { icon, tint } = iconFor(formation.title);
    const locked = !!formation.locked;
    const featured = formation.decoration === 'orange' || formation.decoration === 'gold';
    const title = displayTitle(formation.title);

    const body = (
        <>
            <span className={cn('size-11 shrink-0 grid place-items-center rounded-tile', locked ? 'bg-surface-2 text-ink-3' : tint)}>
                <HugeiconsIcon icon={icon} size={22} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                    <span className={cn('truncate text-sm font-semibold', locked ? 'text-ink-2' : 'text-ink')}>{title}</span>
                    <DecorationBadge decoration={formation.decoration} />
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-2">
                    {locked
                        ? `Réservée au ${PACK_NAME[formation.requiredSubscriptionType ?? 'CIBLE']} · Débloquer`
                        : sourceOf(formation.link)}
                </span>
            </span>
            <span className="size-8 shrink-0 grid place-items-center rounded-pill bg-surface-2 text-ink-2" aria-hidden>
                <HugeiconsIcon icon={locked ? LockIcon : ArrowUpRight01Icon} size={16} />
            </span>
        </>
    );

    const rowClass = cn(
        'w-full text-left bg-surface border rounded-card p-3 flex items-center gap-3 transition-colors duration-150',
        'hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        featured && !locked ? 'border-accent' : 'border-border',
    );

    return (
        <motion.li
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.035, 0.28) }}
        >
            {locked ? (
                // The server blanks the link above the member's pack, so a locked row
                // is a way to the upgrade, not a dead link.
                <button type="button" onClick={() => navigate('/abonnement')} className={rowClass}>
                    {body}
                </button>
            ) : (
                <a href={formation.link} target="_blank" rel="noopener noreferrer" className={rowClass}>
                    {body}
                    <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
                </a>
            )}
        </motion.li>
    );
}

function Formations() {
    const { data: formations = [], isLoading, error, refetch } = useFormations();
    const [query, setQuery] = useState('');

    const available = formations.filter((f) => !f.locked).length;
    const filtered = useMemo(() => {
        const q = fold(query.trim());
        return q ? formations.filter((f) => fold(f.title).includes(q)) : formations;
    }, [formations, query]);

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-bg px-4 pt-3 pb-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <BackButton />
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-ink">Formations disponibles</h1>
                        <p className="text-xs text-ink-2">
                            {isLoading ? 'Chargement…' : `${formations.length} formation${formations.length > 1 ? 's' : ''} · Accès à vie`}
                        </p>
                    </div>
                </div>

                <label className="relative block">
                    <span className="sr-only">Rechercher une formation</span>
                    <HugeiconsIcon icon={Search01Icon} size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher une formation…"
                        className="w-full rounded-card border border-border bg-surface py-3 pl-10 pr-10 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft [&::-webkit-search-cancel-button]:hidden"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            aria-label="Effacer la recherche"
                            className="absolute right-2 top-1/2 -translate-y-1/2 size-8 grid place-items-center rounded-pill text-ink-2 hover:bg-surface-2"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} size={16} />
                        </button>
                    )}
                </label>

                <section className="rounded-card bg-primary p-4 text-white flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold leading-snug text-white text-balance">Boostez vos compétences</h2>
                        <p className="mt-1 text-sm text-white/85 text-pretty">
                            Accès illimité à toutes les formations de votre pack, à votre rythme.
                        </p>
                        <span className="mt-3 inline-flex items-center gap-2 rounded-pill bg-surface px-3 py-1.5 text-xs font-semibold text-primary">
                            <span className="size-2 rounded-pill bg-success-dot" aria-hidden />
                            {isLoading ? 'Chargement…' : `${available} formation${available > 1 ? 's' : ''} active${available > 1 ? 's' : ''}`}
                        </span>
                    </div>
                    <span className="size-14 shrink-0 grid place-items-center rounded-tile bg-white/15" aria-hidden>
                        <HugeiconsIcon icon={BookOpen01Icon} size={28} />
                    </span>
                </section>

                {isLoading ? (
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} height="h-[70px]" rounded="rounded-card" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-surface border border-border rounded-card p-5 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                        <p className="text-sm font-semibold text-ink">Impossible d'afficher les formations</p>
                        <button onClick={() => refetch()} className="mt-1 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                            Réessayer
                        </button>
                    </div>
                ) : formations.length === 0 ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={BookOpen01Icon} size={30} className="text-ink-3" />
                        <p className="text-sm font-semibold text-ink">Aucune formation pour le moment</p>
                        <p className="text-xs text-ink-2">Les nouvelles formations apparaîtront ici dès leur publication.</p>
                    </div>
                ) : (
                    <section className="flex flex-col gap-2" aria-label="Liste des formations">
                        <div className="flex items-center justify-between px-1">
                            <p className="text-xs text-ink-2" aria-live="polite">
                                {filtered.length} formation{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
                            </p>
                            <p className="text-xs font-semibold text-ink-3">SBC Academy</p>
                        </div>

                        {filtered.length === 0 ? (
                            <div className="bg-surface border border-border rounded-card p-5 text-center flex flex-col items-center gap-2">
                                <p className="text-sm text-ink">Aucune formation ne correspond à « {query.trim()} ».</p>
                                <button onClick={() => setQuery('')} className="text-sm font-semibold text-primary">
                                    Effacer la recherche
                                </button>
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-2">
                                {filtered.map((f, i) => (
                                    <FormationRow key={f._id} formation={f} index={i} />
                                ))}
                            </ul>
                        )}
                    </section>
                )}
            </div>
        </ProtectedRoute>
    );
}

export default Formations;
