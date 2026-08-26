import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CrownIcon } from '@hugeicons/core-free-icons';
import Avatar from './Avatar';
import { fcfa, flag, cn } from '../../lib/utils';
import type { LeaderboardEntry } from '../../types/api';

/** Visual order is 2nd, 1st, 3rd — the winner sits in the middle and taller. */
const SLOTS = [1, 0, 2] as const;

function Block({ entry, place }: { entry: LeaderboardEntry; place: number }) {
  const isWinner = place === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * place, type: 'spring', stiffness: 260, damping: 24 }}
      className="flex-1 flex flex-col items-center min-w-0"
    >
      <div className="relative">
        {isWinner && (
          <HugeiconsIcon
            icon={CrownIcon}
            size={22}
            className="text-accent absolute -top-5 left-1/2 -translate-x-1/2"
          />
        )}
        <Avatar entry={entry} size={isWinner ? 68 : 54} />
        <span
          className={cn(
            'absolute -bottom-1 -right-1 size-5 rounded-pill grid place-items-center text-[10px] font-bold text-white',
            isWinner ? 'bg-accent' : 'bg-ink-3',
          )}
        >
          {entry.rank}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold text-ink truncate max-w-full">{entry.name}</p>
      <p className="text-xs text-ink-3 truncate max-w-full">
        {flag(entry.country)} {entry.city ?? ''}
      </p>

      {/* Height difference alone carries the podium — no shadows, no elevation
          illusion. The winner's tint is a state colour, which the flat rules allow. */}
      <div
        className={cn(
          'mt-3 w-full rounded-card border px-2 py-3 text-center',
          isWinner ? 'bg-primary-soft border-primary/30' : 'bg-surface border-border',
          isWinner ? 'min-h-24' : 'min-h-20',
        )}
      >
        <p className={cn('text-lg font-bold leading-tight', isWinner ? 'text-primary' : 'text-ink')}>
          {entry.referralCount}
        </p>
        <p className="text-[11px] text-ink-3">filleuls</p>
        <p className="mt-1 text-[11px] font-semibold text-accent">{fcfa(entry.earnings)}</p>
      </div>
    </motion.div>
  );
}

/**
 * Top three. Renders correctly with 1 or 2 entries too — which happens in the
 * first hours of every month, when the board has just reset.
 */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const top = SLOTS.map((i) => entries[i]).filter(Boolean);
  if (!top.length) return null;

  return (
    <div className="flex items-end gap-2 pt-6">
      {SLOTS.map((i) =>
        entries[i] ? <Block key={entries[i].userId} entry={entries[i]} place={i} /> : null,
      )}
    </div>
  );
}

export default Podium;
