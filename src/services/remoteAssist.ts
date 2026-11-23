import { useEffect, useSyncExternalStore } from 'react';

/**
 * Live assistance (OpenReplay Assist, self-hosted): a support agent can watch a signed-in
 * member's screen live and, only if the member accepts, take control of it to help.
 * See server `docs/support/OPENREPLAY.md` « Assistance en direct ».
 *
 * Rules (2026-11-23):
 * - Every remote-control request opens a French prompt naming SBC support; nothing happens
 *   without « Autoriser ». A banner stays on screen while control is active, with « Arrêter ».
 * - Calls and screen recording requests are refused: the prompt has no accept button.
 * - Remote control is never possible on a sensitive screen (money out, codes, passwords,
 *   contact or payout changes, authenticator setup, identity check, account deletion): a
 *   request there is refused at once, and control already running ends when the member
 *   reaches one. The agent can still watch; passwords and codes stay hidden (sessionReplay).
 * - Sensitive screens are either routes (SENSITIVE_ROUTES) or components that call
 *   `useBlockRemoteControl()` (sheets and gates shown on ordinary routes).
 *   `remoteAssist.test.ts` fails if a route that looks sensitive is not on the list.
 */

/** Routes where remote control is refused (prefix match on the path). */
export const SENSITIVE_ROUTES: readonly string[] = [
    // money out
    '/wallet', '/money', '/otp', '/withdrawal-otp-verification', '/transaction-confirmation', '/activation-balance',
    // codes and passwords
    '/verify-otp', '/verify-email-otp', '/connexion', '/signup', '/forgot-password', '/reset-password', '/change-password',
    // contact changes
    '/modifier-email', '/change-phone',
    // granting access to another app
    '/sso/authorize',
    // identity check (KYC level 3)
    '/aide/identite', '/signaler-un-probleme/identite',
    // data export, account deletion
    '/mes-donnees',
];

export function isSensitiveRoute(pathname: string): boolean {
    const p = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
    return SENSITIVE_ROUTES.some((r) => p === r || p.startsWith(`${r}/`));
}

// --- state shared with the banner ------------------------------------------------------

export type AssistState = {
    /** An agent is watching live. */
    watching: boolean;
    /** Remote control granted by the member and running. */
    controlled: boolean;
    agentName: string | null;
    /** Control was just ended because the member reached a sensitive screen. */
    endedForSafety: boolean;
};

