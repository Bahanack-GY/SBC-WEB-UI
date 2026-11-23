import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    CONTROL_PROMPT, SENSITIVE_ROUTES, assistOptions, attachAssist, blockRemoteControl, controlBlocked,
    isSensitiveRoute, resetRemoteAssistForTests, setAssistRoute, setGrantCheckerForTests, type RemoteControlLike,
} from './remoteAssist';

const flush = () => new Promise((r) => setTimeout(r, 0));

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/** Words that mark a screen where money leaves, a secret is typed or the account changes hands. */
const SENSITIVE_WORDS = /otp|password|mot-de-passe|retrait|withdraw|wallet|money|identite|mes-donnees|email|phone|verify|connexion|signup|sso|activation-balance|transaction|momo|crypto|authenticat/i;
/** Routes that contain such a word but only show information. Each needs a reason. */
const NOT_SENSITIVE: Record<string, string> = {
    '/aide/retraits': 'help page: lists the member’s withdrawals and their status, moves nothing',
    '/aide/retraits/:id': 'help page: one withdrawal’s status, moves nothing',
    '/events/votes/:txId': 'event vote receipt, read-only',
};

describe('remote control is refused on sensitive screens', () => {
    it('every app route that looks sensitive is on the blocklist (or explicitly exempted)', () => {
        const routes = [...src('src/App.tsx').matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
        expect(routes.length).toBeGreaterThan(50);
        const missing = routes.filter((r) => SENSITIVE_WORDS.test(r) && !(r in NOT_SENSITIVE) && !isSensitiveRoute(r.replace(/:\w+/g, 'x')));
        expect(missing).toEqual([]);
    });

    it('covers the screens named in the rule', () => {
        for (const p of ['/wallet', '/money', '/otp', '/withdrawal-otp-verification', '/change-password', '/reset-password', '/forgot-password',
            '/modifier-email', '/change-phone', '/aide/identite', '/signaler-un-probleme/identite/abc', '/mes-donnees', '/connexion', '/signup/formulaire']) {
            expect(isSensitiveRoute(p), p).toBe(true);
        }
        expect(isSensitiveRoute('/')).toBe(false);
        expect(isSensitiveRoute('/aide/demandes/42')).toBe(false);
        expect(isSensitiveRoute('/modifier-le-profil')).toBe(false); // its sensitive sheets block on their own
        expect(isSensitiveRoute('/walletx')).toBe(false);
        expect(SENSITIVE_ROUTES).toContain('/mes-donnees');
    });

    it('every sensitive sheet, gate and form blocks control while it is open', () => {
        const files = [
            'src/components/wallet/MomoChangeSheet.tsx',
            'src/components/wallet/CryptoWalletChangeSheet.tsx',
            'src/components/security/AuthenticatorSetupSheet.tsx',
            'src/components/security/VerifyEmailGate.tsx',
            'src/components/security/WithdrawalAppCodeForm.tsx',
            'src/components/UnifiedWithdrawalComponent.tsx',
            'src/pages/help/IdentityForm.tsx',
        ];
        expect(files.filter((f) => !/useBlockRemoteControl\(/.test(src(f)))).toEqual([]);
    });
});

describe('the guard around tracker-assist’s RemoteControl', () => {
    let granted = true;
    const asked: string[] = [];
    beforeEach(() => {
        granted = true; asked.length = 0;
        setGrantCheckerForTests(async (email) => { asked.push(email); return granted; });
    });
    afterEach(() => { resetRemoteAssistForTests(); setAssistRoute('/'); try { sessionStorage.clear(); } catch { /* ignore */ } });

    const fakeRc = () => {
        const rc: RemoteControlLike = {
            status: 0, agentID: null,
            requestControl: vi.fn((id: string) => { rc.agentID = id; rc.status = 2; }),
            releaseControl: vi.fn(() => { rc.status = 0; rc.agentID = null; }),
            reconnect: vi.fn(),
        };
        return rc;
    };
    /** An Assist instance with one agent connected (as the plugin keeps them). */
    const withAgent = (rc: RemoteControlLike | null = null) => {
        const a = { remoteControl: rc, agents: { 'agent-1': { agentInfo: { email: 'Awa@SBC.test' } } } as Record<string, { agentInfo?: { email?: string } }> };
        attachAssist(a);
        return a;
    };

    it('asks the member only when the desk opened assistance for that agent', async () => {
        const rc = fakeRc();
        const request = rc.requestControl;
        withAgent(rc);
        setAssistRoute('/aide/demandes');
        rc.requestControl('agent-1');
        await flush();
        expect(asked).toEqual(['Awa@SBC.test']);
        expect(request).toHaveBeenCalledWith('agent-1');
    });

    it('declines an agent without a desk grant, and one the plugin does not know', async () => {
        const rc = fakeRc();
        const request = rc.requestControl;
        const a = withAgent(rc);
        granted = false;
        rc.requestControl('agent-1');
        await flush();
        expect(request).not.toHaveBeenCalled();
        expect(rc.releaseControl).toHaveBeenCalledWith(true);
        granted = true;
        rc.requestControl('agent-unknown');
        await flush();
        expect(request).not.toHaveBeenCalled();
        expect(a.agents['agent-unknown']).toBeUndefined();
    });

    it('declines a request at once on a sensitive route, and after a reload does not resume control there', async () => {
        const rc = fakeRc();
        const request = rc.requestControl;
        const reconnect = rc.reconnect;
        withAgent(rc);
        setAssistRoute('/wallet');
        rc.requestControl('agent-1');
        await flush();
        expect(asked).toEqual([]);
        expect(request).not.toHaveBeenCalled();
        expect(rc.releaseControl).toHaveBeenCalledWith(true);
        sessionStorage.setItem('__openreplay_control_peer', 'agent-1');
        rc.reconnect(['agent-1']);
        await flush();
        expect(reconnect).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('__openreplay_control_peer')).toBeNull();
    });

    it('after a reload on an ordinary page, control resumes only while the grant is open', async () => {
        const rc = fakeRc();
        const reconnect = rc.reconnect;
        withAgent(rc);
        sessionStorage.setItem('__openreplay_control_peer', 'agent-1');
        granted = false;
        rc.reconnect(['agent-1']);
        await flush();
        expect(reconnect).not.toHaveBeenCalled();
        sessionStorage.setItem('__openreplay_control_peer', 'agent-1');
        granted = true;
        rc.reconnect(['agent-1']);
        await flush();
        expect(reconnect).toHaveBeenCalledWith(['agent-1']);
    });

    it('a sensitive sheet blocks too, until it closes', async () => {
        const rc = fakeRc();
        const request = rc.requestControl;
        withAgent(rc);
        setAssistRoute('/modifier-le-profil');
        const release = blockRemoteControl();
        expect(controlBlocked()).toBe(true);
        rc.requestControl('agent-1');
        await flush();
        expect(request).not.toHaveBeenCalled();
        release();
        release(); // idempotent
        expect(controlBlocked()).toBe(false);
        rc.requestControl('agent-1');
        await flush();
        expect(request).toHaveBeenCalledTimes(1);
    });

    it('a sensitive page reached while the grant is being checked still declines', async () => {
        const rc = fakeRc();
        const request = rc.requestControl;
        withAgent(rc);
        rc.requestControl('agent-1');
        setAssistRoute('/otp');
        await flush();
        expect(request).not.toHaveBeenCalled();
    });

    it('ends control already running when the member reaches a sensitive page, on any RemoteControl the plugin creates later', async () => {
        const a = withAgent(null);
        setAssistRoute('/');
        const rc = fakeRc();
        a.remoteControl = rc; // the plugin makes a new one at each socket connection
        rc.requestControl('agent-1');
        await flush();
        expect(rc.status).toBe(2);
        setAssistRoute('/otp');
        expect(rc.releaseControl).toHaveBeenCalled();
        expect(rc.status).toBe(0);
    });

    it('if the plugin’s internals ever change, assist is stopped on sensitive pages rather than left open', () => {
        const assist = { remoteControl: { something: 'else' } as unknown as RemoteControlLike, stop: vi.fn(), start: vi.fn() };
        attachAssist(assist);
        setAssistRoute('/wallet');
        expect(assist.stop).toHaveBeenCalledTimes(1);
        setAssistRoute('/');
        expect(assist.start).toHaveBeenCalledTimes(1);
    });

    it('the pinned tracker-assist still has the internals the guard relies on', () => {
        const pkg = JSON.parse(src('node_modules/@openreplay/tracker-assist/package.json'));
        expect(pkg.version).toBe('11.0.21');
        const rcSrc = src('node_modules/@openreplay/tracker-assist/lib/RemoteControl.js');
        for (const k of ['requestControl', 'releaseControl', 'reconnect', 'agentID', 'status']) expect(rcSrc).toContain(k);
        const aSrc = src('node_modules/@openreplay/tracker-assist/lib/Assist.js');
        expect(aSrc).toMatch(/this\.remoteControl\s*=\s*new RemoteControl/);
        expect(aSrc).toMatch(/this\.agents\[id\]\s*=\s*\{[\s\S]{0,200}agentInfo/);
    });
});

describe('what the member is asked', () => {
    it('remote control needs the member’s « Autoriser », in French, naming SBC support', () => {
        const o = assistOptions() as { controlConfirm: { text: string; confirmBtn: { innerHTML: string } }; ignoreAnonymous: boolean; callUITemplate: string };
        expect(o.controlConfirm.text).toBe(CONTROL_PROMPT);
        expect(CONTROL_PROMPT).toMatch(/support SBC/);
        expect(CONTROL_PROMPT).toMatch(/arrêter à tout moment/);
        expect(o.controlConfirm.confirmBtn.innerHTML).toBe('Autoriser');
        expect(o.ignoreAnonymous).toBe(true);
        // never fetched from a third party
        expect(o.callUITemplate.startsWith('/')).toBe(true);
    });

    it('calls and screen recording can only be declined', () => {
        const o = assistOptions() as Record<string, { confirmBtn: HTMLButtonElement; declineBtn: { innerHTML: string } }>;
        for (const k of ['callConfirm', 'recordingConfirm']) {
            expect(o[k].confirmBtn).toBeInstanceOf(HTMLButtonElement);
            expect(o[k].confirmBtn.style.display).toBe('none');
            expect(o[k].declineBtn.innerHTML).toBe('Refuser');
        }
    });

    it('the widget template has the ids the plugin looks for, in French', () => {
        const html = src('public/openreplay-assist.html');
        for (const id of ['or-assist', 'controls', 'end-call-btn', 'remote-control-row', 'end-control-btn']) expect(html).toContain(`id="${id}"`);
        expect(html).toContain('Arrêter le contrôle');
        expect(html).not.toMatch(/https?:\/\//);
    });
});
