import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, AlertCircleIcon, Copy01Icon } from '@hugeicons/core-free-icons';
import Skeleton from '../common/Skeleton';

export function LeaderboardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="pt-6">
      <div className="flex items-end gap-2">
        <Skeleton height="h-28" rounded="rounded-card" />
        <Skeleton height="h-36" rounded="rounded-card" />
        <Skeleton height="h-24" rounded="rounded-card" />
      </div>
      <div className="flex flex-col gap-2 mt-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} height="h-16" rounded="rounded-card" />
        ))}
      </div>
    </div>
  );
}

/**
 * Not an error state. On the 1st of the month the board is legitimately empty
 * until the first referrals land — that is the reset working.
 */
export function LeaderboardEmpty({ referralCode }: { referralCode?: string }) {
  const link = referralCode
    ? `https://sniperbuisnesscenter.com/signup?affiliationCode=${referralCode}`
    : '';
  return (
    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
      <HugeiconsIcon icon={ChampionIcon} size={32} className="text-ink-3" />
      <p className="text-sm font-semibold text-ink">Le classement du mois vient de démarrer</p>
      <p className="text-xs text-ink-2">Parrainez pour être le premier à apparaître ici.</p>
      {link && (
        <button
          onClick={() => navigator.clipboard.writeText(link)}
          className="mt-2 inline-flex items-center gap-2 bg-primary text-white text-sm font-semibold rounded-pill px-4 py-2"
        >
          <HugeiconsIcon icon={Copy01Icon} size={16} />
          Copier mon lien
        </button>
      )}
    </div>
  );
}

export function LeaderboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-surface border border-border rounded-card p-5 text-center flex flex-col items-center gap-2">
      <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
      <p className="text-sm font-semibold text-ink">Classement indisponible</p>
      <button
        onClick={onRetry}
        className="mt-1 bg-primary text-white text-sm font-semibold rounded-pill px-4 py-2"
      >
        Réessayer
      </button>
    </div>
  );
}
