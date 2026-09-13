import { type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

export type SwipeDirection = 'left' | 'right';

/**
 * A deck of cards you swipe through: right accepts, left refuses.
 *
 * Only the top card is draggable — the two behind it are decoration, so the
 * gesture can never be ambiguous. A swipe past the threshold (or a flick, which
 * is why velocity counts too) flies the card out and reports the direction; the
 * parent owns the list and drops the item.
 *
 * The buttons below the deck do the same thing, deliberately: a drag gesture is
 * invisible to a keyboard and to anyone who cannot make it, so it is never the
 * only way to act.
 */
function LoveCardStack<T>({
  items,
  keyOf,
  renderCard,
  onSwipe,
  onTap,
  leftLabel,
  rightLabel,
  empty,
}: {
  items: T[];
  keyOf: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  onSwipe: (item: T, direction: SwipeDirection) => void;
  onTap?: (item: T) => void;
  leftLabel: string;
  rightLabel: string;
  empty: ReactNode;
}) {
  // x drives everything: the tilt, the two verdict stamps, and the fly-out. It
  // is animated imperatively rather than through an exit variant, because an
  // unmounting card animates with the props of its LAST render — which is the
  // render before the direction was known, so it always flew out the same way.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-14, 0, 14]);
  const opacity = useTransform(x, [-400, -250, 0, 250, 400], [0, 1, 1, 1, 0]);
  const acceptOpacity = useTransform(x, [40, 160], [0, 1]);
  const refuseOpacity = useTransform(x, [-160, -40], [1, 0]);

  if (items.length === 0) return <>{empty}</>;

  const [top, ...rest] = items;
  const behind = rest.slice(0, 2);

  const release = async (item: T, direction: SwipeDirection) => {
    await animate(x, direction === 'right' ? 600 : -600, { duration: 0.22 });
    x.set(0); // the next card takes this slot, so it must start at rest
    onSwipe(item, direction);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[62vh] min-h-80">
        {/* Back cards, furthest first, so the top one paints last. */}
        {behind.slice().reverse().map((item, i) => {
          const depth = behind.length - i; // 2 for the furthest, 1 for the next
          return (
            <div
              key={keyOf(item)}
              aria-hidden
              className="absolute inset-0 rounded-card overflow-hidden border border-border bg-surface"
              style={{ transform: `scale(${1 - depth * 0.04}) translateY(${depth * -10}px)`, opacity: 1 - depth * 0.25 }}
            >
              {renderCard(item)}
            </div>
          );
        })}

        <motion.div
          key={keyOf(top)}
          drag="x"
          style={{ x, rotate, opacity }}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={(_, info) => {
            // Distance OR flick: a fast short swipe is still a decision.
            const decisive = Math.abs(info.offset.x) > 120 || Math.abs(info.velocity.x) > 600;
            if (decisive) release(top, info.offset.x > 0 ? 'right' : 'left');
            else animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
          }}
          onClick={() => {
            // A drag ends with a click event too; ignore it unless the card is
            // back at rest, otherwise every swipe would also open the modal.
            if (onTap && Math.abs(x.get()) < 6) onTap(top);
          }}
          className="absolute inset-0 rounded-card overflow-hidden border border-border bg-surface cursor-grab active:cursor-grabbing"
        >
          {renderCard(top)}

          <motion.span
            style={{ opacity: acceptOpacity }}
            className="absolute top-5 left-5 border-2 border-success text-success font-extrabold tracking-wide px-3 py-1 rounded-tile rotate-[-12deg] bg-surface/80"
          >
            {rightLabel}
          </motion.span>
          <motion.span
            style={{ opacity: refuseOpacity }}
            className="absolute top-5 right-5 border-2 border-danger text-danger font-extrabold tracking-wide px-3 py-1 rounded-tile rotate-[12deg] bg-surface/80"
          >
            {leftLabel}
          </motion.span>
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => release(top, 'left')}
          className="size-14 grid place-items-center rounded-pill border border-border bg-surface text-danger text-2xl"
          aria-label={leftLabel}
        >
          ✕
        </button>
        {onTap && (
          <button
            onClick={() => onTap(top)}
            className="px-4 py-2 rounded-pill border border-border bg-surface text-sm text-ink-2"
          >
            Détails
          </button>
        )}
        <button
          onClick={() => release(top, 'right')}
          className="size-14 grid place-items-center rounded-pill bg-danger text-white text-2xl"
          aria-label={rightLabel}
        >
          ♥
        </button>
      </div>

      <p className="text-center text-xs text-ink-3">
        Glissez à droite pour {rightLabel.toLowerCase()}, à gauche pour {leftLabel.toLowerCase()}.
      </p>
    </div>
  );
}

export default LoveCardStack;
