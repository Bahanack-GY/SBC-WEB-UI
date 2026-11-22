import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({ requestPhoneChangeOtp: vi.fn(), confirmPhoneChange: vi.fn(), getAuthenticatorStatus: vi.fn() }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { country: 'CM', email: 'm@gmail.com' }, isAuthenticated: true, loading: false, refreshUser: vi.fn() }),
}));
vi.mock('../components/common/ProtectedRoute', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import ChangePhoneNumber from './ChangePhoneNumber';

beforeEach(() => vi.clearAllMocks());

describe('Changer le numéro de téléphone (Security plan Phase 3)', () => {
  it('a member with the app sends its code with the request; the resend sends none', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(ok({ enabled: true, enrolledAt: '2026-11-20T10:00:00Z', backupCodesRemaining: 10, lockedUntil: null }));
    api.requestPhoneChangeOtp.mockResolvedValue(ok({}));
    renderPage(<ChangePhoneNumber />);
    const field = await screen.findByLabelText('Code de l’application d’authentification');
    await userEvent.type(screen.getByPlaceholderText('Ex: 675090755'), '690001122');
    await userEvent.type(field, '112233');
    await userEvent.click(screen.getByRole('button', { name: /Envoyer le code/ }));
    await waitFor(() => expect(api.requestPhoneChangeOtp).toHaveBeenCalledWith('+237690001122', '112233'));
    await userEvent.click(await screen.findByRole('button', { name: 'Fermer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Renvoyer' }));
    await waitFor(() => expect(api.requestPhoneChangeOtp).toHaveBeenLastCalledWith('+237690001122'));
  });
});
