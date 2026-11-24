// SBC Impact Challenge v2 (event-service, gateway /api/tickets/impact/*).
// Contract: server docs/impact-challenge/PHASE1.md and PHASE2.md. Not the old monthly
// challenge of tombola-service (/api/challenges, hooks/useImpactChallenge).

export type ImpactEditionStatus = 'QUALIFICATION' | 'QUALIFICATION_CLOSED' | 'COMPETITION' | 'FINAL' | 'FINISHED';

/** Where the competition is: weeks 1–3, the TOP 3 (Phase 2), then the live final and its result (Phase 3). */
export type ImpactStage = 'WEEK1' | 'WEEK2' | 'WEEK3' | 'TOP3' | 'LIVE' | 'RESULT';

/** Stages once the TOP 3 is set (ranks, finalists). */
export const FINAL_STAGES: ImpactStage[] = ['TOP3', 'LIVE', 'RESULT'];

/** A vote round: the free vote of week 2 (FREE), the paid votes of week 3 (PAID). */
export interface ImpactRound {
  status: 'SCHEDULED' | 'OPEN' | 'CLOSED';
  opensAt: string | null;
  closesAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
}

export interface ImpactVotePack { votes: number; price: number }

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
  /** Phase 2: null before the competition. */
  stage?: ImpactStage | null;
  rounds?: { FREE: ImpactRound | null; PAID: ImpactRound | null };
  settings: {
    maxCandidates: number;
    invitationsRequired: number;
    waitlistSize: number;
    finalistsCount: number;
    categories: string[];
    profileFields: ImpactProfileField[];
    votePrice?: number;
    votePacks?: ImpactVotePack[];
    freeVote?: { membersOnly: boolean; accountsOlderThanRound: boolean; selfVote: boolean };
    paidSelfVote?: boolean;
    balancePayment?: boolean;
    settlementGraceMin?: number;
    // Later phases (final, tombola); not used by the member app yet.
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
  /** Phase 2: votes received, rank once the TOP 3 is set, published at the competition start. */
  votes?: { free: number; paid: number; paidAmount: number };
  rank?: number | null;
  publishedAt?: string | null;
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
  /** Phase 2: the candidate's current video and project (null when not a candidate). */
  submissions: { VIDEO: ImpactSubmission | null; PROJECT: ImpactSubmission | null } | null;
}

// ---------- Phase 2: contents, public board, votes ----------

export type ImpactSubmissionKind = 'VIDEO' | 'PROJECT';
export type ImpactSubmissionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'RESUBMIT_REQUESTED';

export interface ImpactProjectContent {
  problem: string;
  solution: string;
  howItWorks: string;
  targetCustomers: string;
  businessModel: string;
  expectedImpact: string;
  fundingUse: string;
  outlook: string;
  videoFileId?: string;
}

export type ImpactProjectKey = Exclude<keyof ImpactProjectContent, 'videoFileId'>;

/** The 8 headings of the project presentation (server PROJECT_FIELDS), 20–2000 characters each. */
export const IMPACT_PROJECT_FIELDS: { key: ImpactProjectKey; label: string }[] = [
  { key: 'problem', label: 'Le problème' },
  { key: 'solution', label: 'La solution' },
  { key: 'howItWorks', label: 'Le fonctionnement' },
  { key: 'targetCustomers', label: 'La clientèle cible' },
  { key: 'businessModel', label: 'Le modèle économique' },
  { key: 'expectedImpact', label: 'L’impact attendu' },
  { key: 'fundingUse', label: 'L’utilisation d’un éventuel financement' },
  { key: 'outlook', label: 'Les perspectives de développement' },
];
export const IMPACT_PROJECT_LIMITS = [20, 2000] as const;
export const IMPACT_CAPTION_MAX = 500;

