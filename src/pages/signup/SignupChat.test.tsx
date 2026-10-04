import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fail, ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
    getAppSettings: vi.fn(), generateSettingsFileUrl: vi.fn(() => 'https://files/terms.pdf'),
    checkUserExistence: vi.fn(), checkRecoveryRegistration: vi.fn(), parseConflictError: vi.fn(() => null),
    getRecoveryNotification: vi.fn(), getAffiliationInfo: vi.fn(), resendOtpEnhanced: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ register: vi.fn(), verifyOtp: vi.fn(), updateProfile: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));
const aff = vi.hoisted(() => ({ affiliationCode: null as string | null }));
vi.mock('../../contexts/AffiliationContext', () => ({ useAffiliation: () => aff }));

import SignupChat from './SignupChat';

const log = () => screen.getByRole('log');
const user = userEvent.setup();

/** Types into the composer and sends. */
async function say(label: string, text: string) {
    const input = await screen.findByLabelText(label);
    await user.clear(input);
    await user.type(input, text);
    await user.click(screen.getByRole('button', { name: /Envoyer|Valider le code/ }));
}
const pick = async (name: string | RegExp) => user.click(await screen.findByRole('option', { name }));
const tap = async (name: string | RegExp) => user.click(await screen.findByRole('button', { name }));

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    aff.affiliationCode = null;
    api.getAppSettings.mockResolvedValue(ok({ termsAndConditionsPdf: { fileId: 'f1' } }));
    api.checkUserExistence.mockResolvedValue(ok({ exists: false }));
    api.checkRecoveryRegistration.mockResolvedValue(ok({ hasPendingRecoveries: false }));
    api.getRecoveryNotification.mockResolvedValue(ok({ hasRecoveries: false }));
    api.getAffiliationInfo.mockImplementation(async (code: string) => (code.toLowerCase() === 'awa237' ? ok({ name: 'Awa Events' }) : fail(404, 'No user found with this referral code')));
    auth.register.mockResolvedValue({ userId: 'u1' });
    auth.verifyOtp.mockResolvedValue(undefined);
    auth.updateProfile.mockResolvedValue(undefined);
});

async function answerSignup({ sponsor = true } = {}) {
    await say('Nom complet', 'Marie Claire Ngo');
    await pick(/Cameroun/);
    await say('Numéro WhatsApp', '699 12 34 56');
    await say('Adresse e-mail', 'Marie.Ngo@example.com');
    await say('Mot de passe', 'motdepasse123');
    await say('Confirmation du mot de passe', 'motdepasse123');
    if (sponsor) await say('Code parrain', 'AWA237');
    await tap('J’accepte');
}

describe('sign-up chat', () => {
    it('asks everything the form asked, then creates the account with the same payload', async () => {
        renderPage(<SignupChat pace={0} />, '/signup');
        expect(await within(log()).findByText(/quel est votre nom complet/)).toBeInTheDocument();
        await answerSignup();
        expect(await within(log()).findByText('Votre parrain : Awa Events ✅')).toBeInTheDocument();
        expect(await within(log()).findByText(/récapitulatif/)).toBeInTheDocument();
        await tap('Créer mon compte');
        await waitFor(() => expect(auth.register).toHaveBeenCalledWith({
            email: 'marie.ngo@example.com', password: 'motdepasse123', name: 'Marie Claire Ngo',
            phoneNumber: '+237699123456', referrerCode: 'AWA237', country: 'CM',
        }));
        expect(await within(log()).findByText(/code de 6 caractères par e-mail/)).toBeInTheDocument();
        // The password never reaches storage.
        expect(JSON.stringify({ ...localStorage })).not.toContain('motdepasse123');
    });

    it('checks the code, then saves the optional profile like the old profile page', async () => {
        renderPage(<SignupChat pace={0} />, '/signup');
        await answerSignup();
        await tap('Créer mon compte');
        await say('Code de vérification', 'd4cqrl');
        await waitFor(() => expect(auth.verifyOtp).toHaveBeenCalledWith('u1', 'd4cqrl'));
        await tap('Oui, allons-y');
        await tap(/Une femme/);
        await tap('Passer cette question');           // birth date
        await pick('Littoral');                         // Cameroon has regions
        await tap('Passer cette question');           // profession
        await tap('Français');
        await tap(/Football/);
        await tap('Valider (1)');
        await waitFor(() => expect(auth.updateProfile).toHaveBeenCalledWith({
            sex: 'female', region: 'Littoral', language: ['fr'], interests: ['Football'],
        }));
        expect(localStorage.getItem('profileCompletionDone')).toBe('true');
        expect(await screen.findByRole('button', { name: 'Continuer' })).toBeInTheDocument();
    });

    it('refuses an e-mail that already has an account, and offers to log in', async () => {
        api.checkUserExistence.mockImplementation(async (q: { email?: string }) => ok({ exists: !!q.email }));
        renderPage(<SignupChat pace={0} />, '/signup');
        await say('Nom complet', 'Paul Biya');
        await pick(/Cameroun/);
        await say('Numéro WhatsApp', '699123456');
        await say('Adresse e-mail', 'taken@example.com');
        expect(await within(log()).findByText(/déjà utilisée par un compte SBC/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Me connecter' })).toBeInTheDocument();
        expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument(); // asked again
    });

    it('takes the sponsor from the invitation link and does not ask for it', async () => {
        aff.affiliationCode = 'awa237';
        renderPage(<SignupChat pace={0} />, '/signup');
        expect(await within(log()).findByText('Vous êtes invité(e) par Awa Events 🎉')).toBeInTheDocument();
        expect(screen.getByText('Question 1 sur 7')).toBeInTheDocument();
        await answerSignup({ sponsor: false });
        await tap('Créer mon compte');
        await waitFor(() => expect(auth.register).toHaveBeenCalledWith(expect.objectContaining({ referrerCode: 'awa237' })));
    });

    it('asks the password again when the confirmation differs', async () => {
        renderPage(<SignupChat pace={0} />, '/signup');
        await say('Nom complet', 'Jean Paul');
        await pick(/Cameroun/);
        await say('Numéro WhatsApp', '699123456');
        await say('Adresse e-mail', 'jp@example.com');
        await say('Mot de passe', 'motdepasse123');
        await say('Confirmation du mot de passe', 'autrechose1');
        expect(await within(log()).findByText(/ne correspondent pas/)).toBeInTheDocument();
        expect(await screen.findByLabelText('Mot de passe')).toBeInTheDocument();
    });

    it('says the code is wrong, not "wrong password", when verification fails', async () => {
        auth.verifyOtp.mockRejectedValueOnce(new Error('Mot de passe ou email incorrect'));
        renderPage(<SignupChat pace={0} />, '/signup');
        await answerSignup();
        await tap('Créer mon compte');
        await say('Code de vérification', 'ABCDEF');
        expect(await within(log()).findByText(/Ce code ne correspond pas ou a expiré/)).toBeInTheDocument();
    });
});
