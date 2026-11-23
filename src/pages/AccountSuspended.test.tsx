import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { BAN_MESSAGE_KEY } from '../components/security/accountBanned';

const auth = vi.hoisted(() => ({ forgetSession: vi.fn(), logout: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

import AccountSuspended from './AccountSuspended';

const open = (state?: unknown) => render(
    <MemoryRouter initialEntries={[{ pathname: '/compte-suspendu', state }]}>
        <Routes>
            <Route path="/compte-suspendu" element={<AccountSuspended />} />
            <Route path="/connexion" element={<div>Page de connexion</div>} />
            <Route path="/signaler-un-probleme" element={<div>Formulaire support</div>} />
        </Routes>
    </MemoryRouter>,
);

const fetchSpy = vi.fn();
const realFetch = window.fetch;
afterEach(() => { window.fetch = realFetch; });

beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.fetch = fetchSpy as unknown as typeof window.fetch;
});

describe('/compte-suspendu', () => {
    it('explains the suspension, shows the server’s message as text and how to reach support', () => {
        open({ message: 'Retrait <b>refusé</b> : compte suspendu.' });
        expect(screen.getByRole('heading', { name: 'Compte suspendu' })).toBeInTheDocument();
        expect(screen.getByText(/demande de retrait signalée par les contrôles de sécurité/)).toBeInTheDocument();
        expect(screen.getByText(/retraits et l’accès au compte sont bloqués/)).toBeInTheDocument();
        expect(screen.getByText(/Inutile de créer un nouveau compte/)).toBeInTheDocument();
        expect(screen.getByTestId('ban-message')).toHaveTextContent('Retrait refusé : compte suspendu.');
        expect(screen.getByTestId('ban-message').innerHTML).not.toContain('<b>');
        expect(screen.getByRole('link', { name: 'reseautage.sbc@gmail.com' })).toHaveAttribute('href', 'mailto:reseautage.sbc@gmail.com');
        expect(screen.getByRole('link', { name: '+237 6 82 90 35 35' })).toHaveAttribute('href', 'tel:+237682903535');
        expect(screen.queryByRole('link', { name: /Aide/ })).toBeNull();
        expect(screen.queryByText(/solde/i)).toBeNull();
        // Public page: no member route is called from it.
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('reads the message kept for this tab after a reload; none at all is fine', () => {
        sessionStorage.setItem(BAN_MESSAGE_KEY, 'Message gardé');
        const view = open();
        expect(screen.getByTestId('ban-message')).toHaveTextContent('Message gardé');
        view.unmount();
        sessionStorage.clear();
        open();
        expect(screen.queryByTestId('ban-message')).toBeNull();
    });

    it('« Écrire au support » opens the request form that needs no account', async () => {
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Écrire au support' }));
        expect(screen.getByText('Formulaire support')).toBeInTheDocument();
    });

    it('« Retour à la connexion » forgets the session locally (no server logout) and opens the login page', async () => {
        sessionStorage.setItem(BAN_MESSAGE_KEY, 'Message gardé');
        open();
        await userEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
        expect(auth.forgetSession).toHaveBeenCalledTimes(1);
        expect(auth.logout).not.toHaveBeenCalled();
        expect(sessionStorage.getItem(BAN_MESSAGE_KEY)).toBeNull();
        expect(screen.getByText('Page de connexion')).toBeInTheDocument();
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
