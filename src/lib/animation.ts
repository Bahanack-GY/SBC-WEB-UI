import type { Tone } from './eventStatus';

/**
 * Words and tints for the « Animation & Engagement » module, shared by every
 * screen so a status reads the same on the organizer hub, the public page and
 * the live board.
 */

type Entry = { label: string; tone: Tone };

export const CHALLENGE_STATUS: Record<string, Entry> = {
    DRAFT: { label: 'Brouillon', tone: 'muted' },
    PROGRAMMED: { label: 'Programmé', tone: 'primary' },
    REGISTRATION_OPEN: { label: 'Inscriptions ouvertes', tone: 'accent' },
    REGISTRATION_CLOSED: { label: 'Inscriptions closes', tone: 'muted' },
    ACTIVE: { label: 'En cours', tone: 'primary' },
    VOTING_OPEN: { label: 'Votes ouverts', tone: 'success' },
    VOTING_CLOSED: { label: 'Votes clos', tone: 'muted' },
    RESULTS_PENDING: { label: 'Résultats en préparation', tone: 'accent' },
    COMPLETED: { label: 'Terminé', tone: 'success' },
    CANCELLED: { label: 'Annulé', tone: 'danger' },
};

export const CANDIDATE_STATUS: Record<string, Entry> = {
    PENDING: { label: 'En attente de validation', tone: 'accent' },
    APPROVED: { label: 'Validé', tone: 'success' },
    REJECTED: { label: 'Refusé', tone: 'danger' },
    DISQUALIFIED: { label: 'Disqualifié', tone: 'danger' },
    WITHDRAWN: { label: 'Retiré', tone: 'muted' },
};

export const VOTE_TX_STATUS: Record<string, Entry> = {
    PENDING: { label: 'Paiement en attente', tone: 'accent' },
    SUCCESS: { label: 'Votes crédités', tone: 'success' },
    FAILED: { label: 'Paiement échoué', tone: 'danger' },
    CANCELLED: { label: 'Annulé', tone: 'muted' },
    REFUNDED: { label: 'Remboursé', tone: 'danger' },
};

export const REWARD_STATUS: Record<string, Entry> = {
    DRAFT: { label: 'Brouillon', tone: 'muted' },
    ACTIVE: { label: 'Active', tone: 'success' },
    EXHAUSTED: { label: 'Épuisée', tone: 'muted' },
    CLOSED: { label: 'Close', tone: 'muted' },
    CANCELLED: { label: 'Annulée', tone: 'danger' },
};

export const WINNER_STATUS: Record<string, Entry> = {
    AWARDED: { label: 'À remettre', tone: 'accent' },
    DELIVERED: { label: 'Remise', tone: 'success' },
    FORFEITED: { label: 'Non réclamée', tone: 'muted' },
    REVOKED: { label: 'Annulée', tone: 'danger' },
};

export const info = (table: Record<string, Entry>, s?: string): Entry => (s && table[s]) || { label: s ?? '—', tone: 'muted' };

export const VOTING_MODES: { value: string; label: string; hint: string }[] = [
    { value: 'FREE', label: 'Votes gratuits', hint: 'Chaque membre a un quota de votes.' },
    { value: 'PAID', label: 'Votes payants', hint: 'Votes achetés par packs.' },
    { value: 'FREE_AND_PAID', label: 'Gratuits + payants', hint: 'Quota gratuit, puis packs.' },
    { value: 'JURY', label: 'Jury uniquement', hint: 'Seuls les jurés notent.' },
    { value: 'PUBLIC_AND_JURY', label: 'Public + jury', hint: 'Votes du public et notes du jury.' },
    { value: 'NONE', label: 'Sans vote', hint: 'Classement manuel ou animation sans vote.' },
];

export const PARTICIPATION_MODES = [
    { value: 'OPEN', label: 'Tout membre SBC' },
    { value: 'TICKET_HOLDERS', label: 'Détenteurs d’un billet' },
    { value: 'TICKET_TYPES', label: 'Certains types de billets' },
];

export const VOTER_SCOPES = [
    { value: 'ANY_SBC_USER', label: 'Tout membre SBC' },
    { value: 'TICKET_HOLDERS', label: 'Détenteurs d’un billet' },
    { value: 'TICKET_TYPES', label: 'Certains types de billets' },
];

export const TIE_RULES = [
    { value: 'EARLIEST_TO_REACH', label: 'Premier arrivé au score', hint: 'Automatique : celui qui a atteint le score en premier passe devant.' },
    { value: 'SPLIT_PRIZE', label: 'Partage du prix', hint: 'Les ex æquo partagent le rang et la récompense.' },
    { value: 'JURY_DECIDES', label: 'Le jury départage', hint: 'Le résultat attend la décision du jury.' },
    { value: 'ORGANIZER_DECIDES', label: 'L’organisateur départage', hint: 'Décision motivée, publiée avec le résultat.' },
    { value: 'SECOND_ROUND', label: 'Second tour', hint: 'Un nouveau vote entre les ex æquo.' },
];

