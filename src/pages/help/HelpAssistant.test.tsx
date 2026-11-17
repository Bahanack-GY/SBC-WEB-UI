import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { fail, ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
    supportAsk: vi.fn(),
    supportEscalate: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpAssistant from './HelpAssistant';

const faq = {
    conversationId: 'c1', source: 'faq', canEscalate: true,
    answer: 'Un retrait arrive en général en quelques minutes.',
    articles: [{ slug: 'delais-retrait', title: 'Délais des retraits' }],
};
const ai = {
    conversationId: 'c1', source: 'ai', canEscalate: true,
    answer: 'D’après l’article, un retrait peut prendre jusqu’à 24 h selon l’opérateur.',
    articles: [{ slug: 'delais-retrait', title: 'Délais des retraits' }],
    route: 'withdrawal',
};

function renderAssistant(route = '/aide/assistant') {
    return renderPage(
        <Routes>
            <Route path="/aide/assistant" element={<HelpAssistant />} />
            <Route path="/aide/demandes/:id" element={<h1>Page de la demande</h1>} />
        </Routes>,
        route,
    );
}

beforeEach(() => {
    api.supportAsk.mockReset();
    api.supportEscalate.mockReset();
});

describe('Assistant', () => {
    it('says the AI never sees personal data and cannot act on money', () => {
        renderAssistant();
        expect(screen.getByText(/ne voit jamais vos données personnelles/)).toBeInTheDocument();
        expect(screen.getByText(/ne peut rien faire sur votre argent/)).toBeInTheDocument();
    });

    it('goes FAQ answer → AI answer with cited articles → ticket with the conversation', async () => {
        const user = userEvent.setup();
        api.supportAsk.mockResolvedValueOnce(ok(faq)).mockResolvedValueOnce(ok(ai));
        api.supportEscalate.mockResolvedValue(ok({ ticketId: 't42' }));
        renderAssistant();

        await user.type(screen.getByLabelText('Votre question'), 'Combien de temps prend un retrait ?');
        await user.click(screen.getByRole('button', { name: 'Envoyer la question' }));

        // Level 1: the help-centre answer, with the article to read.
        expect(await screen.findByText(faq.answer)).toBeInTheDocument();
        expect(screen.getByText('Réponse de l’aide SBC')).toBeInTheDocument();
        expect(api.supportAsk).toHaveBeenLastCalledWith('Combien de temps prend un retrait ?', undefined, undefined);
        expect(screen.queryByRole('button', { name: /Parler à un agent/ })).not.toBeInTheDocument();

        // Level 2: the same question to the AI, in the same conversation.
        await user.click(screen.getByRole('button', { name: 'Ça ne répond pas à ma question' }));
        expect(await screen.findByText(ai.answer)).toBeInTheDocument();
        expect(api.supportAsk).toHaveBeenLastCalledWith('Combien de temps prend un retrait ?', 'c1', 'ai');
        const cited = screen.getByRole('list', { name: 'Articles cités' });
        expect(within(cited).getByRole('link', { name: /Délais des retraits/ })).toHaveAttribute('href', '/aide/articles/delais-retrait');
        // The route suggestion is a button to the withdrawal status.
        expect(screen.getByRole('link', { name: 'Voir l’état de mes retraits' })).toHaveAttribute('href', '/aide/retraits');

        // Level 3: a human, with the category suggested by the route.
        await user.click(screen.getByRole('button', { name: /Parler à un agent/ }));
        const dialog = await screen.findByRole('dialog', { name: 'Parler à un agent' });
        expect(within(dialog).getByRole('radio', { name: 'Retrait' })).toBeChecked();
        await user.click(within(dialog).getByRole('button', { name: 'Envoyer à un agent' }));

        expect(api.supportEscalate).toHaveBeenCalledWith('c1', 'retrait');
        expect(await screen.findByRole('heading', { name: 'Page de la demande' })).toBeInTheDocument();
    });

    it('prefills the question from the search box', () => {
        renderAssistant('/aide/assistant?q=parrainage');
        expect(screen.getByLabelText('Votre question')).toHaveValue('parrainage');
    });

    it('explains the daily limit politely and offers an agent', async () => {
        const user = userEvent.setup();
        api.supportAsk.mockResolvedValue(fail(429, 'Too many requests'));
        renderAssistant();
        await user.type(screen.getByLabelText('Votre question'), 'Bonjour');
        await user.click(screen.getByRole('button', { name: 'Envoyer la question' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/Il vous répondra de nouveau demain/);
        expect(screen.getByRole('link', { name: /Écrire à un agent/ })).toHaveAttribute('href', '/aide/demandes/nouvelle');
    });
});
