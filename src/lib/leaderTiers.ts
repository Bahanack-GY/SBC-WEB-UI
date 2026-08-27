/**
 * SBC leader badges — earned on monthly sales.
 *
 * Single source of truth for both the badge shown on a leaderboard entry and
 * the reward table on the Classement page, so the thresholds cannot drift
 * apart between the two.
 */
export interface LeaderTier {
  key: 'leader' | 'gold' | 'elite';
  label: string;
  /** Minimum sales in the month to hold this badge. */
  minSales: number;
  /** Cash bonus in FCFA. */
  bonusXaf: number;
  /** Extra reward on top of the cash, if any. */
  extra?: string;
  /** Badge styling. */
  tint: string;
}

/** Ordered ascending by threshold. */
export const LEADER_TIERS: LeaderTier[] = [
  {
    key: 'leader',
    label: 'Leader',
    minSales: 30,
    bonusXaf: 2000,
    tint: 'bg-surface-2 text-ink-2',
  },
  {
    key: 'gold',
    label: 'Leader Gold',
    minSales: 120,
    bonusXaf: 10000,
    extra: 'T-shirt SBC',
    tint: 'bg-accent-soft text-accent',
  },
  {
    key: 'elite',
    label: 'Leader Elite',
    minSales: 320,
    bonusXaf: 50000,
    extra: 'Ensemble SBC',
    tint: 'bg-primary-soft text-primary',
  },
];

/**
 * The highest tier a sales count qualifies for, or null below the first
 * threshold. Scans from the top so 400 sales yields Elite, not Leader.
 */
export const tierForSales = (sales: number): LeaderTier | null => {
  for (let i = LEADER_TIERS.length - 1; i >= 0; i--) {
    if (sales >= LEADER_TIERS[i].minSales) return LEADER_TIERS[i];
  }
  return null;
};

/** Sales still needed for the next badge, or null once Elite is held. */
export const nextTier = (sales: number): { tier: LeaderTier; remaining: number } | null => {
  const next = LEADER_TIERS.find((t) => sales < t.minSales);
  return next ? { tier: next, remaining: next.minSales - sales } : null;
};