export interface ImpactSubmission {
  _id: string;
  candidateId: string;
  kind: ImpactSubmissionKind;
  version: number;
  status: ImpactSubmissionStatus;
  video?: { videoFileId: string; caption?: string };
  project?: ImpactProjectContent;
  review: { reason: string | null; at: string } | null;
  publishedAt: string | null;
  externalUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImpactPublicCandidate {
  _id: string;
  seatNumber: number | null;
  sbcId: string | null;
  status: ImpactCandidateStatus;
  statusLabel: string;
  profile: {
    name: string; photoFileId: string; country: string; city: string; activity: string; category: string;
    projectName: string; projectDescription: string; presentation: string; link: string | null;
  };
  /** Only the accepted (published) versions. */
  video: ImpactSubmission | null;
  project: ImpactSubmission | null;
  votes: { free: number; paid: number };
  rank: number | null;
}

export interface ImpactBoard {
  editionId: string;
  stage: ImpactStage | null;
  /** Sorted for the stage by the server: seat, free votes, paid votes, then rank. */
  candidates: ImpactPublicCandidate[];
  totals: { freeVotes: number; paidVotes: number };
  builtAt: string;
}

export type ImpactPayMethod = 'MOBILE_MONEY' | 'BALANCE';

export interface ImpactPurchase {
  _id: string;
  candidateId: string;
  votes: number;
  amount: number;
  method: ImpactPayMethod;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  counted: boolean;
  lateSettlement: boolean;
  paymentSessionId: string | null;
  refund: { reason: string; at: string | null } | null;
  createdAt: string;
  settledAt: string | null;
}

export interface ImpactMyVotes {
  freeVote: { candidateId: string; candidateName: string | null; at: string } | null;
  purchases: (ImpactPurchase & { candidateName?: string | null })[];
  /** The member's own candidacy in this edition (their own page). */
  myCandidateId: string | null;
  /** Null while the free round is not open; otherwise whether a free vote would be accepted, and why not. */
  canFreeVote: { ok: boolean; code?: string; message?: string } | null;
  /** Phase 3: the final public vote, like the free vote (null while the FINAL round is not open). */
  finalVote?: { candidateId: string; candidateName: string | null; at: string } | null;
  canFinalVote?: { ok: boolean; code?: string; message?: string } | null;
}

// ---------- Phase 3: the live final, the jury, the result ----------

export type ImpactFinalPhase = 'PRESENTATION' | 'QUESTIONS' | 'SCORING';

export interface ImpactJuryCriterion { key: string; label: string; max: number }

export interface ImpactFinalistProfile {
  name: string; photoFileId: string; city: string; country: string; activity: string; projectName: string; projectDescription: string;
}

export interface ImpactResultRow {
  candidateId: string;
  name: string;
  projectName: string;
  paidVotes: number;
  finalVotes: number;
  juryAverage: number;
  juryMax: number;
  jurorsCount: number;
  /** Each part on 0–100. */
  components: { paidVotes: number; publicVote: number; jury: number };
  score: number;
  rank: number;
}

export interface ImpactWeights { paidVotes: number; publicVote: number; jury: number }

export interface ImpactFinal {
  editionId: string;
  name: string;
  status: ImpactEditionStatus;
  stage: ImpactStage | null;
  onStageCandidateId: string | null;
  phase: ImpactFinalPhase | null;
  finalVote: { status: ImpactRound['status']; opensAt: string | null; closesAt: string | null } | null;
  weights: ImpactWeights;
  juryCriteria: ImpactJuryCriterion[];
  formula: string;
  finalists: {
    _id: string; top3Rank: number | null; status: ImpactCandidateStatus; profile: ImpactFinalistProfile;
    video: ImpactSubmission | null; project: ImpactSubmission | null;
  }[];
  result: null | {
    publishedAt: string;
    winnerCandidateId: string;
    weights: ImpactWeights;
    rows: ImpactResultRow[];
  };
}

export interface ImpactJuryScore {
  scores: Record<string, number>;
  total: number;
  comment: string | null;
  updatedAt: string;
  /** Earlier versions kept by the server (« Modifié N fois »). */
  edits: number;
}

export interface ImpactJuryEdition {
  edition: { _id: string; name: string; status: ImpactEditionStatus; stage: ImpactStage | null };
  /** LIVE and not locked. */
  canScore: boolean;
  lockedAt: string | null;
  /** The juror's authenticator code was given less than 30 min ago: no code needed. */
  codeWindowOpen: boolean;
  criteria: ImpactJuryCriterion[];
  maxTotal: number;
  onStageCandidateId: string | null;
  finalists: {
    _id: string; rank: number | null; profile: ImpactFinalistProfile;
    project: ImpactSubmission | null; video: ImpactSubmission | null;
    myScore: ImpactJuryScore | null;
  }[];
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
