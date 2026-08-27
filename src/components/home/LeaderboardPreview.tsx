import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import Podium from '../leaderboard/Podium';
import { LeaderboardSkeleton, LeaderboardEmpty, LeaderboardError } from '../leaderboard/LeaderboardStates';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Home section. Owns its own query so a slow or failing leaderboard never
 * blocks the rest of the page.
 */
function LeaderboardPreview() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useLeaderboard();
  const entries = data?.top ?? [];
  const me = data?.me ?? null;

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
          Classement Général
          <HugeiconsIcon icon={ChampionIcon} size={18} className="text-accent" />
        </h2>
        <Link to="/classement" className="text-sm font-semibold text-primary flex items-center gap-1">
          Voir plus
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
        </Link>
      </div>
      <p className="text-xs text-ink-3">Filleuls directs qui ont payé ce mois-ci</p>

      {isLoading ? (
        <LeaderboardSkeleton rows={0} />
      ) : error ? (
        <div className="mt-3"><LeaderboardError onRetry={() => refetch()} /></div>
      ) : entries.length === 0 ? (
        <div className="mt-3"><LeaderboardEmpty referralCode={user?.referralCode} /></div>
      ) : (
        <>
          <Podium entries={entries} />
          {me && !me.inTop && (
            <p className="mt-3 text-xs text-ink-2 bg-primary-soft rounded-card px-3 py-2 text-center">
              Votre position : <span className="font-bold text-primary">#{me.rank}</span>
              {me.referralCount > 0 && ` · ${me.referralCount} filleul${me.referralCount > 1 ? 's' : ''} payé${me.referralCount > 1 ? 's' : ''}`}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default LeaderboardPreview;
