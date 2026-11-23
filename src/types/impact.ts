// SBC Impact Challenge v2 (event-service, gateway /api/tickets/impact/*).
// Contract: server docs/impact-challenge/PHASE1.md. Not the old monthly
// challenge of tombola-service (/api/challenges, hooks/useImpactChallenge).

export type ImpactEditionStatus = 'QUALIFICATION' | 'QUALIFICATION_CLOSED' | 'COMPETITION' | 'FINAL';

export interface ImpactProfileField {
  key: string;
  label: string;
  required: boolean;
  maxLength: number;
}

export interface ImpactEdition {
  _id: string;
  name: string;
  slug: string;
  description: string;
  rulesText: string;
  status: ImpactEditionStatus;
  schedule: {
    qualificationOpensAt: string;
    qualificationClosesAt: string;
    competitionStartsAt?: string;
    finalAt?: string;
  };
  registrationOpen: boolean;
  registrationClosedReason: 'seats_full' | 'date' | 'admin' | 'full' | null;
  seats: { taken: number; max: number };
  settings: {
    maxCandidates: number;
    invitationsRequired: number;
    waitlistSize: number;
    finalistsCount: number;
    categories: string[];
    profileFields: ImpactProfileField[];
    // Later phases (votes, final, tombola); not used by the candidate space.
    [key: string]: unknown;
  };
}

export interface ImpactProfileInput {
  name: string;
  photoFileId: string;
  country: string;
  city: string;
  activity: string;
  category: string;
  projectName: string;
  projectDescription: string;
  presentation: string;
  link?: string;
  extra?: Record<string, string>;
}

export type ImpactCandidateStatus =
  | 'QUALIFYING' | 'WAITLIST' | 'OFFICIAL'
  | 'STAGE_2' | 'STAGE_3' | 'FINALIST' | 'WINNER' | 'ELIMINATED' | 'FINISHED'
  | 'NOT_SELECTED' | 'SUSPENDED' | 'DISQUALIFIED' | 'WITHDRAWN';

export type ImpactReviewStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED';

export interface ImpactCandidate {
  _id: string;
  editionId: string;
  userId: string;
  sbcId: string | null;
  profile: ImpactProfileInput & { extra: Record<string, string> };
  status: ImpactCandidateStatus;
  statusLabel: string;
  suspendedFrom: ImpactCandidateStatus | null;
  invitations: {
    valid: number;
    pending: number;
    required: number;
    reachedAt: string | null;
    checkedAt: string | null;
  };
  seatNumber: number | null;
  seatAt: string | null;
  waitlistRank: number | null;
  review: { status: ImpactReviewStatus; reason?: string; at?: string };
  profileUpdatedAt: string;
  statusHistory: { from: string; to: string; at: string; reason?: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ImpactMySpace {
  edition: ImpactEdition | null;
  candidacy: ImpactCandidate | null;
  canApply: boolean;
  blocker: { code: string; message: string } | null;
  /** The server's own rule (status QUALIFYING/WAITLIST/OFFICIAL, edition not yet in competition). */
  canEdit: boolean;
  canWithdraw: boolean;
}

/** Limits of the profile, the same as the server's (`parseProfile`). */
export const IMPACT_PROFILE_LIMITS = {
  name: [2, 80],
  country: [2, 60],
  city: [2, 80],
  activity: [2, 120],
  category: [1, 60],
  projectName: [2, 120],
  projectDescription: [20, 1500],
  presentation: [50, 4000],
  link: [0, 300],
} as const satisfies Record<string, readonly [number, number]>;
