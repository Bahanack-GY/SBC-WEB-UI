import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  requestEmailChangeOtp: vi.fn(),
  confirmEmailChange: vi.fn(),
  loginUser: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ refreshUser: vi.fn(async () => undefined) }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'old.address@gmail.com' }, isAuthenticated: true, loading: false, refreshUser: auth.refreshUser }),
}));

import ChangeEmail from './ChangeEmail';
import VerifyEmailOtp from './VerifyEmailOtp';

const pages = (
  <Routes>
    <Route path="/modifier-email" element={<ChangeEmail />} />
    <Route path="/verify-email-otp" element={<VerifyEmailOtp />} />
    <Route path="/profile" element={<div>Profil</div>} />
  </Routes>
);

const typeCode = async (code: string) => {
  const boxes = screen.getAllByRole('textbox');
  for (let i = 0; i < code.length; i++) await userEvent.type(boxes[i], code[i]);
};

beforeEach(() => vi.clearAllMocks());

describe('Changer d’adresse e-mail', () => {
  it('asks the server for a code to the new address with the password, and never signs in', async () => {
    api.requestEmailChangeOtp.mockResolvedValue(ok({}));
    renderPage(pages, '/modifier-email');
    await userEvent.type(screen.getByPlaceholderText(/nouvel@email/), ' New.Address@gmail.com');
    await userEvent.type(screen.getByPlaceholderText('Votre mot de passe'), 'Secret123!');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le code' }));
    await waitFor(() => expect(api.requestEmailChangeOtp).toHaveBeenCalledWith('new.address@gmail.com', 'Secret123!'));
    expect(api.loginUser).not.toHaveBeenCalled();
    expect(await screen.findByText('new.address@gmail.com')).toBeInTheDocument();
  });

  it('stays on the form and shows the refusal (wrong password)', async () => {
    api.requestEmailChangeOtp.mockResolvedValue(fail(400, 'Mot de passe incorrect.'));
    renderPage(pages, '/modifier-email');
    await userEvent.type(screen.getByPlaceholderText(/nouvel@email/), 'new.address@gmail.com');
    await userEvent.type(screen.getByPlaceholderText('Votre mot de passe'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer le code' }));
    expect(await screen.findByText('Mot de passe incorrect.')).toBeInTheDocument();
    expect(screen.queryByText('Vérification du nouvel email')).not.toBeInTheDocument();
  });

  it('shows the refusal of a wrong code instead of « succès »', async () => {
    api.confirmEmailChange.mockResolvedValue(fail(400, 'Code invalide ou expiré.'));
    renderPage(pages, '/verify-email-otp?email=new.address%40gmail.com');
    await typeCode('ABC234');
    await userEvent.click(screen.getByRole('button', { name: /Vérifier|Valider|Confirmer/ }));
    expect(await screen.findByText('Code invalide ou expiré.')).toBeInTheDocument();
    expect(auth.refreshUser).not.toHaveBeenCalled();
  });

  it('confirms the right code and refreshes the account', async () => {
    api.confirmEmailChange.mockResolvedValue(ok({}));
    renderPage(pages, '/verify-email-otp?email=new.address%40gmail.com');
    await typeCode('ABC234');
    await userEvent.click(screen.getByRole('button', { name: /Vérifier|Valider|Confirmer/ }));
    await waitFor(() => expect(api.confirmEmailChange).toHaveBeenCalledWith('new.address@gmail.com', 'ABC234'));
    await waitFor(() => expect(auth.refreshUser).toHaveBeenCalled());
  });
});
