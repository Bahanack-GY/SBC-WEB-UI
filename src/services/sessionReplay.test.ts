import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentReplay, isSecretField, setSessionReplayFactoryForTests, startSessionReplay, stopSessionReplay } from './sessionReplay';

const field = (html: string) => {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild!;
};

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) return sourceFiles(p);
        return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [p] : [];
    });
}

describe('session replay never records passwords or codes', () => {
    it('treats password and code fields as secret, and leaves email, name and phone visible', () => {
        expect(isSecretField(field('<input type="password">'))).toBe(true);
        // The eye icon turns a password into plain text: the marker still hides it.
        expect(isSecretField(field('<input type="text" data-openreplay-hidden="">'))).toBe(true);
        expect(isSecretField(field('<input type="text" autocomplete="one-time-code">'))).toBe(true);
        expect(isSecretField(field('<input type="text" autocomplete="new-password">'))).toBe(true);
        expect(isSecretField(field('<input type="text" placeholder="Votre mot de passe">'))).toBe(true);
        expect(isSecretField(field('<input type="text" placeholder="Entrez le code OTP">'))).toBe(true);

        expect(isSecretField(field('<input type="email" name="email">'))).toBe(false);
        expect(isSecretField(field('<input type="tel" placeholder="Ex: 675090755">'))).toBe(false);
        expect(isSecretField(field('<input type="text" name="firstName">'))).toBe(false);
        expect(isSecretField(field('<div>Mot de passe oublié ?</div>'))).toBe(false);
    });

    it('every password or code field in the app carries data-openreplay-hidden', () => {
        const missing: string[] = [];
        for (const file of sourceFiles(join(process.cwd(), 'src'))) {
            const src = readFileSync(file, 'utf8');
            for (const m of src.matchAll(/<input\b[\s\S]*?\/>/g)) {
                const tag = m[0];
                const secret = /['"]password['"]|one-time-code|otp/i.test(tag);
                if (secret && !tag.includes('data-openreplay-hidden')) {
                    missing.push(`${file.replace(process.cwd() + '/', '')}:${src.slice(0, m.index).split('\n').length}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });
});

describe('recording and the support request', () => {
    afterEach(() => setSessionReplayFactoryForTests(null));

    const fakeTracker = () => ({
        start: vi.fn(async () => ({ success: true }) as never),
        stop: vi.fn(() => undefined),
        getSessionID: vi.fn(() => '7712345678901234'),
        getSessionURL: vi.fn(() => 'https://replay.sbc.test/3/session/7712345678901234?jumpto=1'),
    });

    it('records while signed in, gives the session for a request, stops at sign-out', async () => {
        const t = fakeTracker();
        setSessionReplayFactoryForTests(async () => t);
        expect(currentReplay()).toBeUndefined();

        await startSessionReplay('u1', true);
        expect(t.start).toHaveBeenCalledWith({ userID: 'u1' });
        expect(currentReplay()).toEqual({ sessionId: '7712345678901234', url: 'https://replay.sbc.test/3/session/7712345678901234?jumpto=1' });
        expect(t.getSessionURL).toHaveBeenCalledWith({ withCurrentTime: true });

        await startSessionReplay('u1', true);
        expect(t.start).toHaveBeenCalledTimes(1);

        stopSessionReplay();
        expect(t.stop).toHaveBeenCalledTimes(1);
        expect(currentReplay()).toBeUndefined();
    });

    it('does nothing when the app is not configured, and a tracker failure never breaks the app', async () => {
        const t = fakeTracker();
        setSessionReplayFactoryForTests(async () => t);
        await startSessionReplay('u1', false);
        expect(t.start).not.toHaveBeenCalled();

        setSessionReplayFactoryForTests(async () => { throw new Error('blocked by an ad blocker'); });
        await expect(startSessionReplay('u2', true)).resolves.toBeUndefined();
        expect(currentReplay()).toBeUndefined();
    });
});
