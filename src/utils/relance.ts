/**
 * Relance rules shared by the two relance screens.
 *
 * Kept free of React so every decision the screens make — what state to show,
 * how many filleuls credits cover, what a campaign request contains — is tested
 * on its own (src/utils/relance.test.ts).
 *
 * Two products, never mixed:
 *  - "Relance des nouveaux": a filleul who registers through the parrain's link
 *    and doesn't pay gets one message a day for 7 days, until they pay.
 *  - "Campagnes de relance": the parrain chooses older filleuls and sends them
 *    through the same 7 days.
 */
import type { CampaignStatus, CreateCampaignRequest, CustomMessage, ExitReason } from '../types/relance';

/** Every filleul receives one email a day for 7 days. */
export const EMAILS_PER_FILLEUL = 7;
/** Relance des nouveaux also sends an SMS on day 0 and on each of the 7 days (Cameroon numbers only). */
export const SMS_PER_FILLEUL = 8;
export const RELANCE_DAYS = 7;

// ---------------------------------------------------------------------------
// Relance des nouveaux — what is happening right now
// ---------------------------------------------------------------------------

export type RelanceState = 'paused' | 'no_credits' | 'daily_limit' | 'running';

export interface RelanceStateInput {
  enabled: boolean;
  sendingPaused?: boolean;
  emailBalance: number;
  smsBalance: number;
  messagesSentToday?: number;
  maxMessagesPerDay?: number;
}

/**
 * The one answer the old page never gave: is anything being sent right now?
 *
 * A pause the parrain chose wins over everything else — it is the thing they
 * can act on. `sendingPaused` is the old global pause; nothing sets it any more,
 * but accounts that used it still carry it, so it reads as paused too.
 */
export function deriveRelanceState(s: RelanceStateInput): RelanceState {
  if (!s.enabled || s.sendingPaused) return 'paused';
  if (s.emailBalance <= 0 && s.smsBalance <= 0) return 'no_credits';
  const limit = s.maxMessagesPerDay ?? 500;
  if ((s.messagesSentToday ?? 0) >= limit) return 'daily_limit';
  return 'running';
}

/** How many filleuls a number of email credits carries through all 7 days. */
export const filleulsCovered = (emailCredits: number) =>
  Math.max(0, Math.floor(emailCredits / EMAILS_PER_FILLEUL));

/** How many filleuls a number of SMS credits carries through the sequence. */
export const filleulsCoveredBySms = (smsCredits: number) =>
  Math.max(0, Math.floor(smsCredits / SMS_PER_FILLEUL));

/** Credits a campaign needs to take every chosen filleul through 7 days. */
export const creditsNeeded = (filleuls: number) => Math.max(0, filleuls) * EMAILS_PER_FILLEUL;

// ---------------------------------------------------------------------------
// The 7-day journey
// ---------------------------------------------------------------------------

export interface JourneyInput {
  activeTargets: number;
  dayProgression?: Array<{ day: number; count: number }>;
  targetsConverted?: number;
  completedRelance?: number;
}

export interface JourneyBuckets {
  /** Enrolled, first message not sent yet (day 0). */
  waiting: number;
  /** Filleuls currently on day 1..7, index 0 = day 1. */
  days: number[];
  /** Left because they paid. */
  paid: number;
  /** Went through the 7 days without paying. */
  finished: number;
  /** Everyone still in relance (waiting + days). */
  inProgress: number;
}

/**
 * Where everyone is. The backend reports days 1–7 only, so "waiting for the
 * first message" is what's active but on none of those days.
 */
export function journeyBuckets(input: JourneyInput): JourneyBuckets {
  const days = Array.from({ length: RELANCE_DAYS }, (_, i) =>
    Math.max(0, input.dayProgression?.find(d => d.day === i + 1)?.count ?? 0),
  );
  const onDays = days.reduce((a, b) => a + b, 0);
  const active = Math.max(0, input.activeTargets ?? 0);
  return {
    waiting: Math.max(0, active - onDays),
    days,
    paid: Math.max(0, input.targetsConverted ?? 0),
    finished: Math.max(0, input.completedRelance ?? 0),
    inProgress: Math.max(active, onDays),
  };
}

