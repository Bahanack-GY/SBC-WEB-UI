import type { ApiResponse } from '../../services/ApiResponse';

/*
 * Member side of SBC Support (« Aide »). Shapes follow
 * server/docs/support/CONTRACT.md §3.2; where the contract does not fix a
 * field, the readers below accept the usual variants (`_id`/`id`, …) so a
 * small backend difference degrades to a missing label, not a crash.
 */

// ---------- errors ----------

/** A refused support call, with what the page needs to word it. */
export class SupportError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

/** The `data` of a successful answer; throws a SupportError otherwise. */
export function unwrap<T>(res: ApiResponse): T {
    if (res.isSuccessByStatusCode && res.body?.success !== false) {
        return (res.body?.data ?? res.body) as T;
    }
    throw new SupportError(String(res.body?.message || res.message || ''), res.statusCode, res.body?.code);
}

export const isRateLimited = (e: unknown) =>
    e instanceof SupportError && (e.status === 429 || e.code === 'RATE_LIMITED');

/** What a limit means for the member, per action (contract: 20/day, 5/day, 10/h). */
const LIMIT_TEXT: Record<'assistant' | 'ticket' | 'activation' | 'default', string> = {
    assistant: 'Vous avez posé beaucoup de questions à l’assistant aujourd’hui. Il vous répondra de nouveau demain. En attendant, vous pouvez écrire à un agent.',
    ticket: 'Vous avez déjà envoyé plusieurs demandes aujourd’hui. Un agent va les traiter : suivez-les dans « Mes demandes ». Vous pourrez en créer une nouvelle demain.',
    activation: 'Vous avez fait plusieurs vérifications en peu de temps. Patientez une heure avant de réessayer : votre paiement continue d’être suivi.',
    default: 'Vous avez fait cette action trop souvent. Réessayez un peu plus tard.',
};

/** French, polite text for any failure of a support call. */
export function supportErrorText(e: unknown, action: keyof typeof LIMIT_TEXT = 'default'): string {
    if (isRateLimited(e)) return LIMIT_TEXT[action];
    if (e instanceof SupportError) {
        if (e.status === -1 || e.status === 0) return 'Pas de connexion. Vérifiez votre réseau et réessayez.';
        if (e.status === 401) return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
        if (e.status === 413) return 'Ce fichier est trop lourd (10 Mo au maximum).';
        if (e.status >= 500) return 'Le service d’aide ne répond pas pour le moment. Réessayez dans quelques minutes.';
        // The server's own French message for a 4xx (e.g. a refused file type).
        if (e.message && !/^(an |network|failed|the )/i.test(e.message)) return e.message;
    }
    return 'Quelque chose n’a pas marché. Réessayez dans un instant.';
}

// ---------- shapes ----------

export type ArticleRef = { slug: string; title: string; excerpt?: string; summary?: string };
export type KbCategory = { slug?: string; name?: string; title?: string; description?: string; articles?: ArticleRef[] };
export type ArticleMedia = { type: 'video' | 'pdf' | 'link'; url: string; title?: string };
export type Article = {
    slug: string; title: string; summary?: string; body?: string; content?: string;
    media?: ArticleMedia[]; videoUrl?: string; updatedAt?: string;
};
/** support-service config/guides.ts */
export type GuideAction = 'activation_check' | 'withdrawal_status' | 'ticket' | 'contact_change_self';
export type GuideNode = {
    id?: string;
    label?: string;
    title?: string;
    text?: string;
    action?: GuideAction;
    /** Ticket category for `action: 'ticket'`. */
    category?: string;
    /** Article slugs. */
    articles?: string[];
    children?: GuideNode[];
};

export type AssistantRoute = 'activation' | 'withdrawal' | 'ticket';
export type AssistantAnswer = {
    conversationId: string;
    answer: string;
    source: 'faq' | 'ai' | 'route';
    articles: ArticleRef[];
    route?: AssistantRoute;
    canEscalate: boolean;
};

