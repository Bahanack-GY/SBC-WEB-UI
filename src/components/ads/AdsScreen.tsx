import React from 'react';
import { motion } from 'framer-motion';
import BackButton from '../common/BackButton';

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
        <div
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
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-5 pb-28">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
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
