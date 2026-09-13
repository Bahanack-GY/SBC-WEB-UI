import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon } from '@hugeicons/core-free-icons';
import { tierForSales } from '../../lib/leaderTiers';
import { cn } from '../../lib/utils';
import type { MyLeaderboardRank } from '../../types/api';

/**
 * The viewer's own standing, pinned under the top 10.
 *
 * Hidden when they already appear in the list above — showing the same person
 * twice reads as a bug.
 */
function MyRankRow({ me, name }: { me: MyLeaderboardRank; name?: string }) {
  if (me.inTop) return null;

  const tier = tierForSales(me.referralCount);
  const unranked = me.referralCount === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-2 bg-primary text-white rounded-card p-3 flex items-center gap-3"
    >
      <span className="shrink-0 size-9 grid place-items-center rounded-tile bg-white/15">
        <HugeiconsIcon icon={ChampionIcon} size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold truncate">
          {name ? `${name} — vous` : 'Votre position'}
        </span>
        <span className="block text-[11px] text-white/80">
          {unranked
            ? 'Aucun filleul direct payé ce mois-ci'
            : `${me.referralCount} filleul${me.referralCount > 1 ? 's' : ''} payé${me.referralCount > 1 ? 's' : ''} · sur ${me.totalRanked} classés`}
        </span>
      </span>

      {tier && (
        <span className={cn('shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-pill', tier.tint)}>
          {tier.label}
        </span>
      )}

      <span className="shrink-0 text-right">
        <span className="block text-lg font-bold leading-none tabular-nums">
          {unranked ? '—' : `#${me.rank}`}
        </span>
      </span>
    </motion.div>
  );
}

export default MyRankRow;
