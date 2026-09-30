/**
 * French labels for SBC Event statuses.
 *
 * The API speaks the technical enums from the spec (§30); the member-facing UI
 * must speak the words of §13 — VALIDÉ, UTILISÉ, ANNULÉ, REMBOURSÉ, EN REVENTE.
 * Every screen showing a status goes through here so the wording (and the tint)
 * stays identical across Mes billets, the ticket screen and the marketplace.
 */

export type Tone = 'success' | 'primary' | 'accent' | 'danger' | 'muted';

/** Token classes per tone — flat fills only, no shadows, per the design rules. */
export const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-ink',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-surface-2 text-ink-2',
};

type Entry = { label: string; tone: Tone };

const TICKET: Record<string, Entry> = {
  PENDING: { label: 'En attente', tone: 'muted' },
  ISSUED: { label: 'Validé', tone: 'primary' },
  CHECKED_IN: { label: 'Utilisé', tone: 'success' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
  REFUNDED: { label: 'Remboursé', tone: 'danger' },
  EXPIRED: { label: 'Expiré', tone: 'muted' },
};

const ORDER: Record<string, Entry> = {
  PENDING: { label: 'Paiement en attente', tone: 'accent' },
  PAID: { label: 'Payée', tone: 'success' },
  FAILED: { label: 'Échouée', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'muted' },
  REFUNDED: { label: 'Remboursée', tone: 'danger' },
};

const LISTING: Record<string, Entry> = {
  DRAFT: { label: 'Brouillon', tone: 'muted' },
  ACTIVE: { label: 'En vente', tone: 'accent' },
  SOLD: { label: 'Vendu', tone: 'success' },
  CANCELLED: { label: 'Retirée', tone: 'muted' },
  EXPIRED: { label: 'Expirée', tone: 'muted' },
  SUSPENDED: { label: 'Suspendue', tone: 'danger' },
};

const EVENT: Record<string, Entry> = {
  DRAFT: { label: 'Brouillon', tone: 'muted' },
  PUBLISHED: { label: 'Publié', tone: 'success' },
  SUSPENDED: { label: 'Suspendu', tone: 'danger' },
  CANCELLED: { label: 'Annulé', tone: 'danger' },
  COMPLETED: { label: 'Terminé', tone: 'muted' },
};

const DISPUTE: Record<string, Entry> = {
  OPEN: { label: 'Ouvert', tone: 'accent' },
  IN_REVIEW: { label: 'En cours d’examen', tone: 'primary' },
  RESOLVED: { label: 'Résolu', tone: 'success' },
  REJECTED: { label: 'Rejeté', tone: 'danger' },
};

const TABLES = { ticket: TICKET, order: ORDER, listing: LISTING, event: EVENT, dispute: DISPUTE };

/**
 * A status the UI can show. Unknown values fall back to the raw code rather
 * than an empty badge: a new backend enum should look odd, not invisible.
 */
export function statusInfo(kind: keyof typeof TABLES, status?: string): Entry {
  if (!status) return { label: '—', tone: 'muted' };
  return TABLES[kind][status] ?? { label: status, tone: 'muted' };
}

/** "EN REVENTE" wins over the ticket's own status wherever a ticket is listed (§13). */
export function ticketStatusInfo(status?: string, isListed?: boolean): Entry {
  return isListed ? { label: 'En revente', tone: 'accent' } : statusInfo('ticket', status);
}

/** 15000 -> "15 000 XAF". The spec prices everything in XAF/FCFA. */
export const xaf = (n?: number | null) =>
  typeof n === 'number' ? `${n.toLocaleString('fr-FR')} XAF` : '—';
