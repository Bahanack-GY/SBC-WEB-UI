import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Clock01Icon, Flag02Icon } from '@hugeicons/core-free-icons';
import { CountUp } from './ui/CountUp';
import type { JourneyBuckets } from '../../utils/relance';

/**
 * Where every filleul is in their 7 days, drawn as a path.
 *
 * The old page split this across a stats grid, an "engagement" accordion and a
 * separate "distribution des cibles" block, none of which said what the
 * numbers were for. One picture answers it: who is waiting, who is on which
 * day, and how many got to the point — paying.
 */
export function RelanceJourney({ buckets, live }: { buckets: JourneyBuckets; live: boolean }) {
  const reduce = useReducedMotion();
  const maxDay = Math.max(1, ...buckets.days);

  const rows: Array<{ key: string; label: string; count: number; kind: 'waiting' | 'day' | 'paid' | 'finished'; day?: number }> = [
    { key: 'waiting', label: 'En attente du 1er message', count: buckets.waiting, kind: 'waiting' },
    ...buckets.days.map((count, i) => ({ key: `d${i + 1}`, label: `Jour ${i + 1}`, count, kind: 'day' as const, day: i + 1 })),
    { key: 'paid', label: 'Ont payé', count: buckets.paid, kind: 'paid' },
    { key: 'finished', label: '7 jours terminés', count: buckets.finished, kind: 'finished' },
  ];

  const step = reduce ? 0 : 0.07;

  return (
    <section aria-label="Le parcours de vos filleuls" className="bg-surface border border-border rounded-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold text-ink">Le parcours de vos filleuls</h2>
        <span className="text-xs text-ink-3">
          <CountUp value={buckets.inProgress} /> en cours
        </span>
      </div>

      <ol className="relative">
        {/* The rail draws itself down behind the nodes. */}
        <motion.span
          aria-hidden
          className="absolute left-[15px] top-4 bottom-4 w-0.5 rounded-pill bg-border origin-top"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1] }}
        />

        {rows.map((row, i) => {
          const hasPeople = row.count > 0;
          const pulse = live && hasPeople && (row.kind === 'day' || row.kind === 'waiting');
          const node =
            row.kind === 'paid' ? 'bg-success text-white'
              : row.kind === 'finished' ? 'bg-surface-2 text-ink-3'
                : row.kind === 'waiting' ? 'bg-accent-soft text-accent'
                  : hasPeople ? 'bg-primary text-white' : 'bg-surface-2 text-ink-3';

          return (
            <motion.li
              key={row.key}
              className={`relative flex items-center gap-3 py-1.5 ${row.kind === 'paid' ? 'mt-2' : ''}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * step, type: 'spring', stiffness: 300, damping: 26 }}
            >
              <span className="relative z-10 grid place-items-center size-8 shrink-0">
                {pulse && (
                  <motion.span
                    aria-hidden
                    className={`absolute inset-0 rounded-pill ${row.kind === 'waiting' ? 'bg-accent/30' : 'bg-primary/30'}`}
                    animate={{ scale: [1, 1.55], opacity: [0.7, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: i * 0.12 }}
                  />
                )}
                <motion.span
                  className={`relative grid place-items-center size-8 rounded-pill text-xs font-bold ${node}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + i * step, type: 'spring', stiffness: 420, damping: 18 }}
                >
                  {row.kind === 'day' && row.day}
                  {row.kind === 'waiting' && <HugeiconsIcon icon={Clock01Icon} size={16} />}
                  {row.kind === 'paid' && <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />}
                  {row.kind === 'finished' && <HugeiconsIcon icon={Flag02Icon} size={16} />}
                </motion.span>
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm ${row.kind === 'paid' ? 'font-semibold text-success' : hasPeople ? 'text-ink' : 'text-ink-3'}`}>
                    {row.label}
                  </span>
                  <span className={`text-sm font-semibold ${row.kind === 'paid' ? 'text-success' : hasPeople ? 'text-ink' : 'text-ink-3'}`}>
                    <CountUp value={row.count} />
                  </span>
                </div>
                {row.kind === 'day' && (
                  <div className="mt-1 h-1.5 rounded-pill bg-surface-2 overflow-hidden">
                    <motion.div
                      className="h-full rounded-pill bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${(row.count / maxDay) * 100}%` }}
                      transition={{ delay: 0.3 + i * step, duration: reduce ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </section>
  );
}
