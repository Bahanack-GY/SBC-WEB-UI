import { useEffect } from 'react';
import type TrackerAPI from '@openreplay/tracker';

/**
 * Session replay (self-hosted OpenReplay) so that support can see what a member
 * saw when they declare a problem. See server `docs/support/OPENREPLAY.md`.
 *
 * - Records every signed-in member (decided 2026-11-18). Off unless
 *   VITE_OPENREPLAY_PROJECT_KEY and VITE_OPENREPLAY_INGEST are set at build time.
 * - Names, emails and phone numbers stay visible, on screen and in fields.
 * - Passwords and one-time codes are NEVER recorded: those fields carry
 *   `data-openreplay-hidden` (stable even when the eye icon turns a password into
 *   plain text), and `isSecretField` catches any field that was not marked.
 *   `sessionReplay.test.ts` fails if a password or code field is added without it.
 * - No request or response bodies, no headers.
 * - When a member opens a support request, `currentReplay()` is sent with it.
 */

type Tracker = Pick<TrackerAPI, 'start' | 'stop' | 'getSessionID' | 'getSessionURL'>;
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

let factory: Factory = async () => {
    const { default: OpenReplay, SanitizeLevel } = await import('@openreplay/tracker');
    return new OpenReplay({
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
        network: { capturePayload: false, ignoreHeaders: true, failuresOnly: false, sessionTokenHeader: false, captureInIframes: false },
        // Local http dev only; production is https.
        __DISABLE_SECURE_MODE: Boolean(import.meta.env.DEV),
    });
};

let tracker: Tracker | null = null;
let recordingFor: string | null = null;

export const sessionReplayConfigured = () => Boolean(PROJECT_KEY && INGEST);

/** Starts (or keeps) recording for this member. Never throws: replay must not break the app. */
export async function startSessionReplay(userId: string, configured = sessionReplayConfigured()): Promise<void> {
    if (!configured || !userId || recordingFor === userId) return;
    try {
        if (recordingFor) stopSessionReplay();
        tracker ??= await factory();
        recordingFor = userId;
        await tracker.start({ userID: userId });
    } catch {
        recordingFor = null;
    }
}

/** Stops at sign-out: the next member on the same device starts a new session. */
export function stopSessionReplay(): void {
    if (!tracker || !recordingFor) return;
    recordingFor = null;
    try { tracker.stop(); } catch { /* ignore */ }
}

/** The session to attach to a support request, opened at the current moment. */
export function currentReplay(): { sessionId: string; url: string } | undefined {
    if (!tracker || !recordingFor) return undefined;
    try {
        const sessionId = tracker.getSessionID();
        const url = tracker.getSessionURL({ withCurrentTime: true });
        return sessionId && url ? { sessionId: String(sessionId), url } : undefined;
    } catch {
        return undefined;
    }
}

/** Mounted once in the app: records while a member is signed in. */
export function useSessionReplay(userId: string | null | undefined): void {
    useEffect(() => {
        if (userId) void startSessionReplay(userId);
        else stopSessionReplay();
    }, [userId]);
}

/** For tests. */
export function setSessionReplayFactoryForTests(f: Factory | null): void {
    factory = f ?? factory;
    tracker = null;
    recordingFor = null;
}
