import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ok, renderPage } from '../test/api';

vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
const api = vi.hoisted(() => ({ getAppSettings: vi.fn(), generateSettingsFileUrl: vi.fn((id: string) => `https://media.test/${id}`) }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

beforeEach(() => {
    api.getAppSettings.mockResolvedValue(ok({ termsAndConditionsPdf: { fileId: 'documents/cgu.pdf' } }));
});

import PublicPrivacy from './PublicPrivacy';
import PublicLegal from './PublicLegal';

const APDP = 'Délibération n° 2026-523/AT/APDP/DST/SC du 27 août 2026';

describe('privacy policy (/confidentialite)', () => {
    it('names the controller, the APDP authorisation, and is dated November 2026', () => {
        renderPage(<PublicPrivacy />, '/confidentialite');
        const page = screen.getByRole('article');
        expect(page).toHaveTextContent('Madame Adèle AGONGNON');
        expect(page).toHaveTextContent('RCCM RB/PNO/25/A/113290');
        expect(page).toHaveTextContent(APDP);
        expect(page).toHaveTextContent('Loi n° 2017-20 du 20 avril 2018');
        expect(page).toHaveTextContent('Dernière mise à jour : Novembre 2026');
    });

    it('has the sections the authorisation requires, with the cookies anchor the notice links to', () => {
        renderPage(<PublicPrivacy />, '/confidentialite');
        for (const title of ['Transfert des données hors du Bénin', 'Cookies et traceurs', 'Vos droits et comment les exercer', 'Destinataires et sous-traitants']) {
            expect(screen.getByRole('heading', { name: new RegExp(title) })).toBeInTheDocument();
        }
        expect(screen.getByRole('heading', { name: /Cookies et traceurs/ })).toHaveAttribute('id', 'cookies');
        expect(screen.getByRole('article')).toHaveTextContent('Rien n\'est conservé plus de 60 jours');
        expect(screen.getAllByRole('link', { name: 'Mes données personnelles' })[0]).toHaveAttribute('href', '/mes-donnees');
        expect(screen.getAllByRole('link', { name: 'apdp.bj' })[0]).toHaveAttribute('href', 'https://apdp.bj');
    });

    it('lists the real hosts and no longer Google Cloud or Amazon SES', () => {
        renderPage(<PublicPrivacy />, '/confidentialite');
        const page = screen.getByRole('article');
        expect(page).toHaveTextContent('Contabo GmbH');
        expect(page).toHaveTextContent('Cloudflare R2');
        expect(page.textContent).not.toMatch(/Google Cloud|Amazon/);
    });

    it('links the CGU to the official PDF when one is uploaded', async () => {
        renderPage(<PublicPrivacy />, '/confidentialite');
        await waitFor(() => expect(screen.getAllByRole('link', { name: 'CGU' })[0]).toHaveAttribute('href', 'https://media.test/documents/cgu.pdf'));
    });
});

describe('legal notice (/mentions-legales)', () => {
    it('falls back to the /conditions page when no CGU PDF is uploaded', async () => {
        api.getAppSettings.mockResolvedValue(ok({}));
        renderPage(<PublicLegal />, '/mentions-legales');
        await waitFor(() => expect(api.getAppSettings).toHaveBeenCalled());
        expect(screen.getByRole('link', { name: "conditions générales d'utilisation" })).toHaveAttribute('href', '/conditions');
    });

    it('renders the publisher, the hosts and the APDP reference', async () => {
        renderPage(<PublicLegal />, '/mentions-legales');
        expect(screen.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeInTheDocument();
        const page = screen.getByRole('article');
        expect(page).toHaveTextContent('ETS SNIPER BUSINESS CENTER');
        expect(page).toHaveTextContent('Feussi Ngossoko Rufus Herma');
        expect(page).toHaveTextContent('NUI P010017690992B');
        expect(page).toHaveTextContent('Contabo GmbH, Munich, Allemagne');
        expect(page).toHaveTextContent(APDP);
        expect(screen.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute('href', '/confidentialite');
        await waitFor(() => expect(screen.getByRole('link', { name: "conditions générales d'utilisation" })).toHaveAttribute('href', 'https://media.test/documents/cgu.pdf'));
        // The site footer links here too.
        expect(screen.getByRole('link', { name: 'Mentions légales' })).toHaveAttribute('href', '/mentions-legales');
    });
});
