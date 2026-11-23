import { useEffect } from 'react';
import type TrackerAPI from '@openreplay/tracker';
import { setReplayProvider } from './clientErrors';
import { assistOptions, attachAssist } from './remoteAssist';

/**
 * Session replay (self-hosted OpenReplay) so that support can see what a member
 * saw when they declare a problem. See server `docs/support/OPENREPLAY.md`.
 *
 * - Records every visit from the moment the app opens (2026-11-23: every user action,
 *   signed-out pages included: sign-in, sign-up, forgotten password). The member's id is
 *   attached at sign-in (same recording) and on a restored session; signing out starts a new,
 *   anonymous recording. Off unless VITE_OPENREPLAY_PROJECT_KEY and VITE_OPENREPLAY_INGEST
 *   are set at build time.
 * - Live assistance (support watches, and controls only if the member accepts):
 *   `remoteAssist.ts`.
 * - Names, emails and phone numbers stay visible, on screen and in fields.
 * - Passwords and one-time codes are NEVER recorded: those fields carry
 *   `data-openreplay-hidden` (stable even when the eye icon turns a password into
 *   plain text), and `isSecretField` catches any field that was not marked.
 *   `sessionReplay.test.ts` fails if a password or code field is added without it.
 * - Backend errors are in the replay: every API call is listed (method, address,
 *   status, timing); a FAILED call (status 0 or >= 400) keeps its response body (the
 *   server's error message, cut to 4 KB) and is logged as a `backend_error` event
 *   (an « issue » for 5xx and unreachable server), searchable in OpenReplay. Request
 *   bodies are never kept (passwords and codes travel in them), nor any header but
 *   `x-request-id` (to find the server's log line).
 * - When a member opens a support request, `currentReplay()` is sent with it.
 */

type Tracker = Pick<TrackerAPI, 'start' | 'stop' | 'getSessionID' | 'getSessionURL' | 'setUserID'>;

/** What the tracker hands the network sanitizer for each fetch/XHR. */
type NetData = { readonly status: number; readonly method: string; url: string; request: { body: string | null; headers: Record<string, string> }; response: { body: unknown; headers: Record<string, string> } };
export type BackendError = { method: string; path: string; status: number; message: string | null; code: string | null; requestId: string | null };

const MAX_ERROR_BODY = 4000;

/**
 * Network sanitizer: keeps what helps understand a backend error, drops the rest.
 * `report` is called for each failed call to our API.
 */
export function sanitizeNetwork<T extends NetData>(d: T, report?: (e: BackendError) => void): T {
    const failed = d.status === 0 || d.status >= 400;
    const headers = d.response?.headers ?? {};
    const requestId = Object.entries(headers).find(([k]) => k.toLowerCase() === 'x-request-id')?.[1] ?? null;
    let body: unknown = failed ? d.response?.body ?? null : null;
    if (body != null && typeof body !== 'string') { try { body = JSON.stringify(body); } catch { body = null; } }
    if (typeof body === 'string' && body.length > MAX_ERROR_BODY) body = `${body.slice(0, MAX_ERROR_BODY)}…`;
    d.request = { body: null, headers: {} };
    d.response = { body, headers: requestId ? { 'x-request-id': requestId } : {} };
    if (failed && report) {
        let path = '';
        try { path = new URL(d.url, window.location.origin).pathname; } catch { path = ''; }
        if (path.includes('/api/')) {
            let message: string | null = null, code: string | null = null;
            try {
                const j = typeof body === 'string' ? JSON.parse(body) : null;
                message = typeof j?.message === 'string' ? j.message : typeof j?.error === 'string' ? j.error : null;
                code = typeof j?.code === 'string' ? j.code : null;
            } catch { message = typeof body === 'string' ? body.slice(0, 300) : null; }
            report({ method: d.method, path, status: d.status, message, code, requestId });
        }
    }
    return d;
}
type Factory = () => Promise<Tracker>;

const env = import.meta.env as Record<string, string | boolean | undefined>;
const PROJECT_KEY = typeof env.VITE_OPENREPLAY_PROJECT_KEY === 'string' ? env.VITE_OPENREPLAY_PROJECT_KEY : '';
const INGEST = typeof env.VITE_OPENREPLAY_INGEST === 'string' ? env.VITE_OPENREPLAY_INGEST : '';

const SECRET_AUTOCOMPLETE = /password|one-time-code/i;
const SECRET_NAME = /pass(word)?|mot.?de.?passe|otp|pin\b/i;

/** Password and code fields: their value must never leave the device. */
export function isSecretField(node: Element): boolean {
    if (node.tagName !== 'INPUT' && node.tagName !== 'TEXTAREA') return false;
    if (node.hasAttribute('data-openreplay-hidden')) return true;
    if (node.getAttribute('type') === 'password') return true;
    if (SECRET_AUTOCOMPLETE.test(node.getAttribute('autocomplete') ?? '')) return true;
    return ['name', 'id', 'aria-label', 'placeholder'].some((a) => SECRET_NAME.test(node.getAttribute(a) ?? ''));
}

