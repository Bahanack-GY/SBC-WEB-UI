import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Clock01Icon, Flag02Icon } from '@hugeicons/core-free-icons';
import { CountUp } from './ui/CountUp';
import type { JourneyBuckets } from '../../utils/relance';

const EASE = [0.16, 1, 0.3, 1] as const;

// Two periods of a wave across the viewBox: sliding it by half its width loops seamlessly.
const WAVE = 'M0 6 Q12.5 0 25 6 T50 6 T75 6 T100 6 V20 H0 Z';

/** How high the water stands: never empty when someone is there, never brim-full so the wave shows. */
const waterLevel = (count: number, max: number) => (count > 0 ? 18 + 64 * (count / max) : 0);

function DayCircle({ day, count, max, live, index }: { day: number; count: number; max: number; live: boolean; index: number }) {
  const reduce = useReducedMotion();
  const level = waterLevel(count, max);
  const moving = live && count > 0 && !reduce;
  const delay = (base: number) => (reduce ? 0 : base + index * 0.06);

  return (
    <motion.li
      aria-label={`Jour ${day} : ${count} filleul${count > 1 ? 's' : ''}`}
      className="relative z-10 flex flex-col items-center gap-1.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay(0.15), type: 'spring', stiffness: 320, damping: 24 }}
    >
      <span aria-hidden className={`h-4 leading-4 text-[11px] font-semibold ${count > 0 ? 'text-primary' : 'text-ink-3'}`}>J{day}</span>

      <span className={`relative size-8 min-[360px]:size-9 rounded-pill overflow-hidden border-2 bg-surface ${count > 0 ? 'border-primary' : 'border-border'}`}>
        {/* The water rises to its level; its surface only moves while relance runs. */}
        <motion.span
          aria-hidden
          className="absolute inset-x-0 bottom-0"
          initial={{ height: '0%' }}
          animate={{ height: `${level}%` }}
          transition={{ delay: delay(0.3), duration: reduce ? 0 : 1.1, ease: EASE }}
        >
          {level > 0 && (
            <>
              <motion.svg
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                className="absolute bottom-full left-0 w-[200%] h-1.5 -mb-px fill-primary/35"
                animate={moving ? { x: ['-50%', '0%'] } : undefined}
                transition={moving ? { duration: 3.2, repeat: Infinity, ease: 'linear' } : undefined}
              >
                <path d={WAVE} />
              </motion.svg>
              <motion.svg
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                className="absolute bottom-full left-0 w-[200%] h-1 -mb-px fill-primary"
                animate={moving ? { x: ['0%', '-50%'] } : undefined}
                transition={moving ? { duration: 2.2, repeat: Infinity, ease: 'linear' } : undefined}
              >
                <path d={WAVE} />
              </motion.svg>
            </>
          )}
          <span className="absolute inset-0 bg-primary" />
        </motion.span>
      </span>

      <span className={`text-sm font-semibold tabular-nums ${count > 0 ? 'text-ink' : 'text-ink-3'}`}>
        <CountUp value={count} />
      </span>
    </motion.li>
  );
}

const OUTCOMES = [
  { key: 'waiting', label: 'En attente', icon: Clock01Icon, tone: 'bg-accent-soft text-accent' },
  { key: 'paid', label: 'Ont payé', icon: CheckmarkCircle02Icon, tone: 'bg-success-soft text-success' },
  { key: 'finished', label: 'Terminés', icon: Flag02Icon, tone: 'bg-surface-2 text-ink-2' },
] as const;

/**
 * Where every filleul is in their 7 days: one circle per day, filled like a
 * glass with the people on that day. Before and after the 7 days (waiting for
 * the first message, paid, finished) sit underneath as three chips.
 */
export function RelanceJourney({ buckets, live }: { buckets: JourneyBuckets; live: boolean }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...buckets.days);

  return (
    <section aria-label="Le parcours de vos filleuls" className="bg-surface border border-border rounded-card p-4">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-semibold text-ink">Le parcours</h2>
        <span className="text-xs text-ink-3 whitespace-nowrap">
          <CountUp value={buckets.inProgress} /> en cours
        </span>
      </div>

      <ol className="relative flex justify-between">
        {/* The rail draws itself left to right, through the circles' centres. */}
        <motion.span
          aria-hidden
          className="absolute left-4 right-4 top-[37px] min-[360px]:top-[39px] h-0.5 rounded-pill bg-border origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
        />
        {buckets.days.map((count, i) => (
          <DayCircle key={i} day={i + 1} count={count} max={max} live={live} index={i} />
        ))}
      </ol>

      <ul className="mt-4 grid grid-cols-3 gap-2">
        {OUTCOMES.map((o, i) => (
          <motion.li
            key={o.key}
            className={`rounded-tile px-2 py-2.5 flex flex-col items-center gap-1 ${o.tone}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduce ? 0 : 0.7 + i * 0.08, type: 'spring', stiffness: 380, damping: 22 }}
          >
            <span className="flex items-center gap-1 text-lg font-bold leading-none">
              <HugeiconsIcon icon={o.icon} size={16} />
              <CountUp value={buckets[o.key]} />
            </span>
            <span className="text-xs font-medium">{o.label}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
