import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ok } from '../test/api';

const api = vi.hoisted(() => ({ resetPassword: vi.fn() }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import ResetPassword from './ResetPassword';

beforeEach(() => vi.clearAllMocks());

const CODE_NEEDED = {
  statusCode: 403, isSuccessByStatusCode: false, apiReportedSuccess: false, message: 'Confirmez avec le code de votre application d’authentification (ou un code de secours).',
  body: { success: false, code: 'AUTHENTICATOR_CODE_REQUIRED', message: 'Confirmez avec le code de votre application d’authentification (ou un code de secours).' },
};

describe('Nouveau mot de passe (Security plan Phase 3)', () => {
  it('an account with the authenticator app is asked its code on the same page, then reset', async () => {
    api.resetPassword.mockResolvedValueOnce(CODE_NEEDED).mockResolvedValueOnce(ok({}));
    render(
      <MemoryRouter initialEntries={[{ pathname: '/reset-password', state: { email: 'm@gmail.com', passwordResetToken: 'tok' } }]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/connexion" element={<div>Connexion</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByPlaceholderText('Au moins 8 caractères'), 'NewSecret1!');
    await userEvent.type(screen.getByPlaceholderText('Répétez le mot de passe'), 'NewSecret1!');
    await userEvent.click(screen.getByRole('button', { name: 'Réinitialiser le mot de passe' }));
    const field = await screen.findByLabelText('Code de l’application d’authentification');
    expect(api.resetPassword).toHaveBeenLastCalledWith('m@gmail.com', 'tok', 'NewSecret1!', undefined);
    await userEvent.type(field, '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Réinitialiser le mot de passe' }));
    await waitFor(() => expect(api.resetPassword).toHaveBeenLastCalledWith('m@gmail.com', 'tok', 'NewSecret1!', '654321'));
    expect(await screen.findByText(/réinitialisé avec succès/)).toBeInTheDocument();
  });
});
