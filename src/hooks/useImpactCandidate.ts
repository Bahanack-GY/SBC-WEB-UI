import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import type { ApiResponse } from '../services/ApiResponse';
import type {
  ImpactBoard, ImpactCandidate, ImpactCandidateStatus, ImpactEdition, ImpactFinal, ImpactJuryEdition, ImpactMySpace,
  ImpactMyVotes, ImpactPublicCandidate,
} from '../types/impact';

// SBC Impact Challenge v2: the qualification and the candidate space
// (event-service, /api/tickets/impact). The old monthly vote page keeps
// hooks/useImpactChallenge (tombola-service).

export const impactKeys = {
  current: ['impact-v2', 'current'] as const,
  me: ['impact-v2', 'me'] as const,
  board: ['impact-v2', 'board'] as const,
  candidate: (id: string) => ['impact-v2', 'candidate', id] as const,
  myVotes: ['impact-v2', 'my-votes'] as const,
  final: ['impact-v2', 'final'] as const,
  jury: ['impact-v2', 'jury'] as const,
};

/** A refused call, with the server's French message, code and details. */
export class ImpactApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;
  constructor(res: ApiResponse, fallback: string) {
    super(res.body?.message || res.message || fallback);
    this.status = res.statusCode;
    this.code = res.body?.code;
    this.details = res.body?.details;
  }
}

/** The response's data, or an ImpactApiError. */
export const impactData = <T>(res: ApiResponse, fallback: string): T => {
  if (!res.isSuccessByStatusCode) throw new ImpactApiError(res, fallback);
  return res.body?.data as T;
};

/**
 * The live edition, or null. Public and cached by the server; shared by the
 * home banner, the vote page's card and the candidate page.
 */
