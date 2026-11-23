import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
    requestEmailVerification: vi.fn(),
    confirmEmailVerification: vi.fn(),
    correctUnverifiedEmail: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ user: { _id: 'u1', email: 'nouveau@gmail.com' }, refreshUser: vi.fn(async () => undefined), logout: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

import VerifyEmailGate from './VerifyEmailGate';

beforeEach(() => {
    vi.clearAllMocks();
    api.requestEmailVerification.mockResolvedValue(ok({ sent: true, sentTo: 'no••••••@gmail.com', retryAfterSeconds: 60 }));
    api.confirmEmailVerification.mockResolvedValue(ok({ verified: true }));
});

describe('VerifyEmailGate', () => {
    it('sends one code on arrival and says where', async () => {
        renderPage(<VerifyEmailGate />);
        expect(await screen.findByText('no••••••@gmail.com')).toBeInTheDocument();
        expect(api.requestEmailVerification).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /Renvoyer dans/ })).toBeDisabled();
    });

    it('the right code verifies, then the profile is read again (the gate lifts)', async () => {
        renderPage(<VerifyEmailGate />);
        await userEvent.type(await screen.findByLabelText('Code reçu par e-mail'), 'ab3k9z');
        await userEvent.click(screen.getByRole('button', { name: 'Vérifier' }));
        await waitFor(() => expect(api.confirmEmailVerification).toHaveBeenCalledWith('AB3K9Z'));
        expect(auth.refreshUser).toHaveBeenCalled();
    });

    it('a wrong code shows the server message and clears the field', async () => {
        api.confirmEmailVerification.mockResolvedValue(fail(400, 'Code invalide ou expiré. Utilisez le dernier code reçu.'));
        renderPage(<VerifyEmailGate />);
        const field = await screen.findByLabelText('Code reçu par e-mail');
        await userEvent.type(field, 'AAAAAA');
        await userEvent.click(screen.getByRole('button', { name: 'Vérifier' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/Code invalide ou expiré/);
        expect(field).toHaveValue('');
        expect(auth.refreshUser).not.toHaveBeenCalled();
    });

    it('« Mauvaise adresse ? »: new address + password, code sent there', async () => {
        api.correctUnverifiedEmail.mockResolvedValue(ok({ sent: true, sentTo: 'ri••••@gmail.com', retryAfterSeconds: 60 }));
        renderPage(<VerifyEmailGate />);
        await userEvent.click(await screen.findByRole('button', { name: 'Mauvaise adresse ?' }));
        await userEvent.type(screen.getByLabelText('Bonne adresse e-mail'), 'right@gmail.com');
        await userEvent.type(screen.getByLabelText('Mot de passe'), 'Secret123!');
        await userEvent.click(screen.getByRole('button', { name: 'Corriger et recevoir le code' }));
        await waitFor(() => expect(api.correctUnverifiedEmail).toHaveBeenCalledWith('right@gmail.com', 'Secret123!'));
        expect(await screen.findByText('ri••••@gmail.com')).toBeInTheDocument();
    });
});
