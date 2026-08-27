import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon } from '@hugeicons/core-free-icons';
import ProtectedRoute from '../components/common/ProtectedRoute';
import BackButton from '../components/common/BackButton';
import Podium from '../components/leaderboard/Podium';
import LeaderboardRow from '../components/leaderboard/LeaderboardRow';
import { LeaderboardSkeleton, LeaderboardEmpty, LeaderboardError } from '../components/leaderboard/LeaderboardStates';
import RewardSystem from '../components/leaderboard/RewardSystem';
import MyRankRow from '../components/leaderboard/MyRankRow';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../contexts/AuthContext';

function Classement() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useLeaderboard();
  const entries = data?.top ?? [];
  const me = data?.me ?? null;
  const rest = entries.slice(3);

  return (
    <ProtectedRoute>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2">
              Classement Général
              <HugeiconsIcon icon={ChampionIcon} size={20} className="text-accent" />
            </h1>
            <p className="text-xs text-ink-3">Filleuls directs qui ont payé ce mois-ci</p>
          </div>
        </div>

        {isLoading ? (
          <LeaderboardSkeleton rows={7} />
        ) : error ? (
          <LeaderboardError onRetry={() => refetch()} />
        ) : entries.length === 0 ? (
          <LeaderboardEmpty referralCode={user?.referralCode} />
        ) : (
          <>
            <Podium entries={entries} />
            {rest.length > 0 && (
              <ul className="flex flex-col gap-2 mt-2">
                {rest.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    leaderCount={entries[0].referralCount}
                    index={i}
                  />
                ))}
              </ul>
            )}
            {me && <MyRankRow me={me} name={user?.name} />}
          </>
        )}

        <RewardSystem mySales={me?.referralCount} />

        <p className="text-[11px] text-ink-3 text-center">
          Classement mis à jour chaque heure, remis à zéro le 1<sup>er</sup> de chaque mois.
          Les montants affichés sont une estimation.
        </p>
      </div>
    </ProtectedRoute>
  );
}

export default Classement;
