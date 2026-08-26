import { motion } from 'motion/react';
import Avatar from './Avatar';
import { fcfa, flag } from '../../lib/utils';
import type { LeaderboardEntry } from '../../types/api';

/** Ranks 4 and below: a row with a progress bar relative to the leader. */
function LeaderboardRow({ entry, leaderCount, index }: {
  entry: LeaderboardEntry;
  leaderCount: number;
  index: number;
}) {
  const pct = leaderCount > 0 ? Math.min(100, Math.round((entry.referralCount / leaderCount) * 100)) : 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className="bg-surface border border-border rounded-card p-3 flex items-center gap-3"
    >
      <span className="text-xs font-semibold text-ink-3 w-6 shrink-0">#{entry.rank}</span>
      <Avatar entry={entry} size={36} className="shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-ink truncate">
            {entry.name} <span className="font-normal">{flag(entry.country)}</span>
          </p>
          <p className="text-sm font-semibold text-success shrink-0">{entry.referralCount} filleuls</p>
        </div>

        <div className="mt-1.5 h-1.5 rounded-pill bg-surface-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-pill bg-primary"
          />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-[11px] text-ink-3 truncate">{entry.city ?? ''}</p>
          <p className="text-[11px] font-semibold text-accent shrink-0">{fcfa(entry.earnings)}</p>
        </div>
      </div>
    </motion.li>
  );
}

export default LeaderboardRow;
