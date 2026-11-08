import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fail, ok, renderPage } from '../../test/api';
import { COOKIE_NOTICE_KEY, STORAGE_MAX_AGE_MS } from '../../utils/privacy';

const api = vi.hoisted(() => ({ recordConsents: vi.fn(), getAppSettings: vi.fn(), generateSettingsFileUrl: vi.fn((id: string) => `https://media.test/${id}`) }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({
    isAuthenticated: false,
    user: null as Record<string, unknown> | null,
    refreshUser: vi.fn(),
    logout: vi.fn(),
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

import PrivacyNotices from './PrivacyNotices';

const user = userEvent.setup();
const CURRENT = { privacy: { acceptedAt: '2026-11-08T10:00:00Z', version: '2026-11' }, dataTransfer: { acceptedAt: '2026-11-08T10:00:00Z', version: '2026-11' } };
const DAY = 24 * 60 * 60 * 1000;

const member = (consents?: unknown) => {
    auth.isAuthenticated = true;
    auth.user = { _id: 'u1', name: 'Awa', consents };
};

beforeEach(() => {
    localStorage.clear();
    auth.isAuthenticated = false;
    auth.user = null;
    auth.refreshUser.mockResolvedValue(undefined);
    auth.logout.mockResolvedValue(undefined);
    api.recordConsents.mockResolvedValue(ok({ consents: CURRENT }));
    api.getAppSettings.mockResolvedValue(ok({ termsAndConditionsPdf: { fileId: 'documents/cgu.pdf' } }));
});

describe('consent window', () => {
    it('asks a member without consents for both agreements, records them, then reloads the profile', async () => {
        localStorage.setItem(COOKIE_NOTICE_KEY, String(Date.now()));
        member(undefined);
        renderPage(<PrivacyNotices raised />, '/');
        const dialog = await screen.findByRole('dialog', { name: 'Vos données personnelles' });
        expect(dialog).toHaveTextContent('Pour continuer à utiliser SBC, nous avons besoin de votre accord');
        // The profile is reloaded once before asking: the login answer may lack the consents.
        expect(auth.refreshUser).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(screen.getByRole('link', { name: 'conditions d’utilisation' })).toHaveAttribute('href', 'https://media.test/documents/cgu.pdf'));

        const accept = screen.getByRole('button', { name: 'J’accepte' });
        await user.click(screen.getByRole('checkbox', { name: /conditions d’utilisation et la politique de confidentialité/ }));
        expect(accept).toBeDisabled();
        await user.click(screen.getByRole('checkbox', { name: /hors du Bénin \(serveurs en Allemagne\)/ }));
        await user.click(accept);

        await waitFor(() => expect(api.recordConsents).toHaveBeenCalledWith({ privacy: true, dataTransfer: true }));
        expect(auth.refreshUser).toHaveBeenCalledTimes(2);
    });

    it('asks again when the accepted policy is an older version', async () => {
        member({ ...CURRENT, privacy: { acceptedAt: '2026-01-01T00:00:00Z', version: '2026-01' } });
        renderPage(<PrivacyNotices raised />, '/');
        expect(await screen.findByRole('dialog', { name: 'Vos données personnelles' })).toBeInTheDocument();
    });

    it('stays away when the consents are current, and shows the cookie notice instead', async () => {
        member(CURRENT);
        renderPage(<PrivacyNotices raised />, '/');
        expect(await screen.findByRole('region', { name: 'Cookies' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(auth.refreshUser).not.toHaveBeenCalled();
    });

    it('does not cover the policy it links to, nor the page to delete the account', async () => {
        member(undefined);
        renderPage(<PrivacyNotices raised />, '/confidentialite');
        await waitFor(() => expect(auth.refreshUser).toHaveBeenCalled());
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('explains a refusal and points to the deletion page', async () => {
        member(undefined);
        renderPage(<PrivacyNotices raised />, '/');
        await user.click(await screen.findByRole('button', { name: 'Je refuse' }));
        expect(screen.getByRole('dialog')).toHaveTextContent('Sans cet accord, SBC ne peut pas conserver votre compte');
        expect(screen.getByRole('link', { name: 'Mes données personnelles' })).toHaveAttribute('href', '/mes-donnees');
    });

    it('says so and lets the member retry when the server refuses', async () => {
        api.recordConsents.mockResolvedValueOnce(fail(500, 'Internal error'));
        member(undefined);
        renderPage(<PrivacyNotices raised />, '/');
        await user.click(await screen.findByRole('checkbox', { name: /conditions d’utilisation/ }));
        await user.click(screen.getByRole('checkbox', { name: /hors du Bénin/ }));
        await user.click(screen.getByRole('button', { name: 'J’accepte' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas pu être enregistré');
        await user.click(screen.getByRole('button', { name: 'J’accepte' }));
        await waitFor(() => expect(api.recordConsents).toHaveBeenCalledTimes(2));
    });
});

describe('cookie notice', () => {
    it('shows to a visitor who is not logged in, with a link to the cookies section', () => {
        renderPage(<PrivacyNotices raised={false} />, '/a-propos');
        const notice = screen.getByRole('region', { name: 'Cookies' });
        expect(notice).toHaveTextContent('SBC n’utilise pas de cookies publicitaires ni de mesure d’audience');
        expect(notice).toHaveTextContent('60 jours au plus');
        expect(screen.getByRole('link', { name: 'En savoir plus' })).toHaveAttribute('href', '/confidentialite#cookies');
    });

    it('hides after « J’ai compris », and lets what waited behind it show', async () => {
        renderPage(<PrivacyNotices raised whenClear={<p>Installer SBC</p>} />, '/');
        expect(screen.queryByText('Installer SBC')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'J’ai compris' }));
        expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
        expect(screen.getByText('Installer SBC')).toBeInTheDocument();
        expect(Number(localStorage.getItem(COOKIE_NOTICE_KEY))).toBeGreaterThan(Date.now() - 5000);
    });

    it('stays hidden within 60 days, and shows again after', () => {
        localStorage.setItem(COOKIE_NOTICE_KEY, String(Date.now() - 59 * DAY));
        const first = renderPage(<PrivacyNotices raised />, '/');
        expect(screen.queryByRole('region', { name: 'Cookies' })).not.toBeInTheDocument();
        first.unmount();

        localStorage.setItem(COOKIE_NOTICE_KEY, String(Date.now() - STORAGE_MAX_AGE_MS - DAY));
        renderPage(<PrivacyNotices raised />, '/');
        expect(screen.getByRole('region', { name: 'Cookies' })).toBeInTheDocument();
    });
});
