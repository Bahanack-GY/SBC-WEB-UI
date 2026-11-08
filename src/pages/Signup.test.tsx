import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
    getAppSettings: vi.fn(), generateSettingsFileUrl: vi.fn((id: string) => `https://media.test/${id}`),
    getAffiliationInfo: vi.fn(), checkUserExistence: vi.fn(), checkRecoveryRegistration: vi.fn(),
    parseConflictError: vi.fn(() => null), getRecoveryNotification: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../contexts/AffiliationContext', () => ({ useAffiliation: () => ({ affiliationCode: 'awa237' }) }));

import Signup from './Signup';

const user = userEvent.setup();

beforeEach(() => {
    localStorage.clear();
    api.getAppSettings.mockResolvedValue(ok({ termsAndConditionsPdf: { fileId: 'documents/cgu.pdf' } }));
    api.getAffiliationInfo.mockResolvedValue(ok({ name: 'Awa Events' }));
    api.checkUserExistence.mockResolvedValue(ok({ exists: false }));
    api.checkRecoveryRegistration.mockResolvedValue(ok({ hasPendingRecoveries: false }));
    api.getRecoveryNotification.mockResolvedValue(ok({ hasRecoveries: false }));
    auth.register.mockResolvedValue({ userId: 'u1' });
});

/** Step 1 of 2, then the number and the country of step 2. */
async function fillUntilAgreements(country: string) {
    await user.type(screen.getByPlaceholderText('Ex: Jean Paul'), 'Marie Ngo');
    await user.type(screen.getByPlaceholderText('Ex: Jeanpierre@gmail.com'), 'marie@example.com');
    await user.type(screen.getByPlaceholderText('Mot de passe'), 'motdepasse123');
    await user.type(screen.getByPlaceholderText('Confirmer mot de passe'), 'motdepasse123');
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    await user.type(await screen.findByPlaceholderText('Ex: 675090755'), '699123456');
    await user.selectOptions(screen.getByDisplayValue('Sélectionner le pays'), country);
}

const transferBox = () => screen.queryByRole('checkbox', { name: /hors du Bénin \(serveurs en Allemagne\)/ });

describe('sign-up form (/signup/formulaire)', () => {
    it('never keeps the passwords in storage', async () => {
        renderPage(<Signup />, '/signup/formulaire');
        await fillUntilAgreements('Cameroun');
        // The draft for the next visit is written, without the passwords.
        expect(localStorage.getItem('signupFormData')).toContain('marie@example.com');
        expect(localStorage.getItem('signupFormData')).not.toContain('motdepasse123');
    });

    it('outside Benin, asks only for the terms and privacy policy, and sends no hosting agreement', async () => {
        renderPage(<Signup />, '/signup/formulaire');
        await fillUntilAgreements('Cameroun');
        const register = screen.getByRole('button', { name: "S'inscrire" });
        expect(transferBox()).not.toBeInTheDocument();
        await user.click(screen.getByRole('checkbox', { name: /conditions d'utilisation et la politique de confidentialité/ }));
        await waitFor(() => expect(register).toBeEnabled());
        await user.click(register);
        await waitFor(() => expect(auth.register).toHaveBeenCalledWith(expect.objectContaining({
            email: 'marie@example.com', country: 'CM', consents: { privacy: true, dataTransfer: false },
        })));
    });

    it('in Benin, needs both agreements and sends them with the account', async () => {
        renderPage(<Signup />, '/signup/formulaire');
        await fillUntilAgreements('Bénin');
        const register = screen.getByRole('button', { name: "S'inscrire" });
        await waitFor(() => expect(screen.getByRole('link', { name: "conditions d'utilisation" })).toHaveAttribute('href', 'https://media.test/documents/cgu.pdf'));
        expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute('href', '/confidentialite');
        await user.click(screen.getByRole('checkbox', { name: /conditions d'utilisation et la politique de confidentialité/ }));
        expect(register).toBeDisabled();
        await user.click(transferBox()!);
        await waitFor(() => expect(register).toBeEnabled());
        await user.click(register);

        await waitFor(() => expect(auth.register).toHaveBeenCalledWith(expect.objectContaining({
            email: 'marie@example.com', password: 'motdepasse123', referrerCode: 'awa237', country: 'BJ',
            consents: { privacy: true, dataTransfer: true },
        })));
    });

    it('drops passwords an older build left in the saved draft', () => {
        localStorage.setItem('signupFormData', JSON.stringify({ nom: 'Old', email: 'old@example.com', password: 'secret123', confirmPassword: 'secret123', whatsapp: '+237699123456', pays: 'Cameroun' }));
        renderPage(<Signup />, '/signup/formulaire');
        expect(screen.getByDisplayValue('old@example.com')).toBeInTheDocument();
        expect(localStorage.getItem('signupFormData')).not.toContain('secret123');
        expect(screen.getByPlaceholderText('Mot de passe')).toHaveValue('');
    });
});
