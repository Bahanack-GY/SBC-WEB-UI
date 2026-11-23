/**
 * A suspended (banned) account. The server bans a member automatically when someone with no
 * filleuls tries to withdraw money their records cannot explain, ends their sessions, and from
 * then on refuses their requests with
 *   HTTP 403 { success: false, code: 'ACCOUNT_BANNED', message: '<French text>' }
 * (the withdrawal itself, login after a correct password, session refresh, /users/me and the
 * other member routes).
 *
 * The app then forgets the session on this device and shows /compte-suspendu
 * (pages/AccountSuspended.tsx), a public page that calls no member route, so it cannot loop.
 * Detection: ApiService (every SBCApiService call), the fetch wrapper (hand-made fetches,
 * utils/deviceSignals.ts) and the session refresh (utils/session.ts) call `reportAccountBanned`,
 * which dispatches ACCOUNT_BANNED_EVENT: AuthContext clears the local session, App navigates.
 * Other 403 codes (RISK_HOLD, AUTHENTICATOR_REQUIRED, CSRF_FAILED…) are not bans.
 */
import type { ApiResponse } from '../../services/ApiResponse';

export const ACCOUNT_BANNED_CODE = 'ACCOUNT_BANNED';
export const ACCOUNT_BANNED_PATH = '/compte-suspendu';
export const ACCOUNT_BANNED_EVENT = 'sbc:account-banned';
/** The server's text, kept for the page across a reload (sessionStorage: this tab only). */
export const BAN_MESSAGE_KEY = 'sbcAccountBannedMessage';

const MAX_MESSAGE = 600;

/** A 403 whose body says ACCOUNT_BANNED. Nothing else counts. */
export function isAccountBannedBody(status: number | null | undefined, body: unknown): boolean {
    return status === 403 && !!body && typeof body === 'object' && (body as { code?: unknown }).code === ACCOUNT_BANNED_CODE;
}

export const isAccountBanned = (r: Pick<ApiResponse, 'statusCode' | 'body'> | null | undefined): boolean =>
    !!r && isAccountBannedBody(r.statusCode, r.body);

/** Plain text only: tags dropped, whitespace collapsed, length capped. Empty when unusable. */
export function cleanBanMessage(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    return raw
        .replace(/<[^>]*>/g, ' ')
        .replace(/\p{Cc}/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_MESSAGE);
}

export function rememberBanMessage(raw: unknown): void {
    const message = cleanBanMessage(raw);
    if (!message) return;
    try { sessionStorage.setItem(BAN_MESSAGE_KEY, message); } catch { /* private mode: the router state still carries it */ }
}

export function storedBanMessage(): string {
    try { return cleanBanMessage(sessionStorage.getItem(BAN_MESSAGE_KEY)); } catch { return ''; }
}

export function forgetBanMessage(): void {
    try { sessionStorage.removeItem(BAN_MESSAGE_KEY); } catch { /* ignore */ }
}

export type AccountBannedDetail = { message: string };

let lastReport = 0;

/**
 * The server says this account is suspended: keep its message and tell the app (AuthContext
 * forgets the session, App shows /compte-suspendu). Several refused calls at once make one event.
 */
export function reportAccountBanned(raw?: unknown): void {
    const message = cleanBanMessage(raw);
    if (message) rememberBanMessage(message);
    const now = Date.now();
    if (now - lastReport < 1500) return;
    lastReport = now;
    try {
        window.dispatchEvent(new CustomEvent<AccountBannedDetail>(ACCOUNT_BANNED_EVENT, { detail: { message: message || storedBanMessage() } }));
    } catch { /* no window */ }
}

/** Thrown by AuthContext.login when the sign-in is refused with ACCOUNT_BANNED. */
export class AccountBannedError extends Error {
    readonly code = ACCOUNT_BANNED_CODE;
    constructor(message?: unknown) {
        super(cleanBanMessage(message) || 'Votre compte est suspendu.');
        this.name = 'AccountBannedError';
    }
}

export const isAccountBannedError = (e: unknown): e is AccountBannedError =>
    e instanceof AccountBannedError || (!!e && typeof e === 'object' && (e as { code?: unknown }).code === ACCOUNT_BANNED_CODE);

/** Router state for /compte-suspendu. */
export const bannedState = (message?: unknown) => ({ message: cleanBanMessage(message) });

type NavigateLike = (to: string, options: { replace: boolean; state: { message: string } }) => void;

/**
 * A screen got the refusal itself (a withdrawal): forget the session (event) and open
 * /compte-suspendu at once, whatever else is on screen (no toast, no modal).
 */
export function goToAccountBanned(navigate: NavigateLike, raw?: unknown): void {
    reportAccountBanned(raw);
    navigate(ACCOUNT_BANNED_PATH, { replace: true, state: bannedState(raw || storedBanMessage()) });
}

/** For tests. */
export const _resetBanReports = () => { lastReport = 0; };