let state: AssistState = { watching: false, controlled: false, agentName: null, endedForSafety: false };
const listeners = new Set<() => void>();
function setState(patch: Partial<AssistState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
}
export function useAssistState(): AssistState {
    return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

// --- what blocks control -----------------------------------------------------------------

let routeSensitive = false;
let blockers = 0;
export const controlBlocked = () => routeSensitive || blockers > 0;

/** Called on every route change. */
export function setAssistRoute(pathname: string): void {
    routeSensitive = isSensitiveRoute(pathname);
    enforce();
}

/** A sensitive component on screen (sheet, gate, form): no remote control while it is. */
export function blockRemoteControl(): () => void {
    blockers += 1;
    enforce();
    let done = false;
    return () => { if (!done) { done = true; blockers = Math.max(0, blockers - 1); } };
}

export function useBlockRemoteControl(active = true): void {
    useEffect(() => (active ? blockRemoteControl() : undefined), [active]);
}

// --- the tracker-assist plugin ---------------------------------------------------------

/** The RemoteControl object of @openreplay/tracker-assist 11.0.21 (pinned; checked by the test). */
export type RemoteControlLike = {
    status: number;
    agentID: string | null;
    requestControl: (id: string) => void;
    releaseControl: (isDenied?: boolean, keepId?: boolean, skipUpdate?: boolean) => void;
    reconnect: (ids: string[]) => void;
};
type AssistLike = { remoteControl?: RemoteControlLike | null; stop?: () => void; start?: () => void };

const RC_ENABLED = 2; // RCStatus.Enabled
const CONTROL_PEER_KEY = '__openreplay_control_peer';

let assist: AssistLike | null = null;
let stoppedForSafety = false;

function rcOf(a: AssistLike | null): RemoteControlLike | null {
    const rc = a?.remoteControl;
    return rc && typeof rc.requestControl === 'function' && typeof rc.releaseControl === 'function' && typeof rc.reconnect === 'function' ? rc : null;
}

/** Wraps a RemoteControl so it refuses requests (and resumes) while a sensitive screen is up. */
export function guardRemoteControl(rc: RemoteControlLike): RemoteControlLike {
    const marked = rc as RemoteControlLike & { __sbcGuarded?: boolean };
    if (marked.__sbcGuarded || !rcOf({ remoteControl: rc })) return rc; // unknown shape: enforce() stops assist
    const request = rc.requestControl;
    const reconnect = rc.reconnect.bind(rc);
    rc.requestControl = (id: string) => {
        if (controlBlocked()) {
            // Same answer as « Refuser »: the agent sees the request declined.
            rc.agentID = id;
            rc.releaseControl(true);
            return;
        }
        request(id);
    };
    rc.reconnect = (ids: string[]) => {
        // After a reload control resumes without asking again: never onto a sensitive screen.
        if (controlBlocked()) {
            try { sessionStorage.removeItem(CONTROL_PEER_KEY); } catch { /* ignore */ }
            return;
        }
        reconnect(ids);
    };
    marked.__sbcGuarded = true;
    return rc;
}

/** Takes the Assist instance returned by `tracker.use(trackerAssist(...))`. */
export function attachAssist(instance: unknown): void {
    assist = (instance ?? null) as AssistLike | null;
    if (!assist) return;
    // tracker-assist creates a new RemoteControl each time its socket connects: guard each one.
    let current = assist.remoteControl ?? null;
    if (current) guardRemoteControl(current);
    try {
        Object.defineProperty(assist, 'remoteControl', {
            configurable: true,
            get: () => current,
            set: (v: RemoteControlLike | null) => { current = v ? guardRemoteControl(v) : v; },
        });
    } catch { /* checked by enforce(): falls back to stopping assist */ }
    enforce();
}

/** Ends control now if a sensitive screen is up. If the plugin's internals changed, stops assist. */
function enforce(): void {
    if (!assist) return;
    const rc = rcOf(assist);
    if (controlBlocked()) {
        if (rc) {
            if (rc.status === RC_ENABLED) {
                rc.releaseControl();
                setState({ controlled: false, endedForSafety: true });
            }
        } else if (assist.remoteControl != null && !stoppedForSafety) {
            // Unknown plugin shape: never leave control possible on a sensitive screen.
            stoppedForSafety = true;
            try { assist.stop?.(); } catch { /* ignore */ }
        }
    } else if (stoppedForSafety) {
        stoppedForSafety = false;
        try { assist.start?.(); } catch { /* ignore */ }
    }
}

/** « Arrêter » in the banner. */
export function stopRemoteControl(): void {
    const rc = rcOf(assist);
    if (rc && rc.status === RC_ENABLED) rc.releaseControl();
    setState({ controlled: false });
}

export function dismissSafetyNotice(): void {
    setState({ endedForSafety: false });
}

const agentNameOf = (info: unknown): string | null => {
    const i = (info ?? {}) as Record<string, unknown>;
    const n = typeof i.name === 'string' ? i.name : typeof i.agentName === 'string' ? i.agentName : null;
    return n ? n.split(' ')[0] : null;
};

const PROMPT_STYLE = {
    fontFamily: 'inherit', fontSize: '15px', lineHeight: '1.45', maxWidth: '340px', borderRadius: '16px', padding: '20px',
};
const button = (label: string, primary: boolean) => ({
    innerHTML: label,
    style: primary
        ? { background: '#115CF6', color: '#fff', borderRadius: '12px', padding: '10px 16px', fontWeight: '600', border: 'none' }
        : { background: '#fff', color: '#1F2937', borderRadius: '12px', padding: '10px 16px', fontWeight: '600', border: '1px solid #D1D5DB' },
});
/** A prompt that can only be declined: the accept button exists for the plugin but is never shown. */
const refuseOnly = (text: string) => {
    const hidden = typeof document !== 'undefined' ? document.createElement('button') : undefined;
    if (hidden) hidden.style.display = 'none';
    return { text, style: PROMPT_STYLE, confirmBtn: hidden ?? button('', false), declineBtn: button('Refuser', false) };
};

export const CONTROL_PROMPT =
    'Le support SBC demande à prendre le contrôle de votre écran pour vous aider. '
    + 'L’agent pourra toucher et faire défiler à votre place. Il ne voit jamais vos mots de passe ni vos codes, '
    + 'et le contrôle est impossible sur les pages de retrait, de codes ou de changement de coordonnées. '
    + 'Vous pouvez arrêter à tout moment. Autoriser ?';

/** Options for `@openreplay/tracker-assist`. */
export function assistOptions(): Record<string, unknown> {
    return {
        // Live assistance only for signed-in members (found by their id from the desk).
        ignoreAnonymous: true,
        // Our own call/control widget (same origin, French): the plugin would otherwise fetch
        // its template from static.openreplay.com.
        callUITemplate: '/openreplay-assist.html',
        controlConfirm: { text: CONTROL_PROMPT, style: PROMPT_STYLE, confirmBtn: button('Autoriser', true), declineBtn: button('Refuser', false) },
        callConfirm: refuseOnly('Le support SBC ne passe pas d’appel par l’application. Pour parler à un agent, utilisez « Aide ».'),
        recordingConfirm: refuseOnly('L’enregistrement vidéo de votre écran n’est pas utilisé par le support SBC.'),
        onAgentConnect: (info: unknown) => {
            setState({ watching: true, agentName: agentNameOf(info) });
            return () => setState({ watching: false });
        },
        onRemoteControlStart: (info: unknown) => {
            if (controlBlocked()) {
                // Granted just as the member reached a sensitive screen: end it at once.
                queueMicrotask(() => stopRemoteControl());
            }
            setState({ controlled: true, agentName: agentNameOf(info), endedForSafety: false });
            return () => setState({ controlled: false });
        },
        onCallStart: () => () => undefined,
    };
}

/** For tests. */
export function resetRemoteAssistForTests(): void {
    assist = null;
    stoppedForSafety = false;
    routeSensitive = false;
    blockers = 0;
    state = { watching: false, controlled: false, agentName: null, endedForSafety: false };
}
