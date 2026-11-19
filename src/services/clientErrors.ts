import { getBaseUrl } from '../utils/apiHelpers';

/**
 * Reports the failed API calls the member's app hits (status 0 = unreachable, or
 * >= 400) to support-service (`POST /support/me/client-errors`), for the support
 * analytics: which calls fail, how often, how many members are touched.
 *
 * - Only for a signed-in member (the report is tied to the account).
 * - Not reported: 401 (an expired session is not a backend fault) and the report
 *   call itself.
 * - The same failure (method + path + status) counts once a minute: a page that
 *   retries every 5 s must not look like twelve incidents.
 * - Sent in batches (every 10 s or 20 errors, and when the page is left).
 * - Only the path (no query string, it can hold personal data), the status, and the
 *   server's error code/message; never a request body.
 */

export type ReportedError = { method: string; path: string; status: number; code?: string; message?: string; replay?: { sessionId: string; url: string } };

const ENDPOINT = '/support/me/client-errors';
const DEDUP_MS = 60_000;
const FLUSH_MS = 10_000;
const BATCH = 20;

let queue: ReportedError[] = [];
const lastSent = new Map<string, number>();
let timer: ReturnType<typeof setTimeout> | null = null;
let replayProvider: (() => { sessionId: string; url: string } | undefined) | null = null;
let originalFetch: typeof fetch | null = null;

/** The session recorder (OpenReplay), when present, gives the current session to link. */
export function setReplayProvider(fn: (() => { sessionId: string; url: string } | undefined) | null) {
    replayProvider = fn;
}

const token = () => { try { return localStorage.getItem('token'); } catch { return null; } };

/** Queues one failure; returns false when it is not reported (rules above). */
export function reportClientError(e: ReportedError, now = Date.now()): boolean {
    if (e.status === 401 || e.path.includes(ENDPOINT) || !e.path.includes('/api/')) return false;
    if (!token()) return false;
    const key = `${e.method} ${e.path} ${e.status}`;
    if (now - (lastSent.get(key) ?? -Infinity) < DEDUP_MS) return false;
    lastSent.set(key, now);
    queue.push({ ...e, replay: e.replay ?? replayProvider?.() });
    if (queue.length >= BATCH) void flushClientErrors();
    else if (!timer) timer = setTimeout(() => void flushClientErrors(), FLUSH_MS);
    return true;
}

export async function flushClientErrors(keepalive = false): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    const t = token();
    if (!queue.length || !t) return;
    const batch = queue.splice(0, BATCH);
    try {
        await (originalFetch ?? fetch)(`${getBaseUrl()}${ENDPOINT}`, {
            method: 'POST', keepalive,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({ errors: batch }),
        });
    } catch { /* best effort: never disturb the member */ }
    if (queue.length) timer = setTimeout(() => void flushClientErrors(), FLUSH_MS);
}

/** Watches every fetch of the app (once, at start). */
export function installClientErrorReporting(): void {
    if (originalFetch || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
        let path = '';
        try { path = new URL(url, window.location.origin).pathname; } catch { path = ''; }
        try {
            const res = await originalFetch!(input, init);
            if (res.status >= 400 && path.includes('/api/')) {
                void res.clone().json().then(
                    (j) => reportClientError({ method, path, status: res.status, code: typeof j?.code === 'string' ? j.code : undefined, message: typeof j?.message === 'string' ? j.message.slice(0, 300) : undefined }),
                    () => reportClientError({ method, path, status: res.status }),
                );
            }
            return res;
        } catch (err) {
            if (path.includes('/api/')) reportClientError({ method, path, status: 0, message: 'Serveur injoignable' });
            throw err;
        }
    };
    window.addEventListener('pagehide', () => void flushClientErrors(true));
}

/** For tests. */
export function resetClientErrorsForTests() {
    queue = [];
    lastSent.clear();
    if (timer) clearTimeout(timer);
    timer = null;
    replayProvider = null;
}
