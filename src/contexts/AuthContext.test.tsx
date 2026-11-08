import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok } from '../test/api';

const api = vi.hoisted(() => ({ logoutUser: vi.fn(), getUserProfile: vi.fn() }));
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
