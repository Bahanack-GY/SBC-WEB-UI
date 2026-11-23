import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { fail } from '../test/api';

/** Sign-in refused because the account is suspended (403 ACCOUNT_BANNED after a correct password). */

const api = vi.hoisted(() => ({
    loginUser: vi.fn(),
    checkRecoveryLogin: vi.fn(),
    logoutUser: vi.fn(),
    getUserProfile: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../utils/requestSigning', () => ({
    prepareSignInKey: vi.fn(async () => null),
    adoptSignInKey: vi.fn(async () => undefined),
    clearSessionKey: vi.fn(async () => undefined),
    ensureSessionKey: vi.fn(async () => undefined),
    retagKeyForCookieSession: vi.fn(async () => undefined),
}));

import { AuthProvider } from '../contexts/AuthContext';
import Connexion from './Connexion';

function Suspended() {
    const { state } = useLocation();
    return <div>Écran compte suspendu : {(state as { message?: string } | null)?.message}</div>;
}

const open = () => render(
    <AuthProvider>
        <MemoryRouter initialEntries={['/connexion']}>
            <Routes>
                <Route path="/connexion" element={<Connexion />} />
                <Route path="/compte-suspendu" element={<Suspended />} />
                <Route path="/" element={<div>Accueil</div>} />
            </Routes>
        </MemoryRouter>
    </AuthProvider>,
);

const signIn = async () => {
    await userEvent.type(screen.getByPlaceholderText('pages.connexion.emailOrPhonePlaceholder'), 'membre@gmail.com');
    await userEvent.type(screen.getByPlaceholderText('common.password'), 'motdepasse');
    await userEvent.click(screen.getByRole('button', { name: 'pages.connexion.connectButton' }));
};

beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
});

describe('login of a suspended account', () => {
    it('goes to /compte-suspendu with the server’s message, not an error under the password', async () => {
        api.loginUser.mockResolvedValue({ ...fail(403, 'Compte suspendu par la sécurité.'), body: { success: false, code: 'ACCOUNT_BANNED', message: 'Compte suspendu par la sécurité.' } });
        open();
        await signIn();
        expect(await screen.findByText('Écran compte suspendu : Compte suspendu par la sécurité.')).toBeInTheDocument();
        expect(api.checkRecoveryLogin).not.toHaveBeenCalled();
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('another 403 (anti-robot check) stays an error on the login page', async () => {
        api.loginUser.mockResolvedValue({ ...fail(403, 'Vérification anti-robot échouée.'), body: { success: false, code: 'ROBOT_CHECK_FAILED', message: 'Vérification anti-robot échouée.' } });
        open();
        await signIn();
        expect(await screen.findByText('Vérification anti-robot échouée.')).toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText(/Écran compte suspendu/)).toBeNull());
    });
});
