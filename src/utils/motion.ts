// Shared motion variants so every page/component animates the same way.
// Matches the entrance pattern the rest of the app already uses inline (fade +
// short slide, spring/easeOut, index-staggered lists). Import these instead of
// re-typing initial/animate/transition objects on each screen.
//
// Usage:
//   import { pageFade, listContainer, listItem, headerDrop } from '../utils/motion';
//   <motion.div variants={pageFade} initial="hidden" animate="show"> ... </motion.div>
//   <motion.ul variants={listContainer} initial="hidden" animate="show">
//     {items.map(x => <motion.li key={x.id} variants={listItem}> ... </motion.li>)}
//   </motion.ul>
//
// motion honours the user's prefers-reduced-motion when the app is
// wrapped in <MotionConfig reducedMotion="user"> (see main.tsx / App), so these
// variants degrade to opacity-only for users who ask for less motion.

import type { Variants, Transition } from 'motion/react';

const spring: Transition = { type: 'spring', stiffness: 260, damping: 26 };
const easeOut: Transition = { duration: 0.35, ease: 'easeOut' };

// Whole-screen entrance: gentle fade + upward drift.
export const pageFade: Variants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: easeOut },
};

// Header / hero band dropping in from the top.
export const headerDrop: Variants = {
    hidden: { opacity: 0, y: -24 },
    show: { opacity: 1, y: 0, transition: { ...spring, duration: 0.5 } },
};

// Card / section rising in from below.
export const sectionRise: Variants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: spring },
};

// Parent that staggers its children on mount.
export const listContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.05 },
    },
};

// Row / grid cell revealed by listContainer.
export const listItem: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: spring },
};

// Horizontal row (e.g. stories bar) sliding in from the left.
export const rowItem: Variants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: spring },
};
