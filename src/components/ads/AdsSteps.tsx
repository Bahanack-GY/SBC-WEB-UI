import React from 'react';
import { motion } from 'motion/react';
import { adsItemMotion } from './AdsScreen';

/**
 * Onboarding building blocks.
 *
 * These screens were walls of numbered prose. Nobody reads a wall, and the rules
 * inside them are the ones that cost a diffuseur their earnings when missed — so
 * they are broken into one idea per card, each with its own visual anchor.
 */

export const AdsHero: React.FC<{ src: string; alt: string }> = ({ src, alt }) => (
    <motion.img
        src={src}
        alt={alt}
        // Decorative: the heading beside it already carries the meaning, and a
        // screen reader announcing "illustration of a person holding a phone"
        // adds nothing.
        aria-hidden="true"
        width={512}
        height={512}
        className="w-full max-w-[260px] mx-auto"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
    />
);

export const AdsStep: React.FC<{
    index: number;
    title: string;
    children: React.ReactNode;
    accent?: 'blue' | 'green';
}> = ({ index, title, children, accent = 'blue' }) => (
    <motion.div
        {...adsItemMotion(index - 1, 0.2)}
        className="flex gap-3 bg-white border border-border rounded-2xl p-4"
    >
        <span
            className={`shrink-0 w-8 h-8 rounded-full grid place-items-center text-sm font-bold text-white ${accent === 'green' ? 'bg-green-600' : 'bg-primary'
                }`}
        >
            {index}
        </span>
        <div className="min-w-0">
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-600 mt-1">{children}</p>
        </div>
    </motion.div>
);

/** For the one rule per screen that costs real money when ignored. */
export const AdsWarning: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-amber-50 border border-accent rounded-2xl p-4 text-sm text-amber-900">
        {children}
    </div>
);
