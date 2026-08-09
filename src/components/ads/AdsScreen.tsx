import React from 'react';
import { motion } from 'framer-motion';
import BackButton from '../common/BackButton';

/**
 * Motion shared across the Ads Network screens, matching the profile page: the
 * header springs down, then items slide in from the right one after another.
 *
 * Kept in one place so a screen added later moves like the rest instead of
 * inventing its own timing.
 */
export const adsHeaderMotion = {
    initial: { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, type: 'spring' as const },
};

/** Staggered by position, so a list arrives in order rather than all at once. */
export const adsItemMotion = (index: number, base = 0.15) => ({
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: base + index * 0.07, duration: 0.4, type: 'spring' as const },
});

/**
 * Shared chrome for the Ads Network screens.
 *
 * The header keeps its place while content loads, so arriving content settles in
 * rather than shoving the page down.
 */
export const AdsScreen: React.FC<{
    title: string;
    subtitle?: string;
    accent?: 'blue' | 'green';
    children: React.ReactNode;
}> = ({ title, subtitle, accent = 'blue', children }) => (
    <div className="min-h-screen bg-gray-50">
        <motion.div
            {...adsHeaderMotion}
            className={`px-4 pt-4 pb-6 text-white bg-gradient-to-br ${accent === 'green'
                ? 'from-green-600 to-emerald-500'
                : 'from-[#115CF6] to-blue-500'
                }`}
        >
            <div className="max-w-2xl mx-auto">
                <div className="[&_button]:text-white [&_svg]:text-white">
                    <BackButton />
                </div>
                <h1 className="text-2xl font-bold mt-2">{title}</h1>
                {subtitle && <p className="text-white/80 text-sm mt-1">{subtitle}</p>}
            </div>
        </motion.div>

        <div className="max-w-2xl mx-auto px-4 pt-5 pb-28">
            <motion.div {...adsItemMotion(0)}>
                {children}
            </motion.div>
        </div>
    </div>
);

const Bar: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
);

/**
 * Placeholder shaped like the screen that is coming.
 *
 * A spinner says "wait" and nothing else; a skeleton tells the user what they are
 * about to get, which measurably lowers perceived wait — and it is what stops the
 * wrong screen from being painted while a role is still unknown.
 */
export const AdsCardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex gap-3">
                    <Bar className="w-16 h-16 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                        <Bar className="h-4 w-2/3" />
                        <Bar className="h-3 w-1/3" />
                        <Bar className="h-2 w-full mt-3" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export const AdsStatSkeleton: React.FC = () => (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3" aria-busy="true">
        <Bar className="h-3 w-24" />
        <Bar className="h-8 w-40" />
        <Bar className="h-3 w-56" />
    </div>
);

export default AdsScreen;

/**
 * One number, one label. Three of these read at a glance; the same three values
 * as a sentence do not get read at all.
 */
export const AdsStatCard: React.FC<{
    label: string;
    value: React.ReactNode;
    hint?: string;
    tone?: 'default' | 'green' | 'amber';
    index?: number;
}> = ({ label, value, hint, tone = 'default', index = 0 }) => {
    const tones = {
        default: 'bg-white border-gray-200 text-gray-900',
        green: 'bg-green-50 border-green-200 text-green-900',
        amber: 'bg-amber-50 border-amber-200 text-amber-900',
    } as const;

    return (
        <motion.div
            {...adsItemMotion(index)}
            className={`border rounded-2xl p-3 text-center shadow-sm ${tones[tone]}`}
        >
            <p className="text-xl font-bold leading-tight">{value}</p>
            <p className="text-[11px] opacity-70 leading-tight mt-0.5">{label}</p>
            {hint && <p className="text-[10px] opacity-60 mt-0.5">{hint}</p>}
        </motion.div>
    );
};

/**
 * The three campaign days as pips.
 *
 * Three states only — grey (to come), amber (posted, needs verifying), green
 * (validated). A fourth "in progress" colour was tried and dropped: it competed
 * with amber for the same meaning and left people guessing which one wanted
 * something from them.
 */
export const AdsDayPips: React.FC<{
    total: number;
    completed: number;
    awaitingDay?: number;
}> = ({ total, completed, awaitingDay }) => (
    <div className="flex items-center gap-1.5" role="list" aria-label="Progression des journées">
        {Array.from({ length: total }, (_, i) => {
            const day = i + 1;
            const done = day <= completed;
            const awaiting = day === awaitingDay;

            return (
                <span
                    key={day}
                    role="listitem"
                    aria-label={`Jour ${day} ${done ? 'validé' : awaiting ? 'à vérifier' : 'à venir'}`}
                    className={`h-1.5 flex-1 rounded-full ${done ? 'bg-green-500' : awaiting ? 'bg-amber-400' : 'bg-gray-200'
                        }`}
                />
            );
        })}
    </div>
);

/** "demain 10:08", "dans 3 jours" — a full timestamp is noise on a phone. */
export const relativeDate = (iso?: string): string => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((midnight(date) - midnight(now)) / 86_400_000);
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (days === 0) return `aujourd'hui ${time}`;
    if (days === 1) return `demain ${time}`;
    if (days < 0) return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    if (days <= 6) return `dans ${days} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};
