import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import type { ApiResponse } from '../services/ApiResponse';

// SBC Impact Challenge — tombola-service, /api/challenges.
// Shapes follow tombola-service/src/database/models/{impact-challenge,entrepreneur}.model.ts
// and entrepreneur.service.getLeaderboard().

export type ChallengeStatus = 'draft' | 'active' | 'voting_closed' | 'funds_distributed' | 'cancelled';

export interface ImpactChallenge {
  _id: string;
  campaignName: string;
  month: number;
  year: number;
  status: ChallengeStatus;
  startDate: string;
  endDate: string;
  description: { fr: string; en: string };
  totalCollected: number;
  totalVoteCount: number;
}

/** What the public endpoints return: no email, phone or linked account. */
export interface ChallengeEntrepreneur {
  _id: string;
  challengeId: string;
  name: string;
  country: string;
  city: string;
  projectName: string;
  projectDescription: { fr: string; en: string };
  businessCategory: string;
  videoUrl: string;
  videoDuration?: number;
  videoThumbnailUrl?: string;
  voteCount: number;
  totalAmount: number;
  rank?: number;
  isWinner?: boolean;
}

export interface LeaderboardEntry {
  _id: string;
  name: string;
  projectName: string;
  voteCount: number;
  totalAmount: number;
  rank: number;
  videoUrl: string;
  videoThumbnailUrl?: string;
}

export interface TicketAllowance {
  used: number;
  remaining: number;
  max: number;
}

export interface CurrentChallenge {
  challenge: ImpactChallenge;
  entrepreneurs: ChallengeEntrepreneur[];
}

/**
 * Price of one vote. tombola-service's CHALLENGE_VOTE_PRICE (default 200); the
 * API does not expose it, and refuses any amount that is not a multiple of it.
 */
export const VOTE_PRICE = 200;

/** Fallback for the monthly ticket cap while the member's allowance is unknown. */
export const DEFAULT_MAX_TICKETS = 25;

export const impactChallengeKeys = {
  current: ['impact-challenge', 'current'] as const,
  leaderboard: (id: string) => ['impact-challenge', id, 'leaderboard'] as const,
  allowance: (id: string) => ['impact-challenge', id, 'ticket-allowance'] as const,
};

const messageOf = (res: ApiResponse, fallback: string) =>
  res.body?.message || res.message || fallback;

/**
 * The challenge open to votes, or null when none is running (the API answers
 * 404). Shared by the home banner and the page, so opening the page from the
 * banner shows it at once.
 */
export const useCurrentImpactChallenge = () =>
  useQuery<CurrentChallenge | null>({
    queryKey: impactChallengeKeys.current,
    queryFn: async () => {
      const res = await sbcApiService.getCurrentImpactChallenge();
      if (res.statusCode === 404) return null;
      if (!res.isSuccessByStatusCode) throw new Error(messageOf(res, 'Impossible de charger le challenge.'));
      const data = res.body?.data;
      if (!data?.challenge) return null;
      return { challenge: data.challenge, entrepreneurs: data.entrepreneurs ?? [] };
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

/** Live ranking. Polled while the page is open: votes land as payments confirm. */
export const useImpactChallengeLeaderboard = (challengeId: string | undefined) =>
  useQuery<LeaderboardEntry[]>({
    queryKey: impactChallengeKeys.leaderboard(challengeId ?? ''),
    queryFn: async () => {
      const res = await sbcApiService.getImpactChallengeLeaderboard(challengeId!);
      if (!res.isSuccessByStatusCode) throw new Error(messageOf(res, 'Classement indisponible.'));
      return res.body?.data?.entrepreneurs ?? [];
    },
    enabled: !!challengeId,
    refetchInterval: 30 * 1000,
    retry: 1,
  });

/** Tickets the member already has this month, and how many votes with a ticket remain. */
export const useTicketAllowance = (challengeId: string | undefined) =>
  useQuery<TicketAllowance>({
    queryKey: impactChallengeKeys.allowance(challengeId ?? ''),
    queryFn: async () => {
      const res = await sbcApiService.getImpactChallengeTicketAllowance(challengeId!);
      if (!res.isSuccessByStatusCode) throw new Error(messageOf(res, 'Tickets indisponibles.'));
      const d = res.body?.data ?? {};
      return { used: Number(d.used) || 0, remaining: Number(d.remaining) || 0, max: Number(d.max) || DEFAULT_MAX_TICKETS };
    },
    enabled: !!challengeId,
    retry: 1,
  });

export type VotingPhase = 'open' | 'not_started' | 'ended' | 'closed';

/** The server's own rule: status active AND between startDate and endDate. */
export const votingPhase = (c: Pick<ImpactChallenge, 'status' | 'startDate' | 'endDate'>, now = Date.now()): VotingPhase => {
  if (c.status !== 'active') return 'closed';
  if (c.startDate && now < new Date(c.startDate).getTime()) return 'not_started';
  if (c.endDate && now > new Date(c.endDate).getTime()) return 'ended';
  return 'open';
};

export const francs = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} F`;

const pad = (n: number) => String(n).padStart(2, '0');

/** "2 j 05 h 12 min", or "05 h 12 min 09 s" in the last day. */
export const formatCountdown = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d > 0 ? `${d} j ${pad(h)} h ${pad(m)} min` : `${pad(h)} h ${pad(m)} min ${pad(s % 60)} s`;
};

/** "Fin dans 4 jours" / "Fin dans 5 h" / "Fin dans 12 min". */
export const timeLeftLabel = (endDate: string, now = Date.now()) => {
  const ms = new Date(endDate).getTime() - now;
  if (ms <= 0) return 'Votes terminés';
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `Fin dans ${days} jour${days > 1 ? 's' : ''}`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `Fin dans ${hours} h`;
  return `Fin dans ${Math.max(1, Math.floor(ms / 60_000))} min`;
};

const BUCKET = 'https://storage.googleapis.com/sbc-file-storage/';

/**
 * Pitch videos are stored in the bucket, which no longer answers anonymous
 * requests (403 since 2026-09-05). settings-service streams them from our own
 * origin with byte ranges, so the player can seek and Cloudflare can cache.
 */
export const challengeVideoSrc = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith(BUCKET)) return sbcApiService.generateStreamedFileUrl(url.slice(BUCKET.length));
  if (/^https?:\/\//.test(url)) return url;
  return sbcApiService.generateStreamedFileUrl(url);
};

/** The server answers in English; members read French. */
export const challengeErrorMessage = (raw: string | undefined): string => {
  const msg = raw || '';
  const left = /only vote (\d+) more/i.exec(msg);
  if (left) {
    const n = Number(left[1]);
    return `Il vous reste ${n} vote${n > 1 ? 's' : ''} avec ticket ce mois-ci. Choisissez un nombre plus petit.`;
  }
  if (/maximum .*tickets/i.test(msg)) return 'Vous avez déjà tous vos tickets de tombola ce mois-ci. Utilisez « Soutenir » pour continuer.';
  if (/has not started/i.test(msg)) return "Les votes n'ont pas encore commencé.";
  if (/has ended/i.test(msg)) return 'Les votes sont terminés.';
  if (/not currently accepting/i.test(msg)) return "Ce challenge n'accepte plus de votes.";
  if (/entrepreneur/i.test(msg)) return "Cet entrepreneur n'est plus disponible pour le vote.";
  if (/amount must be/i.test(msg)) return `Le montant doit être un multiple de ${francs(VOTE_PRICE)}.`;
  if (/authentication|unauthori[sz]ed/i.test(msg)) return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
  return msg || "Le paiement n'a pas pu être ouvert. Réessayez.";
};
