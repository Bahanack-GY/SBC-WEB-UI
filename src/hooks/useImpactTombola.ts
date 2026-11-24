import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { impactData } from './useImpactCandidate';
import { TOMBOLA_IDLE_POLL_MS, TOMBOLA_LIVE_POLL_MS } from './tombolaTiming';
import type {
  ImpactMyTombola, ImpactTicketTier, ImpactTombola, ImpactTombolaHistoryItem, ImpactTombolaProof,
} from '../types/impact';

// SBC Tombola of the Impact Challenge v2 (Phase 4, event-service /api/tickets/impact).
// Not the old monthly tombola (tombola-service, /api/tombolas).

export const tombolaKeys = {
  current: ['impact-v2', 'tombola'] as const,
  mine: ['impact-v2', 'tombola', 'mine'] as const,
  history: ['impact-v2', 'tombola', 'history'] as const,
  proof: (id: string) => ['impact-v2', 'tombola', 'proof', id] as const,
};

/** Winners are still being revealed one by one. */
export const isRevealing = (t: ImpactTombola | null | undefined) =>
  t?.draw?.status === 'DONE' && t.draw.revealedCount < t.draw.winnersCount;

/**
 * The current edition's tombola. Every 3 s while winners are being revealed or the final is
 * live (`live`), every minute otherwise; paused while the page is hidden.
 */
export const useImpactTombola = (opts: { live?: boolean } = {}) =>
  useQuery<ImpactTombola | null>({
    queryKey: tombolaKeys.current,
    queryFn: async () => {
      const data = impactData<ImpactTombola | null>(await sbcApiService.impactTombola(), 'Impossible de charger la tombola.');
      return data && data.editionId ? data : null;
    },
    refetchInterval: (query) => (opts.live || isRevealing(query.state.data) ? TOMBOLA_LIVE_POLL_MS : TOMBOLA_IDLE_POLL_MS),
    refetchIntervalInBackground: false,
    retry: 1,
  });

/** The member's tickets; re-read with the tombola while winners are revealed (a win appears). */
export const useMyTombola = (opts: { live?: boolean } = {}) =>
  useQuery<ImpactMyTombola | null>({
    queryKey: tombolaKeys.mine,
    queryFn: async () => impactData<ImpactMyTombola | null>(await sbcApiService.impactMyTombola(), 'Impossible de charger vos tickets.') ?? null,
    refetchInterval: opts.live ? TOMBOLA_LIVE_POLL_MS : TOMBOLA_IDLE_POLL_MS,
    refetchIntervalInBackground: false,
    retry: 1,
  });

export const useTombolaHistory = () =>
  useQuery<ImpactTombolaHistoryItem[]>({
    queryKey: tombolaKeys.history,
    queryFn: async () => {
      const data = impactData<ImpactTombolaHistoryItem[] | null>(await sbcApiService.impactTombolaHistory(), 'Impossible de charger l’historique.');
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60 * 1000,
    retry: 1,
  });

export const useTombolaProof = (drawId: string | undefined) =>
  useQuery<ImpactTombolaProof>({
    queryKey: tombolaKeys.proof(drawId ?? ''),
    queryFn: async () => impactData<ImpactTombolaProof>(await sbcApiService.impactTombolaProof(drawId!), 'Impossible de charger la preuve du tirage.'),
    enabled: !!drawId,
    retry: 1,
  });

/** Weight of a member's n-th ticket (1-based), as the server computes it. */
export const tierWeight = (n: number, tiers: ImpactTicketTier[]) => {
  for (const t of tiers) if (t.upTo === null || n <= t.upTo) return t.weight;
  return tiers.length ? tiers[tiers.length - 1].weight : 1;
};

/** Total weight of a member holding `count` tickets. */
export const weightOf = (count: number, tiers: ImpactTicketTier[]) => {
  let w = 0;
  for (let n = 1; n <= count; n++) w += tierWeight(n, tiers);
  return w;
};

/** « n° 1–5, 8–14 ». */
export const rangesLabel = (ranges: { from: number; to: number }[]) =>
  `n° ${ranges.map((r) => (r.from === r.to ? `${r.from}` : `${r.from}–${r.to}`)).join(', ')}`;

/** sha256 of a text (UTF-8), in hex, with the browser's SubtleCrypto. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The segments' canonical text, exactly as the server hashes it (`segmentsHash`). */
export const segmentsCanonical = (segments: { from: number; to: number; weight: number; holderHash: string }[]) =>
  segments.map((g) => `${g.from}-${g.to}:${g.weight}:${g.holderHash}`).join('\n');