export const REWARD_TYPES = [
    { value: 'CASH', label: 'Argent' }, { value: 'PRODUCT', label: 'Produit' }, { value: 'GIFT', label: 'Cadeau' },
    { value: 'VOUCHER', label: 'Bon d’achat' }, { value: 'TICKET', label: 'Billet' }, { value: 'SERVICE', label: 'Service' },
    { value: 'CUSTOM', label: 'Autre' },
];

export const RULE_KINDS = [
    { value: 'POSITION', label: 'À une position', hint: 'Ex. le 3e acheteur, le 50e participant.' },
    { value: 'PERIODIC', label: 'Périodique', hint: 'Ex. chaque 100e participant.' },
    { value: 'ACTION', label: 'Les premiers à agir', hint: 'Ex. les 10 premiers inscrits à un défi.' },
    { value: 'RANDOM_DRAW', label: 'Tirage au sort', hint: 'X gagnants parmi les personnes éligibles.' },
    { value: 'MANUAL', label: 'Attribution manuelle', hint: 'Vous choisissez le bénéficiaire.' },
];

export const RULE_TRIGGERS = [
    { value: 'TICKET_ORDER_PAID', label: 'achète un billet' },
    { value: 'CHECKED_IN', label: 'entre à l’événement (scan)' },
    { value: 'CHALLENGE_REGISTERED', label: 's’inscrit à un défi' },
    { value: 'CANDIDATE_APPROVED', label: 'voit sa candidature validée' },
    { value: 'VOTE_CAST', label: 'vote gratuitement' },
    { value: 'PAID_VOTE', label: 'achète des votes' },
];

export const ELIGIBILITY_SCOPES = [
    { value: 'ALL_PARTICIPANTS', label: 'Tous les participants' },
    { value: 'TICKET_HOLDERS', label: 'Détenteurs d’un billet' },
    { value: 'TICKET_TYPES', label: 'Certains types de billets' },
    { value: 'CHALLENGE_PARTICIPANTS', label: 'Candidats d’un défi' },
    { value: 'CHALLENGE_VOTERS', label: 'Votants d’un défi' },
];

const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`);

/** The rule in plain French, for the organizer's preview and the public page. */
export const describeRule = (r: { kind: string; trigger?: string; params?: any; eligibility?: any }, rewardName = 'la récompense') => {
    const who = ELIGIBILITY_SCOPES.find((e) => e.value === r.eligibility?.scope)?.label?.toLowerCase() ?? 'participant';
    const act = RULE_TRIGGERS.find((t) => t.value === r.trigger)?.label ?? '…';
    const p = r.params ?? {};
    switch (r.kind) {
        case 'POSITION': return `Le ${p.position ? ordinal(p.position) : '…'} qui ${act} gagne ${rewardName}.`;
        case 'PERIODIC': return `Chaque ${p.every ? ordinal(p.every) : '…'} qui ${act} gagne ${rewardName}.`;
        case 'ACTION': return `Les ${p.firstN ?? '…'} premiers qui ${act.replace(/^/, '')} gagnent ${rewardName}.`;
        case 'RANDOM_DRAW': return `Tirage au sort de ${p.winners ?? '…'} gagnant(s) parmi : ${who}${p.drawAt ? `, le ${new Date(p.drawAt).toLocaleString('fr-FR')}` : ''}.`;
        case 'MANUAL': return `L’organisateur choisit qui reçoit ${rewardName}${r.eligibility?.scope && r.eligibility.scope !== 'ALL_PARTICIPANTS' ? `, parmi : ${who}` : ''}.`;
        case 'CHALLENGE_RANK': return `Le classement ${p.rankFrom === p.rankTo ? `n°${p.rankFrom}` : `n°${p.rankFrom} à ${p.rankTo}`} du défi reçoit ${rewardName}.`;
        default: return '';
    }
};

/** <input type="datetime-local"> wants local time without zone. */
export const toLocalInput = (d?: string | Date | null) => {
    if (!d) return '';
    const date = new Date(d);
    const off = date.getTimezoneOffset();
    return new Date(date.getTime() - off * 60000).toISOString().slice(0, 16);
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);

export const fmtDateTime = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/** Human countdown, e.g. "2 j 4 h", "35 min". */
export const countdown = (to?: string | Date | null) => {
    if (!to) return '';
    const ms = new Date(to).getTime() - Date.now();
    if (ms <= 0) return '';
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} h ${m % 60} min`;
    return `${Math.floor(h / 24)} j ${h % 24} h`;
};

/** French messages for the server's error codes, when its own message isn't enough. */
export const errorMessage = (res: { message?: string; body?: any }) => {
    const code = res?.body?.code as string | undefined;
    const map: Record<string, string> = {
        QUOTA_EXHAUSTED: res?.body?.message || 'Vous avez utilisé vos votes gratuits.',
        RATE_LIMITED: 'Trop de votes en peu de temps. Patientez une minute.',
        VOTING_CLOSED: 'Les votes ne sont pas ouverts.',
        TICKET_REQUIRED: res?.body?.message || 'Réservé aux détenteurs d’un billet.',
        SELF_VOTE: 'Vous ne pouvez pas voter pour vous-même.',
    };
    return (code && map[code]) || res?.body?.message || res?.message || 'Une erreur est survenue.';
};

export const challengePath = (eventSlug: string, challengeSlug: string) => `/events/${eventSlug}/defis/${challengeSlug}`;
