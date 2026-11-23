import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    _resetBanReports, ACCOUNT_BANNED_EVENT, ACCOUNT_BANNED_PATH, AccountBannedError, BAN_MESSAGE_KEY, cleanBanMessage,
    goToAccountBanned, isAccountBanned, isAccountBannedBody, isAccountBannedError, reportAccountBanned, storedBanMessage,
} from './accountBanned';
import { _resetSession, isCookieSession, markCookieSession, refreshSession, SESSION_ENDED_EVENT } from '../../utils/session';
import { installDeviceSignals } from '../../utils/deviceSignals';
import { ApiService } from '../../services/ApiService';

const banned = { success: false, code: 'ACCOUNT_BANNED', message: 'Votre compte est suspendu.' };
const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let events: CustomEvent[] = [];
const onBanned = (e: Event) => events.push(e as CustomEvent);

beforeEach(() => {
    _resetBanReports();
    _resetSession();
    sessionStorage.clear();
    localStorage.clear();
    events = [];
    window.addEventListener(ACCOUNT_BANNED_EVENT, onBanned);
});
afterEach(() => window.removeEventListener(ACCOUNT_BANNED_EVENT, onBanned));

describe('a suspended account (403 ACCOUNT_BANNED)', () => {
    it('is recognised only from a 403 with that code', () => {
        expect(isAccountBanned({ statusCode: 403, body: banned } as never)).toBe(true);
        for (const code of ['RISK_HOLD', 'AUTHENTICATOR_REQUIRED', 'CSRF_FAILED', 'ROBOT_CHECK_FAILED', undefined]) {
            expect(isAccountBanned({ statusCode: 403, body: { success: false, code } } as never)).toBe(false);
        }
        expect(isAccountBanned({ statusCode: 401, body: banned } as never)).toBe(false);
        expect(isAccountBanned({ statusCode: 200, body: { ...banned, success: true } } as never)).toBe(false);
        expect(isAccountBanned(null)).toBe(false);
        expect(isAccountBannedBody(403, null)).toBe(false);
        expect(isAccountBannedBody(403, 'ACCOUNT_BANNED')).toBe(false);
        expect(ACCOUNT_BANNED_PATH).toBe('/compte-suspendu');
    });

    it('keeps the server’s message as plain text', () => {
        expect(cleanBanMessage('<b>Compte</b> <script>alert(1)</script>suspendu\n\n  ici')).toBe('Compte alert(1) suspendu ici');
        expect(cleanBanMessage({ html: 'x' })).toBe('');
        expect(cleanBanMessage('x'.repeat(2000))).toHaveLength(600);
    });

    it('reports once for a burst of refusals, and keeps the message for the page', () => {
        reportAccountBanned(banned.message);
        reportAccountBanned(banned.message);
        expect(events).toHaveLength(1);
        expect(events[0].detail).toEqual({ message: 'Votre compte est suspendu.' });
        expect(storedBanMessage()).toBe('Votre compte est suspendu.');
        expect(sessionStorage.getItem(BAN_MESSAGE_KEY)).toBe('Votre compte est suspendu.');
    });

    it('still works when sessionStorage throws (private mode)', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
        expect(() => reportAccountBanned('Suspendu')).not.toThrow();
        expect(events).toHaveLength(1);
        spy.mockRestore();
    });

    it('a screen that gets the refusal opens the page with the message', () => {
        const navigate = vi.fn();
        goToAccountBanned(navigate, '<i>Suspendu</i>');
        expect(navigate).toHaveBeenCalledWith('/compte-suspendu', { replace: true, state: { message: 'Suspendu' } });
        expect(events).toHaveLength(1);
    });

    it('AccountBannedError is recognised, other errors are not', () => {
        expect(isAccountBannedError(new AccountBannedError('x'))).toBe(true);
        expect(isAccountBannedError(new Error('Mot de passe ou email incorrect'))).toBe(false);
        expect(new AccountBannedError().message).toBe('Votre compte est suspendu.');
    });
});

describe('detection where the API answers are handled', () => {
    const realFetch = window.fetch;
    afterEach(() => { window.fetch = realFetch; });

    it('ApiService: any call refused with ACCOUNT_BANNED reports it; RISK_HOLD does not', async () => {
        const api = new ApiService();
        window.fetch = vi.fn(async () => json(403, banned)) as typeof window.fetch;
        const r = await api.get('/users/me', { skipDeduplication: true });
        expect(r.statusCode).toBe(403);
        expect(events).toHaveLength(1);

        _resetBanReports();
        events = [];
        window.fetch = vi.fn(async () => json(403, { success: false, code: 'RISK_HOLD', message: 'bloqué' })) as typeof window.fetch;
        await api.post('/withdrawals/user', { body: {} });
        expect(events).toHaveLength(0);
    });

    it('session refresh refused with ACCOUNT_BANNED: session flag dropped, ban reported, not « session expirée »', async () => {
        markCookieSession();
        let ended = 0;
        const onEnded = () => { ended += 1; };
        window.addEventListener(SESSION_ENDED_EVENT, onEnded);
        const ok = await refreshSession('/api', vi.fn(async () => json(403, banned)) as typeof fetch);
        window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
        expect(ok).toBe(false);
        expect(isCookieSession()).toBe(false);
        expect(events).toHaveLength(1);
        expect(ended).toBe(0);
    });

    it('session refresh refused with CSRF_FAILED is not a ban', async () => {
        markCookieSession();
        const ok = await refreshSession('/api', vi.fn(async () => json(403, { success: false, code: 'CSRF_FAILED' })) as typeof fetch);
        expect(ok).toBe(false);
        expect(isCookieSession()).toBe(true);
        expect(events).toHaveLength(0);
    });

    it('fetch wrapper: a hand-made call refused with ACCOUNT_BANNED reports it; other 403s do not', async () => {
        const answers = [json(403, { success: false, code: 'AUTHENTICATOR_REQUIRED' }), json(403, banned)];
        window.fetch = vi.fn(async () => answers.shift() ?? json(200, {})) as typeof window.fetch;
        installDeviceSignals();
        await window.fetch('/api/support/me/tickets');
        await new Promise(r => setTimeout(r, 0));
        expect(events).toHaveLength(0);
        await window.fetch('/api/support/me/tickets');
        await vi.waitFor(() => expect(events).toHaveLength(1));
    });
});
