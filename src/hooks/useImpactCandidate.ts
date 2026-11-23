import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import type { ApiResponse } from '../services/ApiResponse';
import type { ImpactCandidate, ImpactCandidateStatus, ImpactEdition, ImpactMySpace } from '../types/impact';

// SBC Impact Challenge v2: the qualification and the candidate space
// (event-service, /api/tickets/impact). The old monthly vote page keeps
// hooks/useImpactChallenge (tombola-service).

export const impactKeys = {
  current: ['impact-v2', 'current'] as const,
  me: ['impact-v2', 'me'] as const,
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
export const useImpactCurrentEdition = () =>
  useQuery<ImpactEdition | null>({
    queryKey: impactKeys.current,
    queryFn: async () => {
      const data = impactData<ImpactEdition | null>(await sbcApiService.impactCurrent(), 'Impossible de charger le SBC Impact Challenge.');
      return data && data._id ? data : null;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
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
  return false;
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
