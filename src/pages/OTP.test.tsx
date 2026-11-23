import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ok } from '../test/api';

const api = vi.hoisted(() => ({
  getAuthenticatorStatus: vi.fn(),
  verifyWithdrawal: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'member@gmail.com' }, isAuthenticated: true, loading: false, verifyOtp: vi.fn() }),
}));

import OTP from './OTP';

const open = (state: Record<string, unknown>) => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[{ pathname: '/otp', state }]}>
      <Routes>
        <Route path="/otp" element={<OTP />} />
        <Route path="/transaction-confirmation" element={<div>Confirmation du retrait</div>} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
);

const withdrawal = { withdrawalId: 'TX1', withdrawalAmount: 5000, withdrawalCurrency: 'XAF', flow: 'withdrawal' };

beforeEach(() => {
  vi.clearAllMocks();
  api.getAuthenticatorStatus.mockResolvedValue(ok({ enabled: true, backupCodesRemaining: 10 }));
  api.verifyWithdrawal.mockResolvedValue(ok({ status: 'processing' }));
});

describe('/otp for a withdrawal', () => {
  it('with the authenticator app: asks for the app code, never says a code was e-mailed', async () => {
    open(withdrawal); // e.g. from the Wallet form or the transaction history
    expect(await screen.findByText('Confirmer le retrait', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByLabelText('Code de l’application d’authentification')).toBeInTheDocument();
    expect(screen.queryByText(/a été envoyé/)).toBeNull();
    expect(screen.queryByText(/dossier spam/)).toBeNull();
    expect(screen.queryByText(/Renvoyer/)).toBeNull();

    await userEvent.type(screen.getByLabelText('Code de l’application d’authentification'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));
    await waitFor(() => expect(api.verifyWithdrawal).toHaveBeenCalledWith({ transactionId: 'TX1', verificationCode: '123456' }));
    expect(await screen.findByText('Confirmation du retrait')).toBeInTheDocument();
  });

  it('told by the withdrawal answer (confirmWith): no status call needed', async () => {
    open({ ...withdrawal, confirmWith: 'authenticator' });
    expect(await screen.findByLabelText('Code de l’application d’authentification')).toBeInTheDocument();
    expect(api.getAuthenticatorStatus).not.toHaveBeenCalled();
  });

  it('without the app (e-mailed code mode): the usual code boxes', async () => {
    api.getAuthenticatorStatus.mockResolvedValue(ok({ enabled: false }));
    open(withdrawal);
    expect(await screen.findByText('Retrait - Code de vérification')).toBeInTheDocument();
    expect(screen.queryByLabelText('Code de l’application d’authentification')).toBeNull();
  });
});
