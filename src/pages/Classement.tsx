import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, GiftIcon } from '@hugeicons/core-free-icons';
import ProtectedRoute from '../components/common/ProtectedRoute';
import BackButton from '../components/common/BackButton';
import Podium from '../components/leaderboard/Podium';
import LeaderboardRow from '../components/leaderboard/LeaderboardRow';
import { LeaderboardSkeleton, LeaderboardEmpty, LeaderboardError } from '../components/leaderboard/LeaderboardStates';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuth } from '../contexts/AuthContext';

function Classement() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useLeaderboard();
  const entries = data ?? [];
  const rest = entries.slice(3);

  return (
    <ProtectedRoute>
      <div className="p-4 pb-24 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold text-ink flex items-center gap-2">
              Classement Général
              <HugeiconsIcon icon={ChampionIcon} size={20} className="text-accent" />
            </h1>
            <p className="text-xs text-ink-3">Top affiliés du mois, tous niveaux confondus</p>
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
          </>
        )}

        <div className="bg-accent-soft rounded-card p-3 flex gap-3 items-start mt-2">
          <HugeiconsIcon icon={GiftIcon} size={20} className="text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-ink-2 leading-relaxed">
            <span className="font-semibold text-ink">Prix à gagner ce mois.</span> Le top 10 des
            affiliés reçoit jusqu'à 1 500 000 FCFA + bonus paliers. Classement mis à jour chaque
            heure, remis à zéro le 1<sup>er</sup> de chaque mois. Les montants affichés sont une
            estimation.
          </p>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default Classement;
