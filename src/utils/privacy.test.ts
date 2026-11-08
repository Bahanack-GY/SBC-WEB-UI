import { beforeEach, describe, expect, it } from 'vitest';
import { isBenin, isConsentFreePath, needsConsent, STORAGE_MAX_AGE_MS, sweepExpiredStorage } from './privacy';

const record = (version: string) => ({ acceptedAt: '2026-11-08T10:00:00Z', version });

describe('needsConsent', () => {
    it('recognises Benin by code or name', () => {
        for (const c of ['BJ', 'bj', 'Benin', 'Bénin', ' BÉNIN ']) expect(isBenin(c), c).toBe(true);
        for (const c of ['CM', 'Cameroun', '', null, undefined]) expect(isBenin(c), String(c)).toBe(false);
    });

    it('for a Benin member: needed without consents, with an older policy, or without the transfer agreement', () => {
        const country = 'BJ';
        expect(needsConsent({ country })).toBe(true);
        expect(needsConsent({ country, consents: { privacy: record('2026-01'), dataTransfer: record('2026-01') } })).toBe(true);
        expect(needsConsent({ country, consents: { privacy: record('2026-11') } })).toBe(true);
        expect(needsConsent({ country, consents: { privacy: record('2026-11'), dataTransfer: record('2026-11') } })).toBe(false);
    });

    it('is never needed outside Benin, nor when the country is unknown', () => {
        expect(needsConsent({ country: 'CM' })).toBe(false);
        expect(needsConsent({ country: 'CI', consents: { privacy: record('2026-01') } })).toBe(false);
        expect(needsConsent({})).toBe(false);
        expect(needsConsent(null)).toBe(false);
    });

    it('never covers the legal texts, the sign-up, the code screen, SSO, sales pages and /mes-donnees', () => {
        for (const p of ['/confidentialite', '/conditions', '/mentions-legales', '/signup', '/signup/formulaire', '/otp', '/sso/authorize', '/p/awa237', '/mes-donnees']) {
            expect(isConsentFreePath(p), p).toBe(true);
        }
        expect(isConsentFreePath('/')).toBe(false);
        expect(isConsentFreePath('/abonnement')).toBe(false);
    });
});

describe('sweepExpiredStorage', () => {
    beforeEach(() => localStorage.clear());

    it('keeps everything for 60 days, then wipes all but the login token', () => {
        const start = Date.parse('2026-11-01T00:00:00Z');
        sweepExpiredStorage(start);
        localStorage.setItem('token', 'tok');
        localStorage.setItem('language', 'fr');
        localStorage.setItem('seenTours', '["home"]');

        sweepExpiredStorage(start + STORAGE_MAX_AGE_MS - 1);
        expect(localStorage.getItem('seenTours')).toBe('["home"]');

        sweepExpiredStorage(start + STORAGE_MAX_AGE_MS);
        expect(localStorage.getItem('seenTours')).toBeNull();
        expect(localStorage.getItem('language')).toBeNull();
        expect(localStorage.getItem('token')).toBe('tok');

        // The count restarts.
        localStorage.setItem('seenTours', '["home"]');
        sweepExpiredStorage(start + STORAGE_MAX_AGE_MS + 1000);
        expect(localStorage.getItem('seenTours')).toBe('["home"]');
    });
});