/** "Jour 3 sur 7", or the J0 wording for someone not yet written to. */
export const dayLabel = (currentDay: number) =>
  currentDay <= 0 ? 'Premier message bientôt' : `Jour ${Math.min(currentDay, RELANCE_DAYS)} sur ${RELANCE_DAYS}`;

const TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** When the filleul's next message goes, in words. */
export function nextMessageLabel(nextMessageDue: string | undefined, now: Date = new Date()): string {
  if (!nextMessageDue) return '';
  const due = new Date(nextMessageDue);
  if (Number.isNaN(due.getTime())) return '';
  if (due.getTime() <= now.getTime()) return 'Envoi en cours';
  const dayDiff = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000);
  const at = TIME.format(due).replace(':', 'h');
  if (dayDiff === 0) return `Aujourd'hui à ${at}`;
  if (dayDiff === 1) return `Demain à ${at}`;
  if (dayDiff < 7) return `${WEEKDAY.format(due).replace(/^./, c => c.toUpperCase())} à ${at}`;
  return `Dans ${dayDiff} jours`;
}

export const EXIT_REASON_LABEL: Record<ExitReason, string> = {
  paid: 'A payé',
  completed_7days: '7 jours terminés',
  manual: 'Retiré',
  referrer_inactive: 'Parrain inactif',
  subscription_expired: 'Parrain inactif',
  email_suppressed: 'Email invalide',
  expired: 'Trop ancien',
};

// ---------------------------------------------------------------------------
// Campagnes de relance
// ---------------------------------------------------------------------------

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: 'live' | 'paused' | 'done' | 'stopped' | 'draft' }> = {
  active: { label: 'En cours', tone: 'live' },
  scheduled: { label: 'Programmée', tone: 'draft' },
  draft: { label: 'Pas lancée', tone: 'draft' },
  paused: { label: 'En pause', tone: 'paused' },
  completed: { label: 'Terminée', tone: 'done' },
  cancelled: { label: 'Arrêtée', tone: 'stopped' },
};

export type PeriodPreset = '30d' | '3m' | '6m' | 'all' | 'custom';

export const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: '30d', label: '30 derniers jours' },
  { value: '3m', label: '3 derniers mois' },
  { value: '6m', label: '6 derniers mois' },
  { value: 'all', label: 'Depuis toujours' },
  { value: 'custom', label: 'Choisir les dates' },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Registration window for a preset. Custom dates are inclusive days; the end
 * date covers the whole day. Missing custom bounds are left open.
 */
export function periodToRange(
  preset: PeriodPreset,
  now: Date = new Date(),
  custom: { from?: string; to?: string } = {},
): { registrationDateFrom?: string; registrationDateTo?: string } {
  const back = (days: number) => isoDay(new Date(now.getTime() - days * 86_400_000));
  switch (preset) {
    case '30d': return { registrationDateFrom: back(30) };
    case '3m': return { registrationDateFrom: back(91) };
    case '6m': return { registrationDateFrom: back(182) };
    case 'all': return {};
    case 'custom': return {
      ...(custom.from ? { registrationDateFrom: custom.from } : {}),
      ...(custom.to ? { registrationDateTo: `${custom.to}T23:59:59.999Z` } : {}),
    };
  }
}

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

export const defaultCampaignName = (now: Date = new Date()) => `Relance du ${SHORT_DATE.format(now)}`;

export interface OwnMessage {
  subject: string;
  text: string;
}

export interface CampaignDraft {
  name: string;
  period: PeriodPreset;
  customDates?: { from?: string; to?: string };
  countries: string[];
  skipAlreadyInRelance: boolean;
  /** Absent = SBC's own 7 messages. Keyed by day 1..7. */
  ownMessages?: Partial<Record<number, OwnMessage>>;
  /** Stop at what the credits cover, newest filleuls first. */
  fitBudget: boolean;
  /** Also send the SMS (Cameroonian parrains with SMS on and credits). */
  withSms: boolean;
}

