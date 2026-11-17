import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fail, ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({
    supportActivationStatus: vi.fn(),
    supportActivationCheck: vi.fn(),
}));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import HelpActivation from './HelpActivation';

const payin = { sessionId: 's1', gateway: 'feexpay', amount: 2070, currency: 'XAF', status: 'PENDING_PROVIDER', purpose: 'subscription', createdAt: '2026-11-16T10:00:00Z' };

beforeEach(() => {
    api.supportActivationStatus.mockReset();
    api.supportActivationCheck.mockReset();
    api.supportActivationStatus.mockResolvedValue(ok({ subscription: null, payins: [payin] }));
});

async function checkPayin() {
    const user = userEvent.setup();
    renderPage(<HelpActivation />, '/aide/activation');
    await user.click(await screen.findByRole('button', { name: /Vérifier le paiement 2\s070 FCFA/ }));
    return screen.findByRole('status');
}

describe('Activation check', () => {
    it('lists the recent payments in plain French', async () => {
        renderPage(<HelpActivation />, '/aide/activation');
        expect(await screen.findByText('2 070 FCFA')).toBeInTheDocument();
        expect(screen.getByText('En attente de confirmation')).toBeInTheDocument();
    });

    it('confirmé: says the account is being activated', async () => {
        api.supportActivationCheck.mockResolvedValue(ok({ result: 'confirmed' }));
        const status = await checkPayin();
        expect(status).toHaveTextContent('Paiement confirmé');
        expect(status).toHaveTextContent('votre compte s’active');
        expect(api.supportActivationCheck).toHaveBeenCalledWith({ sessionId: 's1' });
    });

    it('en attente: says we keep checking', async () => {
        api.supportActivationCheck.mockResolvedValue(ok({ result: 'pending' }));
        const status = await checkPayin();
        expect(status).toHaveTextContent('Paiement en attente');
        expect(status).toHaveTextContent('Nous continuons à vérifier');
    });

    it('introuvable: says a request was created and links to it', async () => {
        api.supportActivationCheck.mockResolvedValue(ok({ result: 'not_found', ticketId: 't9' }));
        const status = await checkPayin();
        expect(status).toHaveTextContent('Paiement introuvable');
        expect(screen.getByRole('link', { name: 'Voir ma demande' })).toHaveAttribute('href', '/aide/demandes/t9');
    });

    it('opérateur indisponible: an agent checks, the request is listed', async () => {
        api.supportActivationCheck.mockResolvedValue(ok({ result: 'provider_unavailable' }));
        const status = await checkPayin();
        expect(status).toHaveTextContent('Vérification impossible pour le moment');
        expect(screen.getByRole('link', { name: 'Voir ma demande' })).toHaveAttribute('href', '/aide/demandes');
    });

    it('échoué: offers to pay again', async () => {
        api.supportActivationCheck.mockResolvedValue(ok({ result: 'failed' }));
        const status = await checkPayin();
        expect(status).toHaveTextContent('Paiement échoué');
        expect(screen.getByRole('link', { name: 'Payer de nouveau' })).toHaveAttribute('href', '/abonnement');
    });

    it('checks a reference from the operator SMS, and refuses one too short', async () => {
        const user = userEvent.setup();
        api.supportActivationStatus.mockResolvedValue(ok({ payins: [] }));
        api.supportActivationCheck.mockResolvedValue(ok({ result: 'pending' }));
        renderPage(<HelpActivation />, '/aide/activation');
        const input = await screen.findByLabelText(/La référence/);
        await user.type(input, 'AB');
        await user.click(screen.getByRole('button', { name: 'Vérifier cette référence' }));
        expect(screen.getByRole('alert')).toHaveTextContent('Saisissez la référence complète');
        expect(api.supportActivationCheck).not.toHaveBeenCalled();

        await user.clear(input);
        await user.type(input, ' MP241117.1234 ');
        await user.click(screen.getByRole('button', { name: 'Vérifier cette référence' }));
        expect(await screen.findByRole('status')).toHaveTextContent('Paiement en attente');
        expect(api.supportActivationCheck).toHaveBeenCalledWith({ reference: 'MP241117.1234' });
    });

    it('explains the hourly limit politely', async () => {
        api.supportActivationCheck.mockResolvedValue(fail(429, 'Too many requests'));
        const user = userEvent.setup();
        renderPage(<HelpActivation />, '/aide/activation');
        await user.click(await screen.findByRole('button', { name: /Vérifier le paiement/ }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Patientez une heure');
    });

    it('says so when the account is already activated', async () => {
        api.supportActivationStatus.mockResolvedValue(ok({ subscription: { active: true }, payins: [] }));
        renderPage(<HelpActivation />, '/aide/activation');
        expect(await screen.findByText('Votre compte est activé')).toBeInTheDocument();
    });
});
