import { useRef, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { SWIPE_DISTANCE, swipeOutcome } from '../../utils/swipe';

/**
 * Swipe a card left or right to remove it. A red layer with a bin shows
 * through as it moves; a short drag springs back. Vertical scrolling is left
 * to the page (touch-pan-y), and a drag never counts as a tap.
 */
export function SwipeToDismiss({ onDismiss, children }: { onDismiss: () => void; children: ReactNode }) {
  const x = useMotionValue(0);
  const reduce = useReducedMotion();
  const dragged = useRef(false);
  const layer = useTransform(x, [-SWIPE_DISTANCE, -20, 0, 20, SWIPE_DISTANCE], [1, 0.4, 0, 0.4, 1]);
  const binScale = useTransform(x, [-SWIPE_DISTANCE, 0, SWIPE_DISTANCE], [1.15, 0.8, 1.15]);

  return (
    <div className="relative">
      <motion.div
        aria-hidden
        style={{ opacity: layer }}
        className="absolute inset-0 rounded-card bg-danger text-white flex items-center justify-between px-5"
      >
        <motion.span style={{ scale: binScale }}><HugeiconsIcon icon={Delete02Icon} size={20} /></motion.span>
        <motion.span style={{ scale: binScale }}><HugeiconsIcon icon={Delete02Icon} size={20} /></motion.span>
      </motion.div>
      <motion.div
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDragStart={() => { dragged.current = true; }}
        onDragEnd={(_, info) => {
          const side = swipeOutcome(info.offset.x, info.velocity.x);
          if (side !== 0) {
            void animate(x, side * window.innerWidth, { duration: reduce ? 0 : 0.18 }).then(onDismiss);
          }
          // Let the click that ends a drag through the capture below first.
          window.setTimeout(() => { dragged.current = false; }, 0);
        }}
        onClickCapture={(e) => {
          if (dragged.current) { e.stopPropagation(); e.preventDefault(); }
        }}
        className="relative touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
