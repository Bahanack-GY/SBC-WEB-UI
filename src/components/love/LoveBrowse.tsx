import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Clock01Icon, FavouriteIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { INTENTION_LABELS, loveWindowLabel, type LoveProfile, type LoveStatus } from '../../hooks/useSbcLove';
import LoveCardStack, { type SwipeDirection } from './LoveCardStack';
import LoveProfileModal from './LoveProfileModal';
import LoveMatchCelebration from './LoveMatchCelebration';
import LovePhoto from './LovePhoto';

/** Sent interests + the weekly quota, which rides in `meta` rather than `data`. */
function useSentInterests() {
  return useQuery({
    queryKey: ['sbclove-interests'],
    queryFn: async () => {
      const response = await sbcApiService.getMyLoveInterests();
      handleApiResponse(response); // reuse the error handling, then read the envelope
      const body = response.body as { data?: { toUserId: string }[]; meta?: { interestsLeftThisWeek?: number } };
      return {
        sentTo: new Set((body?.data ?? []).map((i) => String(i.toUserId))),
        left: body?.meta?.interestsLeftThisWeek ?? 0,
      };
    },
  });
}

/** The card face: photo full-bleed, identity legible over a gradient. */
function ProfileCard({ profile }: { profile: LoveProfile }) {
  return (
    <div className="relative h-full w-full">
      <LovePhoto url={profile.photos[0]?.url} blurred={profile.photos[0]?.blurred} alt={profile.displayName} className="h-full w-full" />
      {profile.city && (
        <span className="absolute top-4 right-4 text-xs bg-black/45 text-white rounded-pill px-3 py-1">
          {profile.city}
        </span>
      )}
      {/* Gradient, not a solid bar: the photo keeps its full height and the text
          stays readable whatever is behind it. */}
      <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 to-transparent text-white pointer-events-none">
        <h3 className="text-xl font-bold">
          {profile.displayName}
          {profile.ageBracket && <span className="font-normal text-white/80 text-base"> · {profile.ageBracket}</span>}
        </h3>
        <p className="text-sm text-white/90">
          {profile.intention === 'autre' && profile.otherIntentionText
            ? profile.otherIntentionText
            : INTENTION_LABELS[profile.intention] ?? profile.intention}
        </p>
        <p className="text-xs text-white/70 line-clamp-2 mt-1">{profile.description}</p>
      </div>
    </div>
  );
}

/**
 * "Découvrir" — the window-gated half of the module (spec §2, §9).
 *
 * One profile at a time, decided with a swipe: right expresses interest, left
 * passes. Passing is deliberately client-side and session-scoped — the module
 * has no "refused" state (spec §9 knows only interest), and the deck refills
 * next Wednesday, which is the point of a weekly rendez-vous.
 */