export type Attachment = { id?: string; _id?: string; name?: string; filename?: string; mime?: string; mimeType?: string; size?: number; url?: string };
export type TicketMessage = {
    _id?: string;
    id?: string;
    /** support-service: `{ type: 'member'|'agent'|'assistant'|'system', name }`. */
    author?: string | { type?: string; name?: string | null };
    authorType?: string;
    authorName?: string;
    body?: string;
    message?: string;
    attachments?: Attachment[];
    createdAt?: string;
};
export type Ticket = {
    _id?: string;
    id?: string;
    number?: string | number;
    reference?: string;
    category?: string;
    subject?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    lastMessageAt?: string;
    messages?: TicketMessage[];
};

export type Payin = {
    sessionId: string;
    gateway?: string;
    amount?: number;
    currency?: string;
    status?: string;
    purpose?: string;
    createdAt?: string;
    gatewayRef?: string;
};
export type ActivationStatus = {
    activated?: boolean;
    subscription?: { active?: boolean; status?: string; type?: string } | null;
    subscriptions?: { status?: string; type?: string }[];
    payins?: Payin[];
};
export type CheckResult = {
    result: 'confirmed' | 'pending' | 'not_found' | 'failed' | 'provider_unavailable';
    ticketId?: string;
    ticket?: { _id?: string; id?: string };
    checkedAt?: string;
};

export type Withdrawal = {
    /** The withdrawal reference: support-service sends it as `id` (CONTRACT §3.2). */
    id?: string;
    /** Older name of the same reference, read only as a fallback. */
    transactionId?: string;
    amount?: number;
    currency?: string;
    status?: string;
    businessStatus?: string;
    /** The server's own plain-French wording, when it sends one. */
    statusLabel?: string;
    explanation?: string;
    method?: string;
    createdAt?: string;
    updatedAt?: string;
};

// ---------- readers ----------

export const idOf = (x: { _id?: string; id?: string } | null | undefined) => x?._id ?? x?.id ?? '';

export const asList = <T,>(data: unknown, ...keys: string[]): T[] => {
    if (Array.isArray(data)) return data as T[];
    if (data && typeof data === 'object') {
        for (const k of [...keys, 'items', 'results']) {
            const v = (data as Record<string, unknown>)[k];
            if (Array.isArray(v)) return v as T[];
        }
    }
    return [];
};

export const ticketRef = (t: Ticket) => {
    if (t.reference) return t.reference;
    if (t.number != null && t.number !== '') return /^\d+$/.test(String(t.number)) ? `#${t.number}` : String(t.number);
    return idOf(t) ? `#${idOf(t).slice(-6).toUpperCase()}` : '';
};

export const messageText = (m: TicketMessage) => m.body ?? m.message ?? '';
export const messageAuthor = (m: TicketMessage) =>
    (typeof m.author === 'object' && m.author ? m.author.type : m.author) ?? m.authorType ?? 'member';
export const messageAuthorName = (m: TicketMessage) =>
    (typeof m.author === 'object' && m.author ? m.author.name : null) ?? m.authorName ?? null;

export const isActivated = (s: ActivationStatus | null | undefined) =>
    !!s && (s.activated === true || s.subscription?.active === true || s.subscription?.status === 'active'
        || (Array.isArray(s.subscriptions) && s.subscriptions.some((x) => x?.status === 'active')));

// ---------- wording ----------

/** support-service TICKET_CATEGORIES keys, with the member's wording. */
export const TICKET_CATEGORIES: { value: string; label: string }[] = [
    { value: 'activation_paiement', label: 'Activation du compte, paiement' },
    { value: 'retrait', label: 'Retrait' },
    { value: 'compte_acces', label: 'Mon compte, accès, email ou téléphone' },
    { value: 'commissions', label: 'Commissions, filleuls' },
    { value: 'vues_whatsapp', label: 'Vues WhatsApp (Ads Network)' },
    { value: 'technique', label: 'Problème technique dans l’app' },
    { value: 'autre', label: 'Autre question' },
];
export const categoryLabel = (c?: string) => TICKET_CATEGORIES.find((x) => x.value === c)?.label ?? 'Demande';

/**
 * Ready-made requests, opened with `?categorie=<preset>` from the other help
 * screens. A plain category key works too.
 */
export const TICKET_PRESETS: Record<string, { category: string; subject: string; identity?: boolean }> = {
    activation: { category: 'activation_paiement', subject: 'Mon compte n’est pas activé après paiement' },
    retrait: { category: 'retrait', subject: 'Question sur mon retrait' },
    verification_identite: { category: 'compte_acces', subject: 'Je n’ai plus accès à mon email ou à mon téléphone', identity: true },
};

