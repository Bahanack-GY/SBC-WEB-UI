import { messageAuthor, type Attachment, type TicketMessage } from './support';

/**
 * Helpers for the request conversation, laid out like the chats members know
 * (WhatsApp): days, groups of messages from the same side, times, ticks.
 */

/** Body sent when the member sends only a photo or a PDF (the server needs a text). */
export const ATTACHMENT_ONLY_BODY = 'Pièce jointe';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

/** « Aujourd’hui », « Hier », the weekday within a week, else the date. */
export function dayLabel(iso: string | undefined, now = new Date()): string {
    const d = iso ? new Date(iso) : now;
    if (Number.isNaN(d.getTime())) return '';
    const diff = Math.round((startOfDay(now) - startOfDay(d)) / DAY);
    if (diff <= 0) return 'Aujourd’hui';
    if (diff === 1) return 'Hier';
    if (diff < 7) {
        const w = d.toLocaleDateString('fr-FR', { weekday: 'long' });
        return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}

/** « 14:32 ». */
export function timeLabel(iso: string | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export type Side = 'mine' | 'theirs' | 'system';
export const sideOf = (m: TicketMessage): Side => {
    const a = messageAuthor(m);
    return a === 'member' ? 'mine' : a === 'system' ? 'system' : 'theirs';
};

export type ChatRow<T> = { kind: 'day'; label: string; key: string } | { kind: 'message'; item: T; first: boolean; key: string };

/**
 * Inserts a day chip before each new day, and flags the first message of each run
 * from the same side (and same agent): only it gets the name and the bubble's tail.
 */
export function chatRows<T>(items: T[], at: (x: T) => string | undefined, who: (x: T) => string, keyOf: (x: T, i: number) => string, now = new Date()): ChatRow<T>[] {
    const rows: ChatRow<T>[] = [];
    let day = '';
    let prev = '';
    items.forEach((item, i) => {
        const d = dayLabel(at(item), now);
        if (d !== day) {
            rows.push({ kind: 'day', label: d, key: `day-${i}-${d}` });
            day = d;
            prev = '';
        }
        const w = who(item);
        rows.push({ kind: 'message', item, first: w !== prev, key: keyOf(item, i) });
        prev = w;
    });
    return rows;
}

export const isImage = (a: Attachment) => (a.mime ?? a.mimeType ?? '').startsWith('image/');

/** A member's message is read once an agent opened the request after it was sent. */
export const isReadBySupport = (createdAt: string | undefined, agentReadAt: string | null | undefined) =>
    Boolean(createdAt && agentReadAt && Date.parse(createdAt) <= Date.parse(agentReadAt));
