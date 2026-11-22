import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { fail, ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ supportIdentityLatest: vi.fn(), supportIdentitySubmit: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
// jsdom cannot decode images: the photo is passed through as is.
vi.mock('./identity', async (orig) => ({ ...(await orig<typeof import('./identity')>()), shrinkPhoto: async (f: File) => f }));

import HelpIdentity from './HelpIdentity';

const photo = (name: string) => new File([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], name, { type: 'image/jpeg' });
const open = (path: string) => renderPage(<Routes><Route path="/aide/identite" element={<HelpIdentity />} /><Route path="/aide/demandes/:id" element={<p>conversation</p>} /></Routes>, path);

beforeEach(() => {
    api.supportIdentityLatest.mockReset().mockResolvedValue(ok(null));
    api.supportIdentitySubmit.mockReset();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }));
});
afterEach(() => vi.unstubAllGlobals());

describe('identity check (KYC level 3), member', () => {
    it('without a reason in the link, asks why', async () => {
        open('/aide/identite');
        expect(await screen.findByRole('link', { name: /Débloquer mes retraits/ })).toHaveAttribute('href', '/aide/identite?motif=fraud_hold');
        expect(screen.getByRole('link', { name: /perdu le téléphone/ })).toHaveAttribute('href', '/aide/identite?motif=authenticator_reset');
        expect(screen.getByRole('link', { name: /perdu l’accès/ })).toHaveAttribute('href', '/aide/identite?motif=lost_access');
    });

    it('recto + selfie required, then sent with the reason; the status follows', async () => {
        const user = userEvent.setup();
        api.supportIdentitySubmit.mockResolvedValue(ok({ id: 'v1', purpose: 'fraud_hold', ticketId: 't1', status: 'pending', submittedAt: '2026-11-22T10:00:00Z', decidedAt: null }));
        open('/aide/identite?motif=fraud_hold');
        const send = await screen.findByRole('button', { name: 'Envoyer à l’équipe SBC' });
        expect(screen.getByText(/supprimées 30 jours après la décision/)).toBeInTheDocument();
        expect(screen.getByText(/jamais par WhatsApp/)).toBeInTheDocument();
        expect(send).toBeDisabled();
        await user.upload(screen.getByTestId('photo-id_front'), photo('recto.jpg'));
        expect(send).toBeDisabled();
        await user.upload(screen.getByTestId('photo-selfie'), photo('selfie.jpg'));
        expect(screen.getAllByText('Prête')).toHaveLength(2);
        await user.click(send);
        await waitFor(() => expect(api.supportIdentitySubmit).toHaveBeenCalledTimes(1));
        const arg = api.supportIdentitySubmit.mock.calls[0][0];
        expect(arg.purpose).toBe('fraud_hold');
        expect(Object.keys(arg.images).sort()).toEqual(['id_front', 'selfie']);
        expect(await screen.findByTestId('identity-status')).toHaveTextContent('Un agent SBC examine vos photos');
        expect(screen.getByRole('link', { name: 'Ouvrir ma demande' })).toHaveAttribute('href', '/aide/demandes/t1');
    });

    it('one already pending: the status, no form', async () => {
        api.supportIdentityLatest.mockResolvedValue(ok({ id: 'v1', purpose: 'fraud_hold', ticketId: 't1', status: 'pending', submittedAt: null, decidedAt: null }));
        open('/aide/identite?motif=fraud_hold');
        expect(await screen.findByText('Vérification en cours')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Envoyer à l’équipe SBC' })).toBeNull();
    });

    it('refused: new photos can be sent', async () => {
        const user = userEvent.setup();
        api.supportIdentityLatest.mockResolvedValue(ok({ id: 'v1', purpose: 'authenticator_reset', ticketId: 't1', status: 'refused', submittedAt: null, decidedAt: '2026-11-22T11:00:00Z' }));
        open('/aide/identite?motif=authenticator_reset');
        await user.click(await screen.findByRole('button', { name: 'Envoyer de nouvelles photos' }));
        expect(screen.getByRole('button', { name: 'Envoyer à l’équipe SBC' })).toBeInTheDocument();
    });

    it('a refusal from the server is shown in French', async () => {
        const user = userEvent.setup();
        api.supportIdentitySubmit.mockResolvedValue(fail(409, 'Une vérification d’identité est déjà en cours. Attendez la réponse de l’équipe.'));
        open('/aide/identite?motif=lost_access');
        await user.upload(await screen.findByTestId('photo-id_front'), photo('r.jpg'));
        await user.upload(screen.getByTestId('photo-selfie'), photo('s.jpg'));
        await user.click(screen.getByRole('button', { name: 'Envoyer à l’équipe SBC' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('déjà en cours');
    });
});
