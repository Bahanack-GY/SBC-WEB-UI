import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { fail, ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({ deleteMyAccount: vi.fn(), getDataExportUrl: vi.fn(() => 'https://api.test/users/me/data-export') }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({
    user: null as Record<string, unknown> | null,
    updateProfile: vi.fn(),
    logout: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

import MyData from './MyData';

const user = userEvent.setup();

const renderMyData = () => renderPage(
    <Routes>
        <Route path="/mes-donnees" element={<MyData />} />
        <Route path="/connexion" element={<p>Page de connexion</p>} />
    </Routes>,
    '/mes-donnees',
);

beforeEach(() => {
    auth.user = {
        _id: 'u1', name: 'Awa', balance: 2500, shareContactInfo: true,
        consents: {
            privacy: { acceptedAt: '2026-11-08T10:00:00Z', version: '2026-11' },
            dataTransfer: { acceptedAt: '2026-11-08T10:00:00Z', version: '2026-11' },
        },
    };
    auth.updateProfile.mockResolvedValue(undefined);
    auth.logout.mockResolvedValue(undefined);
    api.deleteMyAccount.mockResolvedValue(ok(true));
});
afterEach(() => vi.unstubAllGlobals());

describe('Mes données personnelles (/mes-donnees)', () => {
    it('shows what the member accepted and when', () => {
        renderMyData();
        const accords = screen.getByRole('region', { name: 'Vos accords' });
        expect(accords).toHaveTextContent('Accepté le 8 novembre 2026 (version 2026-11)');
        expect(within(accords).getByText(/hors du Bénin/)).toBeInTheDocument();
    });

    it('deletes the account with the password, then logs out and goes to the login page', async () => {
        renderMyData();
        expect(screen.getByRole('region', { name: 'Supprimer mon compte' })).toHaveTextContent('Le solde de votre compte est perdu (2 500 FCFA)');
        await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
        const sheet = await screen.findByRole('dialog', { name: 'Supprimer votre compte ?' });
        await user.type(within(sheet).getByLabelText('Mot de passe'), 'motdepasse123');
        await user.click(within(sheet).getByRole('button', { name: 'Supprimer définitivement' }));

        await waitFor(() => expect(api.deleteMyAccount).toHaveBeenCalledWith('motdepasse123'));
        await waitFor(() => expect(auth.logout).toHaveBeenCalled());
        expect(await screen.findByText('Page de connexion')).toBeInTheDocument();
    });

    it('shows the server’s message on a wrong password and keeps the member logged in', async () => {
        api.deleteMyAccount.mockResolvedValueOnce(fail(400, 'Mot de passe incorrect.'));
        renderMyData();
        await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
        const sheet = await screen.findByRole('dialog', { name: 'Supprimer votre compte ?' });
        await user.type(within(sheet).getByLabelText('Mot de passe'), 'faux');
        await user.click(within(sheet).getByRole('button', { name: 'Supprimer définitivement' }));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('Mot de passe incorrect.');
        expect(auth.logout).not.toHaveBeenCalled();
    });

    it('asks for the password before calling the server', async () => {
        renderMyData();
        await user.click(screen.getByRole('button', { name: 'Supprimer mon compte' }));
        const sheet = await screen.findByRole('dialog', { name: 'Supprimer votre compte ?' });
        await user.click(within(sheet).getByRole('button', { name: 'Supprimer définitivement' }));
        expect(await within(sheet).findByRole('alert')).toHaveTextContent('Tapez votre mot de passe');
        expect(api.deleteMyAccount).not.toHaveBeenCalled();
    });

    it('takes the member out of the contacts file with the switch', async () => {
        renderMyData();
        const toggle = screen.getByRole('switch', { name: 'Partager mes coordonnées dans le fichier de contacts SBC' });
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        await user.click(toggle);
        await waitFor(() => expect(auth.updateProfile).toHaveBeenCalledWith({ shareContactInfo: false }));
        expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('downloads the data export with the login token', async () => {
        localStorage.setItem('token', 'tok');
        const fetchMock = vi.fn().mockResolvedValue(new Response('{"user":{}}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        const createObjectURL = vi.fn(() => 'blob:x');
        Object.assign(window.URL, { createObjectURL, revokeObjectURL: vi.fn() });
        let saved = '';
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { saved = this.download; });
        renderMyData();
        await user.click(screen.getByRole('button', { name: 'Télécharger mes données' }));
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('https://api.test/users/me/data-export', { headers: { Authorization: 'Bearer tok' } }));
        await waitFor(() => expect(saved).toBe('mes-donnees-sbc.json'));
        expect(await screen.findByText('Fichier enregistré : mes-donnees-sbc.json')).toBeInTheDocument();
        localStorage.removeItem('token');
    });
});
