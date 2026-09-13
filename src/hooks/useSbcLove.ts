import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

/** GET /sbclove/status — kill-switch + weekly session window (spec §2, §14). */
export interface LoveStatus {
  enabled: boolean;
  isOpen: boolean;
  timezone: string;
  activeWeekday: number; // 0=dimanche … 6=samedi
  openHour: number;
  closeHour: number;
  nextOpenAt: string | null;
  minPhotos: number;      // photos required before a profile can be approved
  maxPhotos: number;
}

export interface LovePhoto {
  fileId: string;
  url?: string;
  blurred: boolean;
  order: number;
}

export interface LoveProfile {
  id: string;
  userId: string;
  displayName: string;
  sex?: string;
  ageBracket: string | null;
  city?: string;
  country?: string;
  intention: string;
  otherIntentionText?: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  memberSince?: string;   // SBC join date (user account), not the SBCLOVE profile
  photos: LovePhoto[];
  createdAt?: string;
}

export interface LoveMatch {
  matchId: string;
  otherUserId: string;
  displayName: string;
  city?: string;
  ageBracket: string | null;
  intention?: string;
  photoUrl?: string;
  myChoice: 'pending' | 'wants_contact' | 'declined';
  contactUnlocked: boolean;
  createdAt: string;
}

/** Labels shared by the profile form and every card. */
export const INTENTION_LABELS: Record<string, string> = {
  relation_serieuse: 'Relation sérieuse',
  faire_connaissance: 'Faire connaissance',
  projet_mariage: 'Projet de mariage',
  elargir_cercle_social: 'Élargir mon cercle social',
  echange_valeurs_respect: 'Échange basé sur les valeurs et le respect',
  autre: 'Autre intention',
};

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * "Ouvert jusqu'à 21h" / "Ouvre mercredi à 18h".
 *
 * Built from activeWeekday/openHour rather than from nextOpenAt: those are
 * already expressed in the module's timezone, so no client-side conversion can
 * drift them into the wrong day.
 */
export function loveWindowLabel(status?: LoveStatus | null): string {
  if (!status) return 'Rencontres SBC';
  if (status.isOpen) return `Ouvert jusqu'à ${status.closeHour}h`;
  return `Ouvre ${WEEKDAYS[status.activeWeekday] ?? 'bientôt'} à ${status.openHour}h`;
}

/**
 * Module status.
 *
 * `poll` is off by default because the Home tile mounts this for EVERY member of
 * the app, all week — polling there would make the whole user base hammer
 * sbclove-service for a tile subtitle. Only the SBC Love page itself polls, so
 * the window opening or closing mid-session flips the page live for the handful
 * of people actually looking at it. The window moves on hour boundaries, so a
 * 5-minute stale tile is correct in every practical sense.
 */
export function useLoveStatus({ poll = false }: { poll?: boolean } = {}) {
  return useQuery<LoveStatus>({
    queryKey: ['sbclove-status'],
    queryFn: async () => handleApiResponse(await sbcApiService.getLoveStatus()),
    staleTime: 5 * 60 * 1000,
    refetchInterval: poll ? 60 * 1000 : false,
    refetchOnWindowFocus: poll,
    retry: 1,
  });
}
