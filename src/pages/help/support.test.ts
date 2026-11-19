import { describe, expect, it } from 'vitest';
import { SupportError, checkAttachment, supportErrorText, unwrap, withdrawalStatus } from './support';
import { fail, ok } from '../../test/api';
import type { ApiResponse } from '../../services/ApiResponse';

const file = (name: string, type: string, size: number) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
};

describe('support helpers', () => {
    it('accepts images and PDFs up to 10 MB only', () => {
        expect(checkAttachment(file('a.png', 'image/png', 1000))).toBeNull();
        expect(checkAttachment(file('a.pdf', 'application/pdf', 10 * 1024 * 1024))).toBeNull();
        expect(checkAttachment(file('a.pdf', 'application/pdf', 10 * 1024 * 1024 + 1))).toMatch(/trop lourd/);
        expect(checkAttachment(file('a.exe', 'application/x-msdownload', 1000))).toMatch(/n’est pas accepté/);
        expect(checkAttachment(file('a.svg', 'image/svg+xml', 1000))).toMatch(/n’est pas accepté/);
    });

    it('unwraps data and turns refusals into SupportError', () => {
        expect(unwrap(ok({ a: 1 }) as unknown as ApiResponse)).toEqual({ a: 1 });
        expect(() => unwrap(fail(429, 'x') as unknown as ApiResponse)).toThrow(SupportError);
    });

    it('words errors in French', () => {
        expect(supportErrorText(new SupportError('', 503))).toMatch(/ne répond pas/);
        expect(supportErrorText(new SupportError('Too many', 429), 'ticket')).toMatch(/plusieurs demandes/);
        expect(supportErrorText(new SupportError('Ce fichier n’est pas accepté.', 400))).toBe('Ce fichier n’est pas accepté.');
    });

    it('explains every withdrawal business status', () => {
        for (const s of ['REQUESTED', 'PENDING_APPROVAL', 'RESERVED', 'SUBMITTED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'UNKNOWN']) {
            expect(withdrawalStatus({ businessStatus: s }).label).not.toBe('En cours');
        }
        // A refused, expired or unrecognised withdrawal never reads as "in progress".
        expect(withdrawalStatus({ businessStatus: 'REJECTED' }).label).toBe('Retrait refusé');
        expect(withdrawalStatus({ businessStatus: 'EXPIRED' }).text).toMatch(/de nouveau disponible/);
        expect(withdrawalStatus({ businessStatus: 'SOMETHING_NEW' }).label).toBe('Statut à vérifier');
        expect(withdrawalStatus({ businessStatus: 'UNKNOWN' }).text).toMatch(/n’est pas perdu/);
        expect(withdrawalStatus({ businessStatus: 'SUCCEEDED', statusLabel: 'Envoyé', explanation: 'Texte serveur' })).toMatchObject({ label: 'Envoyé', text: 'Texte serveur' });
    });
});