const defaultFactory: Factory = async () => {
    const { default: OpenReplay, SanitizeLevel } = await import('@openreplay/tracker');
    const t: TrackerAPI = new OpenReplay({
        projectKey: PROJECT_KEY,
        ingestPoint: INGEST,
        // Visible: names, emails, phone numbers, amounts (on screen and in fields).
        defaultInputMode: 0,
        obscureTextEmails: false,
        obscureTextNumbers: false,
        obscureInputEmails: false,
        obscureInputNumbers: false,
        obscureInputDates: false,
        // Never: passwords and codes. Hidden beats every other setting.
        domSanitizer: (node: Element) => (isSecretField(node) ? SanitizeLevel.Hidden : SanitizeLevel.Plain),
        network: {
            capturePayload: true, // trimmed by sanitizeNetwork: only failed responses keep a body
            ignoreHeaders: ['Cookie', 'Set-Cookie', 'Authorization'],
            failuresOnly: false, sessionTokenHeader: false, captureInIframes: false,
            // An « issue » for server errors and an unreachable server; an event for the others.
            sanitizer: (d) => sanitizeNetwork(d, (e) => { if (firstThisMinute(e)) t.event('backend_error', e, e.status === 0 || e.status >= 500); }),
        },
        // Local http dev only; production is https.
        __DISABLE_SECURE_MODE: Boolean(import.meta.env.DEV),
    });
    try {
        const { default: trackerAssist } = await import('@openreplay/tracker-assist');
        attachAssist(t.use(trackerAssist(assistOptions() as never)));
    } catch { /* live assistance is optional; recording goes on */ }
    return t;
};
let factory: Factory = defaultFactory;

let tracker: Tracker | null = null;
let started = false;
/** The member the current recording belongs to (null = not signed in). */
let recordingFor: string | null = null;

/** A page retrying every 5 s must show one error a minute in the replay, not twelve. */
const lastEvent = new Map<string, number>();
export function firstThisMinute(e: BackendError, now = Date.now()): boolean {
    const key = `${e.method} ${e.path} ${e.status}`;
    if (now - (lastEvent.get(key) ?? -Infinity) < 60_000) return false;
    lastEvent.set(key, now);
    return true;
}

export const sessionReplayConfigured = () => Boolean(PROJECT_KEY && INGEST);

/**
 * Keeps the recording in step with who is signed in. Never throws: replay must not break the app.
 * - first call: starts recording (with the member's id when signed in);
 * - signed out → signed in: the same recording gets the member's id (the sign-in is in it);
 * - another member, or sign-out: a new recording starts.
 */
export async function startSessionReplay(userId: string | null, configured = sessionReplayConfigured()): Promise<void> {
    if (!configured) return;
    const id = userId || null;
    try {
        tracker ??= await factory();
        if (!started) {
            started = true;
            recordingFor = id;
            await tracker.start(id ? { userID: id } : {});
        } else if (id === recordingFor) {
            return;
        } else if (recordingFor === null && id) {
            recordingFor = id;
            tracker.setUserID(id);
        } else {
            try { tracker.stop(); } catch { /* ignore */ }
            recordingFor = id;
            await tracker.start(id ? { userID: id } : {});
        }
        // The support analytics' error reports link to this session.
        setReplayProvider(currentReplay);
    } catch {
        started = false;
        recordingFor = null;
    }
}

/** Stops recording altogether (tests; the app itself restarts anonymously at sign-out). */
export function stopSessionReplay(): void {
    if (!tracker || !started) return;
    started = false;
    recordingFor = null;
    setReplayProvider(null);
    try { tracker.stop(); } catch { /* ignore */ }
}

/** The session to attach to a support request, opened at the current moment. */
export function currentReplay(): { sessionId: string; url: string } | undefined {
    if (!tracker || !started) return undefined;
    try {
        const sessionId = tracker.getSessionID();
        const url = tracker.getSessionURL({ withCurrentTime: true });
        return sessionId && url ? { sessionId: String(sessionId), url } : undefined;
    } catch {
        return undefined;
    }
}

/** Mounted once in the app: records from the start, with the member's id once signed in. */
export function useSessionReplay(userId: string | null | undefined, ready = true): void {
    useEffect(() => {
        if (ready) void startSessionReplay(userId ?? null);
    }, [userId, ready]);
}

/** For tests. */
export function setSessionReplayFactoryForTests(f: Factory | null): void {
    factory = f ?? defaultFactory;
    tracker = null;
    started = false;
    recordingFor = null;
}
