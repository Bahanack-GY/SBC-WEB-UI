import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Message01Icon, FavouriteIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { INTENTION_LABELS, type LoveMatch } from '../../hooks/useSbcLove';
import LoveCardStack, { type SwipeDirection } from './LoveCardStack';
import LovePhoto from './LovePhoto';

/** Same card face as Découvrir, so the gesture reads the same in both decks. */
function MatchCard({ match }: { match: LoveMatch }) {
  return (
    <div className="relative h-full w-full">
      <LovePhoto url={match.photoUrl} alt={match.displayName} className="h-full w-full" />
      {match.city && (
        <span className="absolute top-4 right-4 text-xs bg-black/45 text-white rounded-pill px-3 py-1">{match.city}</span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
        <span className="inline-block text-[11px] font-semibold bg-danger rounded-pill px-2 py-0.5 mb-1">MATCH</span>
        <h3 className="text-xl font-bold">
          {match.displayName}
          {match.ageBracket && <span className="font-normal text-white/80 text-base"> · {match.ageBracket}</span>}
        </h3>
        {match.intention && <p className="text-sm text-white/90">{INTENTION_LABELS[match.intention] ?? match.intention}</p>}
        <p className="text-xs text-white/70 mt-1">Souhaitez-vous être contacté(e) par cette personne ?</p>
      </div>
    </div>
  );
}

/**
 * "Mes matchs" (spec §12-13).
 *
 * A match only means the interest was reciprocal. The second decision — do you
 * want to be contacted — is the same swipe as Découvrir: right accepts, left
 * declines. Unlike a pass, both are recorded server-side, and contact opens only
 * when BOTH sides swiped right.
 */
function LoveMatches() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: matches, isLoading } = useQuery<LoveMatch[]>({
    queryKey: ['sbclove-matches'],
    queryFn: async () => handleApiResponse(await sbcApiService.getMyLoveMatches()),
  });

  const choose = useMutation({
    mutationFn: async ({ matchId, choice }: { matchId: string; choice: 'wants_contact' | 'declined' }) =>
      handleApiResponse(await sbcApiService.setLoveContactChoice(matchId, choice)),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['sbclove-matches'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const openChat = useMutation({
    mutationFn: async (matchId: string) =>
      handleApiResponse(await sbcApiService.openLoveMatchChat(matchId)) as { conversationId: string },
    onSuccess: (data) => navigate(`/chat?conversation=${data.conversationId}`),
    onError: (e: Error) => setError(e.message),
  });

  if (isLoading) return <p className="text-sm text-ink-3">Chargement de vos matchs…</p>;

  const pending = (matches ?? []).filter((m) => m.myChoice === 'pending');
  const decided = (matches ?? []).filter((m) => m.myChoice !== 'pending');

  if (!matches?.length) {
    return (
      <div className="bg-surface border border-border rounded-card p-6 text-center">
        <span className="inline-grid place-items-center size-12 rounded-pill bg-danger-soft text-danger mb-3">
          <HugeiconsIcon icon={FavouriteIcon} size={24} />
        </span>
        <h3 className="font-semibold text-ink">Pas encore de match</h3>
        <p className="text-sm text-ink-2 mt-1">
          Un match apparaît quand l'intérêt est réciproque. Vous recevrez aussi un email.
        </p>
      </div>
    );
  }

  const decide = (m: LoveMatch, direction: SwipeDirection) =>
    choose.mutate({ matchId: m.matchId, choice: direction === 'right' ? 'wants_contact' : 'declined' });

  return (
    <div className="space-y-4">
      {error && <p className="bg-danger-soft text-danger text-sm rounded-card p-3">{error}</p>}

      {pending.length > 0 && (
        <LoveCardStack
          items={pending}
          keyOf={(m) => m.matchId}
          renderCard={(m) => <MatchCard match={m} />}
          onSwipe={decide}
          leftLabel="Décliner"
          rightLabel="Contact"
          empty={null}
        />
      )}

      {decided.map((m) => (
        <div key={m.matchId} className="bg-surface border border-border rounded-card overflow-hidden">
          <div className="flex gap-3 p-3">
            <LovePhoto url={m.photoUrl} alt={m.displayName} className="size-20 rounded-tile shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-ink">{m.displayName}</h3>
              <p className="text-xs text-ink-3">{[m.ageBracket, m.city].filter(Boolean).join(' · ')}</p>
              {m.intention && <p className="text-xs text-primary mt-1">{INTENTION_LABELS[m.intention] ?? m.intention}</p>}
            </div>
          </div>

          <div className="border-t border-border p-2">
            {m.contactUnlocked ? (
              <button
                onClick={() => openChat.mutate(m.matchId)}
                disabled={openChat.isPending}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-tile py-2 text-sm font-semibold disabled:opacity-50"
              >
                <HugeiconsIcon icon={Message01Icon} size={16} />
                Discuter
              </button>
            ) : m.myChoice === 'wants_contact' ? (
              <p className="text-sm text-ink-3 text-center py-1">
                En attente de sa réponse. Le contact s'ouvre quand vous êtes d'accord tous les deux.
              </p>
            ) : (
              <p className="text-sm text-ink-3 text-center py-1">Vous avez décliné ce match.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoveMatches;
