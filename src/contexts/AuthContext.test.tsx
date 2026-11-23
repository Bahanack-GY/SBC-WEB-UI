import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok } from '../test/api';
import { useState } from 'react';

const api = vi.hoisted(() => ({ logoutUser: vi.fn(), getUserProfile: vi.fn(), registerUser: vi.fn(), loginUser: vi.fn() }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import { AuthProvider, useAuth } from './AuthContext';

function LogoutButton() {
    const { logout } = useAuth();
    return <button onClick={() => void logout()}>Se déconnecter</button>;
}

const PERSONAL = {
    token: 'tok', userId: 'u1', userEmail: 'awa@example.com', userName: 'Awa', balance: '2500', usdBalance: '4',
    avatar: 'https://media/a.jpg', momo: '237699123456', momoCorrespondent: 'MTN_MOMO_CMR',
    signupFormData: '{"email":"awa@example.com"}', signupFormStep: '1', signupChatDraft: '{"answers":{}}',
};

beforeEach(() => {
    localStorage.clear();
    api.logoutUser.mockResolvedValue(ok(true));
    api.getUserProfile.mockResolvedValue(ok({ _id: 'u1' }));
});

describe('logout', () => {
    it('removes the personal values copied to the device, and keeps the language and display flags', async () => {
        for (const [k, v] of Object.entries(PERSONAL)) localStorage.setItem(k, v);
        localStorage.setItem('language', 'fr');
        localStorage.setItem('seenTours', '["home"]');
        render(<AuthProvider><LogoutButton /></AuthProvider>);
        await userEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));
        await waitFor(() => expect(localStorage.getItem('token')).toBeNull());
        for (const k of Object.keys(PERSONAL)) expect(localStorage.getItem(k), k).toBeNull();
        expect(localStorage.getItem('language')).toBe('fr');
        expect(localStorage.getItem('seenTours')).toBe('["home"]');
    });
});

function SignUpAndIn() {
    const { register, login, user } = useAuth();
    const [out, setOut] = useState('');
    return (
        <div>
            <button onClick={async () => setOut(JSON.stringify(await register({ email: 'n@gmail.com' })))}>Créer</button>
            <button onClick={async () => setOut(JSON.stringify(await login('n@gmail.com', 'Secret123!')))}>Connexion</button>
            <p>{out}</p>
            <p>{(user as { name?: string } | null)?.name || 'personne'}</p>
        </div>
    );
}

describe('session without a code (email verified after payment)', () => {
    it('sign-up answering with a token: signed in at once, no code step', async () => {
        api.registerUser.mockResolvedValue(ok({ userId: 'u9', token: 'tok9', user: { _id: 'u9', name: 'Nouveau', email: 'n@gmail.com' } }));
        render(<AuthProvider><SignUpAndIn /></AuthProvider>);
        await userEvent.click(await screen.findByRole('button', { name: 'Créer' }));
        expect(await screen.findByText('{"userId":"u9","signedIn":true}')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBe('tok9');
        expect(await screen.findByText('Nouveau')).toBeInTheDocument();
        expect(sessionStorage.getItem('tempUserId')).toBeNull();
    });

    it('sign-up answering without a token (annonceur): the code step as before', async () => {
        api.registerUser.mockResolvedValue(ok({ userId: 'u8' }));
        render(<AuthProvider><SignUpAndIn /></AuthProvider>);
        await userEvent.click(await screen.findByRole('button', { name: 'Créer' }));
        expect(await screen.findByText('{"userId":"u8","signedIn":false}')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
        expect(sessionStorage.getItem('tempUserId')).toBe('u8');
    });

    it('password-only sign-in (unpaid, unverified): signed in, no code page', async () => {
        api.loginUser.mockResolvedValue(ok({ userId: 'u7', otpSent: false, token: 'tok7', user: { _id: 'u7', name: 'Revenu' } }));
        render(<AuthProvider><SignUpAndIn /></AuthProvider>);
        await userEvent.click(await screen.findByRole('button', { name: 'Connexion' }));
        expect(await screen.findByText(/"requiresOtp":false/)).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBe('tok7');
        expect(localStorage.getItem('userId')).toBe('u7');
    });
});

describe('cookie session (Security plan Phase 9)', () => {
    it('sign-in answering session: cookie keeps no token on the device, and counts as signed in', async () => {
        api.loginUser.mockResolvedValue(ok({ userId: 'u6', otpSent: false, session: 'cookie', user: { _id: 'u6', name: 'Cookie' } }));
        render(<AuthProvider><SignUpAndIn /></AuthProvider>);
        await userEvent.click(await screen.findByRole('button', { name: 'Connexion' }));
        expect(await screen.findByText(/"requiresOtp":false/)).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('sbc_session')).toBe('cookie');
        expect(localStorage.getItem('userId')).toBe('u6');
    });

    it('sign-up answering session: cookie is signed in at once, no code step', async () => {
        api.registerUser.mockResolvedValue(ok({ userId: 'u5', session: 'cookie', user: { _id: 'u5', name: 'Nouveau' } }));
        render(<AuthProvider><SignUpAndIn /></AuthProvider>);
        await userEvent.click(await screen.findByRole('button', { name: 'Créer' }));
        expect(await screen.findByText('{"userId":"u5","signedIn":true}')).toBeInTheDocument();
        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('sbc_session')).toBe('cookie');
    });

    it('logout ends the cookie session on the server and forgets the flag', async () => {
        localStorage.setItem('sbc_session', 'cookie');
        const realFetch = window.fetch;
        const seen: string[] = [];
        window.fetch = vi.fn(async (input: RequestInfo | URL) => { seen.push(String(input)); return new Response('{}'); }) as typeof window.fetch;
        try {
            render(<AuthProvider><LogoutButton /></AuthProvider>);
            await userEvent.click(await screen.findByRole('button', { name: 'Se déconnecter' }));
            await waitFor(() => expect(localStorage.getItem('sbc_session')).toBeNull());
            expect(seen.some(u => u.endsWith('/users/session/logout'))).toBe(true);
        } finally {
            window.fetch = realFetch;
        }
    });
});

