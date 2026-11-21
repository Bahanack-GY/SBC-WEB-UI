import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
    supportKbSearch: vi.fn(),
    supportTickets: vi.fn(),
    supportGuides: vi.fn(),
    supportKbCategories: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpHome from './HelpHome';

beforeEach(() => {
    api.supportTickets.mockResolvedValue(ok([{ _id: 't1', status: 'en_attente_membre' }, { _id: 't2', status: 'ferme' }]));
    api.supportKbCategories.mockResolvedValue(ok([]));
    api.supportKbSearch.mockResolvedValue(ok([{ slug: 'retrait-delais', title: 'Délais des retraits', summary: 'Combien de temps' }]));
    // Shape of support-service config/guides.ts
    api.supportGuides.mockResolvedValue(ok([{
        id: 'not-activated', label: 'Mon compte n’est pas activé', text: 'Nous vérifions votre paiement.',
        children: [
            { id: 'check', label: 'Vérifier mon paiement', action: 'activation_check', text: 'Choisissez votre paiement.' },
            { id: 'none', label: 'Je ne trouve pas mon paiement', action: 'ticket', category: 'activation_paiement', text: 'Ouvrez une demande.', articles: ['payer-son-pack'] },
        ],
    }]));
});

describe('Aide home', () => {
    it('shows the common problems and the open requests count', async () => {
        renderPage(<HelpHome />, '/aide');
        expect(screen.getByRole('link', { name: /Mon retrait est bloqué/ })).toHaveAttribute('href', '/aide/retraits');
        expect(screen.getByRole('link', { name: /Changer mon email ou mon téléphone/ })).toHaveAttribute('href', '/aide/contact');
        expect(await screen.findByText('1 demande en cours')).toBeInTheDocument();
    });

    it('searches the help centre', async () => {
        const user = userEvent.setup();
        renderPage(<HelpHome />, '/aide');
        await user.type(screen.getByLabelText('Rechercher dans l’aide'), 'retrait');
        const results = await screen.findByRole('region', { name: 'Résultats de la recherche' });
        expect(await within(results).findByRole('link', { name: /Délais des retraits/ })).toHaveAttribute('href', '/aide/articles/retrait-delais');
        expect(api.supportKbSearch).toHaveBeenCalledWith('retrait');
    });

    it('walks the guided FAQ down to an action', async () => {
        const user = userEvent.setup();
        renderPage(<HelpHome />, '/aide');
        const faq = await screen.findByRole('region', { name: 'Questions fréquentes' });
        await user.click(within(faq).getByRole('button', { name: 'Mon compte n’est pas activé' }));
        await user.click(within(faq).getByRole('button', { name: 'Je ne trouve pas mon paiement' }));
        expect(within(faq).getByText('Ouvrez une demande.')).toBeInTheDocument();
        expect(within(faq).getByRole('link', { name: 'Écrire à un agent' })).toHaveAttribute('href', '/aide/demandes/nouvelle?categorie=activation_paiement');
        expect(within(faq).getByRole('link', { name: 'Lire l’article complet' })).toHaveAttribute('href', '/aide/articles/payer-son-pack');
    });
});