function LoveBrowse({ status, myProfile, onGoToMatches }: {
  status?: LoveStatus;
  myProfile: LoveProfile | null;
  onGoToMatches: () => void;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<LoveProfile | null>(null);
  const [reporting, setReporting] = useState<LoveProfile | null>(null);
  const [reason, setReason] = useState('');
  // The reciprocal-interest moment: kept in state so the celebration can name
  // the person and show both photos side by side.
  const [matched, setMatched] = useState<{ profile: LoveProfile; matchId: string } | null>(null);

  const isOpen = status?.isOpen === true;
  const canInteract = myProfile?.status === 'approved';

  const { data: profiles, isLoading, error } = useQuery<LoveProfile[]>({
    queryKey: ['sbclove-browse'],
    queryFn: async () => handleApiResponse(await sbcApiService.browseLoveProfiles(1, 50)),
    enabled: isOpen,
    // ponytail: the first 50 profiles of the session. Add paging when the pool
    // outgrows one deck.
  });

  const { data: interests } = useSentInterests();

  const interest = useMutation({
    mutationFn: async (profile: LoveProfile) => ({
      profile,
      result: handleApiResponse(await sbcApiService.expressLoveInterest(profile.id)) as {
        matched: boolean; matchId?: string; interestsLeft: number;
      },
    }),
    onSuccess: ({ profile, result }) => {
      if (result.matched && result.matchId) {
        setMessage(null);
        setMatched({ profile, matchId: result.matchId });
      } else {
        setMessage({ ok: true, text: `Intérêt enregistré. Il vous en reste ${result.interestsLeft} cette semaine.` });
      }
      // The server drops anyone you've expressed interest in from the deck.
      queryClient.invalidateQueries({ queryKey: ['sbclove-browse'] });
      queryClient.invalidateQueries({ queryKey: ['sbclove-interests'] });
      queryClient.invalidateQueries({ queryKey: ['sbclove-matches'] });
    },
    onError: (e: Error) => setMessage({ ok: false, text: e.message }),
  });

  // « Dire bonjour » on the celebration: the first half of the double opt-in.
  const sayHello = useMutation({
    mutationFn: async (matchId: string) =>
      handleApiResponse(await sbcApiService.setLoveContactChoice(matchId, 'wants_contact')),
    onSuccess: () => {
      setMatched(null);
      queryClient.invalidateQueries({ queryKey: ['sbclove-matches'] });
      onGoToMatches();
    },
    onError: (e: Error) => { setMatched(null); setMessage({ ok: false, text: e.message }); },
  });

  const block = useMutation({
    mutationFn: async (profileId: string) => handleApiResponse(await sbcApiService.blockLoveProfile(profileId)),
    onSuccess: () => {
      setMessage({ ok: true, text: 'Profil bloqué. Vous ne le verrez plus.' });
      queryClient.invalidateQueries({ queryKey: ['sbclove-browse'] });
    },
    onError: (e: Error) => setMessage({ ok: false, text: e.message }),
  });

  const report = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) =>
      handleApiResponse(await sbcApiService.reportLoveProfile(id, text)),
    onSuccess: () => {
      setReporting(null);
      setReason('');
      setMessage({ ok: true, text: 'Signalement envoyé à la modération.' });
    },
    onError: (e: Error) => setMessage({ ok: false, text: e.message }),
  });

  if (!isOpen) {
    return (
      <div className="bg-surface border border-border rounded-card p-6 text-center">
        <span className="inline-grid place-items-center size-12 rounded-pill bg-danger-soft text-danger mb-3">
          <HugeiconsIcon icon={Clock01Icon} size={24} />
        </span>
        <h3 className="font-semibold text-ink">La session est fermée</h3>
        <p className="text-sm text-ink-2 mt-1">
          SBC Love ouvre une fois par semaine. {loveWindowLabel(status)}.
        </p>
        <p className="text-sm text-ink-3 mt-2">
          En attendant, préparez votre profil dans l'onglet « Mon profil » — il sera validé avant l'ouverture.
        </p>
      </div>
    );
  }

  const deck = (profiles ?? []).filter((p) => !passed.has(p.id) && !interests?.sentTo.has(p.userId));
  const quotaLeft = interests?.left ?? 0;
  const canSwipeRight = canInteract && quotaLeft > 0;

  const pass = (p: LoveProfile) => setPassed((prev) => new Set(prev).add(p.id));

  const handleSwipe = (p: LoveProfile, direction: SwipeDirection) => {
    setDetails(null);
    if (direction === 'left') return pass(p);
    if (!canSwipeRight) {
      setMessage({
        ok: false,
        text: canInteract ? "Vous n'avez plus d'intérêt disponible cette semaine." : "Votre profil doit être approuvé pour manifester un intérêt.",
      });
      return pass(p); // don't jam the deck on a card that can't be acted on
    }
    interest.mutate(p);
  };

  return (
    <div className="space-y-3">
      {message && (
        <p className={`text-sm rounded-card p-3 ${message.ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
          {message.text}
        </p>
      )}

      {!canInteract && (
        <p className="bg-accent-soft text-ink-2 text-sm rounded-card p-3">
          Les photos sont floutées et l'intérêt est désactivé tant que votre profil n'est pas approuvé.
        </p>
      )}

      {canInteract && interests && (
        <p className="text-sm text-ink-2">
          Il vous reste <strong className="text-ink">{quotaLeft}</strong> intérêt(s) cette semaine.
        </p>
      )}

      {isLoading && <p className="text-sm text-ink-3">Chargement des profils…</p>}
      {error && <p className="bg-danger-soft text-danger text-sm rounded-card p-3">{(error as Error).message}</p>}

      {!isLoading && !error && (
        <LoveCardStack
          items={deck}
          keyOf={(p) => p.id}
          renderCard={(p) => <ProfileCard profile={p} />}
          onSwipe={handleSwipe}
          onTap={(p) => setDetails(p)}
          leftLabel="Passer"
          rightLabel="Intérêt"
          empty={
            <div className="bg-surface border border-border rounded-card p-6 text-center">
              <span className="inline-grid place-items-center size-12 rounded-pill bg-danger-soft text-danger mb-3">
                <HugeiconsIcon icon={FavouriteIcon} size={24} />
              </span>
              <h3 className="font-semibold text-ink">Vous avez tout vu</h3>
              <p className="text-sm text-ink-2 mt-1">
                Plus aucun profil à découvrir pour cette session. Revenez à la prochaine.
              </p>
            </div>
          }
        />
      )}

      {matched && (
        <LoveMatchCelebration
          me={myProfile}
          them={matched.profile}
          busy={sayHello.isPending}
          onSayHello={() => sayHello.mutate(matched.matchId)}
          onLater={() => setMatched(null)}
        />
      )}

      {details && (
        <LoveProfileModal
          profile={details}
          onClose={() => setDetails(null)}
          onPass={() => { pass(details); setDetails(null); }}
          onInterest={() => { setDetails(null); handleSwipe(details, 'right'); }}
          onReport={() => { setReporting(details); setReason(''); setDetails(null); }}
          onBlock={() => { if (confirm(`Bloquer ${details.displayName} ?`)) { block.mutate(details.id); setDetails(null); } }}
          interestDisabled={!canSwipeRight || interest.isPending}
          interestLabel="Manifester un intérêt"
        />
      )}

      {reporting && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" onClick={() => setReporting(null)}>
          <div className="bg-surface rounded-card p-4 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-ink">Signaler {reporting.displayName}</h3>
            <textarea
              value={reason}
              rows={3}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motif du signalement"
              className="w-full border border-border rounded-tile px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button onClick={() => setReporting(null)} className="flex-1 border border-border rounded-tile py-2 text-sm">
                Annuler
              </button>
              <button
                onClick={() => report.mutate({ id: reporting.id, text: reason })}
                disabled={reason.trim().length === 0 || report.isPending}
                className="flex-1 bg-danger text-white rounded-tile py-2 text-sm font-semibold disabled:opacity-40"
              >
                Signaler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoveBrowse;