export const DEFAULT_CAMPAIGN_DRAFT: CampaignDraft = { name: '', period: '3m', countries: [], skipAlreadyInRelance: true, fitBudget: true, withSms: true };

/**
 * How many filleuls a campaign will reach: everyone matching, or — when the
 * parrain keeps to their budget — what the credits cover after a month of
 * relance des nouveaux, which keeps running alongside.
 */
export const campaignReach = (count: number, budget: { maxTargets: number } | undefined, fitBudget: boolean) =>
  fitBudget && budget && count > budget.maxTargets ? budget.maxTargets : count;

/** The filter the campaign preview and creation both use. */
export function campaignFilter(draft: CampaignDraft, now: Date = new Date()) {
  return {
    ...periodToRange(draft.period, now, draft.customDates),
    ...(draft.countries.length ? { countries: draft.countries } : {}),
    excludeCurrentTargets: draft.skipAlreadyInRelance,
    // A campaign de relance is for filleuls who haven't paid. The old page also
    // offered "Abonnés", which re-contacted people who had already paid.
    subscriptionStatus: 'non-subscribed' as const,
  };
}

/**
 * The creation request. Only days the parrain actually wrote are sent; the
 * rest fall back to SBC's messages on the server.
 *
 * The server requires an English text for every custom day. The old page made
 * the parrain type both and silently dropped any day whose English was empty,
 * so a French-only message never went out. The French is used for both here.
 */
export function buildCampaignPayload(draft: CampaignDraft, now: Date = new Date(), maxTargets?: number): CreateCampaignRequest {
  const customMessages: CustomMessage[] = [];
  for (let day = 1; day <= RELANCE_DAYS; day++) {
    const m = draft.ownMessages?.[day];
    const text = m?.text.trim();
    if (!text) continue;
    customMessages.push({
      dayNumber: day,
      ...(m?.subject.trim() ? { subject: m.subject.trim() } : {}),
      messageTemplate: { fr: text, en: text },
    } as CustomMessage);
  }
  return {
    name: draft.name.trim() || defaultCampaignName(now),
    type: 'filtered',
    targetFilter: { ...campaignFilter(draft, now), ...(maxTargets ? { maxTargets } : {}) },
    // The sender sends a campaign's SMS only when it was created with them.
    channel: draft.withSms ? 'both' : 'email',
    ...(customMessages.length ? { customMessages } : {}),
  } as CreateCampaignRequest;
}

/** What a filleul's name looks like in a message, and what it is written as. */
export const MESSAGE_VARIABLES = [
  { label: 'Prénom du filleul', token: '{{name}}' },
  { label: 'Votre nom', token: '{{referrerName}}' },
] as const;

/** Server errors reach the page as-is; turn the known English ones into French. */
export function frenchError(message: string | undefined, fallback: string): string {
  if (!message) return fallback;
  const known: Array<[RegExp, string]> = [
    [/campaign not found/i, 'Campagne introuvable.'],
    [/network error|failed to fetch/i, 'Pas de connexion. Vérifiez votre réseau et réessayez.'],
    [/name and target filter are required/i, 'Il manque le nom ou le choix des filleuls.'],
    [/already (completed|cancelled)/i, 'Cette campagne est déjà terminée.'],
  ];
  for (const [re, fr] of known) if (re.test(message)) return fr;
  const asciiOnly = [...message].every(c => c.charCodeAt(0) < 128);
  return asciiOnly && /\b(the|is|not|failed|error)\b/i.test(message) ? fallback : message;
}

/** frenchError for whatever a `catch` receives. */
export const frenchErrorFrom = (err: unknown, fallback: string) =>
  frenchError(err instanceof Error ? err.message : undefined, fallback);

/** SMS relance is for Cameroonian parrains only (Rufus). Country is ISO-2, with a few legacy names. */
export const isCameroon = (country?: string | null) =>
  ['CM', 'CAMEROUN', 'CAMEROON'].includes((country ?? '').trim().toUpperCase());