/** The category of a ticket opened from an assistant `route`. */
export const ROUTE_TO_CATEGORY: Record<AssistantRoute, string> = { activation: 'activation_paiement', withdrawal: 'retrait', ticket: 'autre' };

const TICKET_STATUS: Record<string, { label: string; tone: Tone }> = {
    // support-service TICKET_STATUSES
    nouveau: { label: 'Envoyée', tone: 'info' },
    ouvert: { label: 'En cours', tone: 'info' },
    en_attente_membre: { label: 'Votre réponse est attendue', tone: 'warning' },
    en_attente_interne: { label: 'En cours de vérification', tone: 'info' },
    resolu: { label: 'Résolue', tone: 'success' },
    ferme: { label: 'Fermée', tone: 'neutral' },
    new: { label: 'Envoyée', tone: 'info' },
    open: { label: 'Ouverte', tone: 'info' },
    assigned: { label: 'Prise en charge', tone: 'info' },
    in_progress: { label: 'En cours', tone: 'info' },
    pending: { label: 'En cours', tone: 'info' },
    waiting_agent: { label: 'En cours', tone: 'info' },
    waiting_member: { label: 'Votre réponse est attendue', tone: 'warning' },
    pending_member: { label: 'Votre réponse est attendue', tone: 'warning' },
    resolved: { label: 'Résolue', tone: 'success' },
    closed: { label: 'Fermée', tone: 'neutral' },
};
export const ticketStatus = (s?: string) => TICKET_STATUS[s ?? ''] ?? { label: 'En cours', tone: 'info' as Tone };
export const isTicketClosed = (s?: string) => s === 'ferme' || s === 'closed';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** Payment intent statuses (payment-service PaymentStatus) in plain French. */
export function payinStatus(s?: string): { label: string; tone: Tone } {
    switch ((s ?? '').toUpperCase()) {
        case 'SUCCEEDED': case 'CONFIRMED': return { label: 'Paiement reçu', tone: 'success' };
        case 'FAILED': case 'ERROR': return { label: 'Paiement échoué', tone: 'danger' };
        case 'CANCELED': case 'CANCELLED': return { label: 'Paiement annulé', tone: 'neutral' };
        case 'EXPIRED': return { label: 'Paiement expiré', tone: 'neutral' };
        case 'PENDING_USER_INPUT': return { label: 'Paiement non terminé', tone: 'neutral' };
        case 'PARTIALLY_PAID': return { label: 'Paiement incomplet', tone: 'warning' };
        default: return { label: 'En attente de confirmation', tone: 'warning' };
    }
}

/**
 * Withdrawal business statuses (contract §2.2, CdC §5) in plain French. The
 * server may send its own wording (`statusLabel`/`explanation`), used first.
 */
