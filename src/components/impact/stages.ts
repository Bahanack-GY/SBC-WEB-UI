import type { NavigateFunction } from 'react-router-dom';
import type { ImpactRound, ImpactStage } from '../../types/impact';

// Wording of the competition's weeks and vote rounds (Phase 2), shared by the
// board, a candidate's page, the candidate space and the entry card. No React here.

export const STAGE_INFO: Record<ImpactStage, { week: string; title: string; text: string }> = {
  WEEK1: {
    week: 'Semaine 1',
    title: 'Présentation des candidats',
    text: 'Découvrez les candidats officiels et leurs projets.',
  },
  WEEK2: {
    week: 'Semaine 2',
    title: 'Vote gratuit : la meilleure vidéo',
    text: 'Regardez les vidéos « Ma vision de SBC » et votez gratuitement pour votre préférée (1 vote par compte).',
  },
  WEEK3: {
    week: 'Semaine 3',
    title: 'Votes payants : les projets',
    text: 'Découvrez les projets et soutenez vos favoris en achetant des votes. Les votes de cette semaine désignent le TOP 3.',
  },
  TOP3: {
    week: 'TOP 3',
    title: 'Les finalistes',
    text: 'Les votes de la semaine 3 ont désigné les finalistes.',
  },
  LIVE: {
    week: 'Finale',
    title: 'La grande finale en direct',
    text: 'Les finalistes présentent leur projet devant le jury. Votez pour votre finaliste préféré.',
  },
  RESULT: {
    week: 'Finale',
    title: 'Le résultat',
    text: 'Le jury, le vote du public et les votes de la semaine 3 ont désigné le gagnant.',
  },
};

export const PHASE_LABEL: Record<'PRESENTATION' | 'QUESTIONS' | 'SCORING', string> = {
  PRESENTATION: 'Présentation',
  QUESTIONS: 'Questions du jury',
  SCORING: 'Notation',
};

/** 79.76 → « 79,76 ». */
export const score = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

export const rankLabel = (rank: number) => (rank === 1 ? '1er' : `${rank}e`);

export const dateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : '';

/** « Votes ouverts jusqu’au … », « Ouverture le … », « Votes clos ». */
export function roundLine(round: Pick<ImpactRound, 'status' | 'opensAt' | 'closesAt'> | null | undefined, what: string): string {
  if (!round) return `${what} : dates bientôt annoncées.`;
  if (round.status === 'OPEN') return round.closesAt ? `${what} ouvert jusqu’au ${dateTime(round.closesAt)}.` : `${what} ouvert.`;
  if (round.status === 'SCHEDULED') return round.opensAt ? `${what} : ouverture le ${dateTime(round.opensAt)}.` : `${what} : ouverture bientôt.`;
  return `${what} clos.`;
}

export const FREE_ROUND = 'Vote gratuit';
export const PAID_ROUND = 'Vote payant';

export const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;

/** The public page of a candidate, to share. */
export const candidatePageUrl = (id: string) => `${window.location.origin}/impact-challenge/candidats/${encodeURIComponent(id)}`;

/** Most a « Ma vision de SBC » or project video may weigh: settings-service and nginx take 100 Mo. */
export const MAX_VIDEO_BYTES = 100 * 1000 * 1000;
export const MAX_VIDEO_LABEL = '100 Mo';

/** Kinds of news on a « SBC Impact » page. */
export const SHOWCASE_KIND: Record<'STEP' | 'PRODUCT' | 'ACHIEVEMENT' | 'NEWS' | 'RESULT', string> = {
  STEP: 'Étape',
  PRODUCT: 'Produit',
  ACHIEVEMENT: 'Réalisation',
  NEWS: 'Actualité',
  RESULT: 'Résultat',
};

export const showcasePageUrl = (id: string) => `${window.location.origin}/impact/${encodeURIComponent(id)}`;

export const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/** Back in the app's history when there is one, else somewhere sensible (a page opened from a shared link). */
export const goBack = (navigate: NavigateFunction, fallback: string) => {
  const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  if (idx > 0) navigate(-1); else navigate(fallback);
};
