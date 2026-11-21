import { getBaseUrl } from '../../utils/apiHelpers';
import { SupportError, type Ticket } from './support';

/**
 * A request sent without an account (« Signaler un problème » signed out). The person
 * chats with the agent like a member; the request's key (support-service
 * `x-support-guest-key`) is kept on this device, and the agent's reply emails carry
 * a link that reopens the chat from another one.
 */

export type GuestRequest = { id: string; number: string; key: string; at: string };

export const GUEST_REQUESTS_KEY = 'sbcSupportGuestRequests';

export function guestRequests(): GuestRequest[] {
    try {
        const v = JSON.parse(localStorage.getItem(GUEST_REQUESTS_KEY) ?? '[]');
        return Array.isArray(v) ? v.filter((r) => r && typeof r.id === 'string' && typeof r.key === 'string') : [];
    } catch {
        return [];
    }
}

export function rememberGuestRequest(r: Omit<GuestRequest, 'at'> & { at?: string }): void {
    const list = guestRequests().filter((x) => x.id !== r.id);
    list.unshift({ ...r, at: r.at ?? new Date().toISOString() });
    try { localStorage.setItem(GUEST_REQUESTS_KEY, JSON.stringify(list.slice(0, 10))); } catch { /* private mode: the email link still works */ }
}

export const guestKeyFor = (id: string) => guestRequests().find((r) => r.id === id)?.key ?? null;

/** Calls support-service `/public/tickets/:id…` with the request's key. */
async function call<T>(id: string, key: string, path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
        res = await fetch(`${getBaseUrl()}/support/public/tickets/${encodeURIComponent(id)}${path}`, {
            ...init,
            // Authorization is allowed by every CORS setup; a custom header would need the gateway's list.
            headers: { Authorization: `SupportKey ${key}`, ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
        });
    } catch {
        throw new SupportError('', 0);
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.success === false) throw new SupportError(String(json?.message ?? ''), res.status, json?.code);
    return (json?.data ?? json) as T;
}

export const guestApi = {
    ticket: (id: string, key: string) => call<Ticket>(id, key, ''),
    reply: (id: string, key: string, body: { message: string; attachmentIds: string[] }) =>
        call<Ticket>(id, key, '/messages', { method: 'POST', body: JSON.stringify(body) }),
    close: (id: string, key: string) => call<{ ok: boolean }>(id, key, '/close', { method: 'POST' }),
    upload: async (id: string, key: string, file: File) => {
        const form = new FormData();
        form.append('file', file);
        return call<{ id: string }>(id, key, '/attachments', { method: 'POST', body: form });
    },
    realtimeToken: (id: string, key: string) => call<{ enabled: boolean; url?: string; room?: string; token?: string }>(id, key, '/realtime/token'),
};