export function withdrawalStatus(w: Pick<Withdrawal, 'businessStatus' | 'status' | 'statusLabel' | 'explanation'>): { label: string; text: string; tone: Tone } {
    const key = (w.businessStatus ?? '').toUpperCase();
    const known: Record<string, { label: string; text: string; tone: Tone }> = {
        REQUESTED: { label: 'Code de confirmation attendu', tone: 'warning',
            text: 'Votre demande est enregistrée mais pas encore confirmée : saisissez le code reçu pour la valider. Sans ce code, rien ne part.' },
        PENDING_APPROVAL: { label: 'En attente de validation', tone: 'info',
            text: 'Votre retrait attend la validation de l’équipe SBC. Le montant est mis de côté sur votre solde pendant ce temps.' },
        RESERVED: { label: 'Montant réservé', tone: 'info',
            text: 'Le montant est mis de côté sur votre solde et le retrait va être envoyé à l’opérateur.' },
        SUBMITTED: { label: 'Envoyé à l’opérateur', tone: 'info',
            text: 'Votre retrait a été transmis à l’opérateur de paiement. Il arrive en général en quelques minutes, parfois quelques heures.' },
        PENDING: { label: 'En cours chez l’opérateur', tone: 'info',
            text: 'L’opérateur de paiement traite votre retrait. Vous recevrez une notification dès qu’il est terminé.' },
        SUCCEEDED: { label: 'Retrait effectué', tone: 'success',
            text: 'L’opérateur a confirmé l’envoi. Si vous ne voyez pas l’argent, vérifiez le numéro ou le compte de réception, puis créez une demande.' },
        FAILED: { label: 'Retrait échoué', tone: 'danger',
            text: 'L’opérateur a refusé ce retrait. Le montant n’a pas été envoyé et revient sur votre solde.' },
        CANCEL_REQUESTED: { label: 'Annulation en cours', tone: 'warning',
            text: 'L’annulation est demandée. Le montant reste réservé jusqu’à la confirmation de l’opérateur.' },
        CANCELLED: { label: 'Retrait annulé', tone: 'neutral',
            text: 'Ce retrait est annulé et le montant est revenu sur votre solde.' },
        REJECTED: { label: 'Retrait refusé', tone: 'neutral',
            text: 'L’équipe SBC n’a pas validé ce retrait. Rien n’a été envoyé et le montant est de nouveau disponible sur votre solde. Écrivez à un agent si vous ne comprenez pas pourquoi.' },
        EXPIRED: { label: 'Retrait expiré', tone: 'neutral',
            text: 'Ce retrait n’a pas été validé à temps. Rien n’a été envoyé et le montant est de nouveau disponible sur votre solde : vous pouvez refaire une demande.' },
        UNKNOWN: { label: 'Vérification en cours', tone: 'warning',
            text: 'L’opérateur ne nous a pas encore donné de réponse définitive. Votre argent n’est pas perdu : il reste réservé et un agent vérifie ce retrait. Vous n’avez rien à faire.' },
    };
    // An unknown status must never read as "on its way".
    const base = known[key] ?? { label: 'Statut à vérifier', tone: 'warning' as Tone,
        text: 'Nous n’avons pas pu lire le statut de ce retrait. Écrivez à un agent si vous avez un doute.' };
    return { label: w.statusLabel || base.label, text: w.explanation || base.text, tone: base.tone };
}

/** The withdrawal's reference, whichever name the server used. */
export const withdrawalRef = (w: Pick<Withdrawal, 'id' | 'transactionId'>) => w.id || w.transactionId || '';

export const money = (amount?: number, currency?: string) =>
    typeof amount === 'number' ? `${amount.toLocaleString('fr-FR')} ${!currency || currency === 'XAF' || currency === 'XOF' ? 'FCFA' : currency}` : '';

export const dateTimeFr = (iso?: string) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime())
        ? d.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : '';
};

// ---------- attachments ----------

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
export const ATTACHMENT_ACCEPT = ATTACHMENT_TYPES.join(',');

/** null when the file can be sent, else why not (in French). Checked again by the server. */
export function checkAttachment(file: File): string | null {
    const type = file.type || (/\.pdf$/i.test(file.name) ? 'application/pdf' : '');
    if (!ATTACHMENT_TYPES.includes(type)) {
        return `« ${file.name} » n’est pas accepté : envoyez une photo (JPG, PNG, WebP, HEIC) ou un PDF.`;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
        return `« ${file.name} » est trop lourd (${(file.size / 1024 / 1024).toFixed(1).replace('.', ',')} Mo) : 10 Mo au maximum.`;
    }
    if (file.size === 0) return `« ${file.name} » est vide.`;
    return null;
}

export const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;

/** Where a guided-path leaf sends the member. */
export function guideTarget(n: GuideNode): { to: string; label: string } | null {
    switch (n.action) {
        case 'activation_check': return ROUTE_TARGET.activation;
        case 'withdrawal_status': return ROUTE_TARGET.withdrawal;
        case 'contact_change_self': return { to: '/aide/contact', label: 'Changer mon email ou mon téléphone' };
        case 'ticket': return { to: `/aide/demandes/nouvelle${n.category ? `?categorie=${encodeURIComponent(n.category)}` : ''}`, label: 'Écrire à un agent' };
        default: return null;
    }
}

/** Where an assistant `route` sends the member. */
export const ROUTE_TARGET: Record<AssistantRoute, { to: string; label: string }> = {
    activation: { to: '/aide/activation', label: 'Vérifier mon paiement d’activation' },
    withdrawal: { to: '/aide/retraits', label: 'Voir l’état de mes retraits' },
    ticket: { to: '/aide/demandes/nouvelle', label: 'Écrire à un agent' },
};