export const useImpactCurrentEdition = (opts: { followRounds?: boolean } = {}) =>
  useQuery<ImpactEdition | null>({
    queryKey: impactKeys.current,
    queryFn: async () => {
      const data = impactData<ImpactEdition | null>(await sbcApiService.impactCurrent(), 'Impossible de charger le SBC Impact Challenge.');
      return data && data._id ? data : null;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    // The board and a candidate's page follow the rounds (open, closed) while one is open.
    refetchInterval: (query) => (opts.followRounds && openRound(query.state.data) ? IMPACT_POLL_MS : false),
    refetchIntervalInBackground: false,
    retry: 1,
  });

/** Statuses in which the counter still matters (the member is racing for a seat). */
const COUNTING: ImpactCandidateStatus[] = ['QUALIFYING', 'WAITLIST'];

/** While the counter is below the requirement during the qualification, a newly paid filleul must show up. */
export const isCounting = (space: ImpactMySpace | null | undefined): boolean => {
  const c = space?.candidacy;
  return !!c && space?.edition?.status === 'QUALIFICATION' && COUNTING.includes(c.status)
    && c.invitations.valid < c.invitations.required;
};

/**
 * Whether the space can still change by itself: a qualifying candidate (a filleul
 * pays, or the count is reached and the seat arrives within seconds) or one on the
 * waiting list (a freed seat promotes them, even after qualification closed).
 */
export const shouldPoll = (space: ImpactMySpace | null | undefined): boolean => {
  const c = space?.candidacy;
  const e = space?.edition?.status;
  if (!c) return false;
  if (c.status === 'QUALIFYING') return e === 'QUALIFICATION';
  if (c.status === 'WAITLIST') return e === 'QUALIFICATION' || e === 'QUALIFICATION_CLOSED';
  // Competition: a content waiting for the team's review, or votes coming in during a round.
  if (e === 'COMPETITION' && COMPETING.includes(c.status)) {
    const pending = space?.submissions?.VIDEO?.status === 'PENDING' || space?.submissions?.PROJECT?.status === 'PENDING';
    return pending || !!openRound(space?.edition);
  }
  return false;
};

/** Candidates still in the race during the competition. */
const COMPETING: ImpactCandidateStatus[] = ['OFFICIAL', 'STAGE_2', 'STAGE_3'];

/** The vote round open right now, if any. */
export const openRound = (e: ImpactEdition | null | undefined): 'FREE' | 'PAID' | null => {
  if (e?.rounds?.FREE?.status === 'OPEN') return 'FREE';
  if (e?.rounds?.PAID?.status === 'OPEN') return 'PAID';
  return null;
};

export const IMPACT_POLL_MS = 30 * 1000;

/**
 * The member's space. Polled every 30 s while they are still counting; react-query
 * pauses the interval while the page is hidden (refetchIntervalInBackground: false).
 */
export const useImpactMySpace = () =>
  useQuery<ImpactMySpace>({
    queryKey: impactKeys.me,
    queryFn: async () => {
      const d = impactData<Partial<ImpactMySpace>>(await sbcApiService.impactMe(), 'Impossible de charger votre espace candidat.') ?? {};
      return {
        edition: d.edition ?? null,
        candidacy: d.candidacy ?? null,
        canApply: !!d.canApply,
        blocker: d.blocker ?? null,
        canEdit: !!d.canEdit,
        canWithdraw: !!d.canWithdraw,
        submissions: d.submissions ?? null,
      };
    },
    refetchInterval: (query) => (shouldPoll(query.state.data) ? IMPACT_POLL_MS : false),
    refetchIntervalInBackground: false,
    retry: 1,
  });

/** The candidate replaces the one in the cached space (answers of apply/edit/refresh/withdraw). */
export const withCandidate = (space: ImpactMySpace | undefined, candidacy: ImpactCandidate): ImpactMySpace | undefined => {
  if (!space) return space;
  // A fresh application can be edited; a withdrawn one cannot. Otherwise keep what the server said.
  const open = ['QUALIFYING', 'WAITLIST', 'OFFICIAL'].includes(candidacy.status);
  const fresh = !space.candidacy;
  return {
    ...space, candidacy, canApply: false, blocker: null,
    canEdit: open && (fresh || space.canEdit),
    canWithdraw: open && (fresh || space.canWithdraw),
  };
};

// ---------- Phase 2: the public board, a candidate's page, the member's votes ----------

/** The competition's board, or null before it. Polled every 30 s while a round is open (paused when hidden). */
export const useImpactBoard = (opts: { poll?: boolean } = {}) =>
  useQuery<ImpactBoard | null>({
    queryKey: impactKeys.board,
    queryFn: async () => {
      const data = impactData<ImpactBoard | null>(await sbcApiService.impactBoard(), 'Impossible de charger les candidats.');
      return data && Array.isArray(data.candidates) ? data : null;
    },
    refetchInterval: opts.poll ? IMPACT_POLL_MS : false,
    refetchIntervalInBackground: false,
    retry: 1,
  });

export const useImpactPublicCandidate = (id: string | undefined, opts: { poll?: boolean } = {}) =>
  useQuery<ImpactPublicCandidate>({
    queryKey: impactKeys.candidate(id ?? ''),
    queryFn: async () => impactData<ImpactPublicCandidate>(await sbcApiService.impactPublicCandidate(id!), 'Impossible de charger ce candidat.'),
    enabled: !!id,
    refetchInterval: opts.poll ? IMPACT_POLL_MS : false,
    refetchIntervalInBackground: false,
    retry: (count, err) => count < 1 && (err as ImpactApiError)?.status !== 404,
  });

/** The member's free vote and vote purchases. */
export const useImpactMyVotes = (opts: { enabled?: boolean } = {}) =>
  useQuery<ImpactMyVotes>({
    queryKey: impactKeys.myVotes,
    queryFn: async () => {
      const d = impactData<Partial<ImpactMyVotes>>(await sbcApiService.impactMyVotes(), 'Impossible de charger vos votes.') ?? {};
      return {
        freeVote: d.freeVote ?? null,
        purchases: d.purchases ?? [],
        myCandidateId: d.myCandidateId ?? null,
        canFreeVote: d.canFreeVote ?? null,
        finalVote: d.finalVote ?? null,
        canFinalVote: d.canFinalVote ?? null,
      };
    },
    enabled: opts.enabled ?? true,
    retry: 1,
  });

// ---------- Phase 3: the live final and the jury ----------

/** The edition is in its final (TOP 3, live, result): jurors and the live screen exist. */
export const isFinalEdition = (e: { status?: string } | null | undefined) => e?.status === 'FINAL' || e?.status === 'FINISHED';

export const FINAL_LIVE_POLL_MS = 5 * 1000;
export const FINAL_IDLE_POLL_MS = 60 * 1000;

/**
 * The live final screen, or null. Every 5 s while the final is LIVE (the server caches 5 s),
 * every minute otherwise; paused while the page is hidden.
 */
export const useImpactFinal = (opts: { enabled?: boolean } = {}) =>
  useQuery<ImpactFinal | null>({
    queryKey: impactKeys.final,
    queryFn: async () => {
      const data = impactData<ImpactFinal | null>(await sbcApiService.impactFinal(), 'Impossible de charger la finale.');
      return data && Array.isArray(data.finalists) ? data : null;
    },
    enabled: opts.enabled ?? true,
    refetchInterval: (query) => (query.state.data?.stage === 'LIVE' ? FINAL_LIVE_POLL_MS : FINAL_IDLE_POLL_MS),
    refetchIntervalInBackground: false,
    retry: 1,
  });

/** The juror's editions ([] for everyone else). */
export const useImpactJury = (opts: { enabled?: boolean } = {}) =>
  useQuery<ImpactJuryEdition[]>({
    queryKey: impactKeys.jury,
    queryFn: async () => {
      const data = impactData<ImpactJuryEdition[] | null>(await sbcApiService.impactJuryMe(), 'Impossible de charger votre espace jury.');
      return Array.isArray(data) ? data : [];
    },
    enabled: opts.enabled ?? true,
    // The finalist on stage changes during the live.
    refetchInterval: (query) => (query.state.data?.some((j) => j.canScore) ? 15 * 1000 : false),
    refetchIntervalInBackground: false,
    retry: 1,
  });

/** A new key for each purchase click (server: 8–100 characters of [A-Za-z0-9_-]). */
export const newIdempotencyKey = (): string => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};
