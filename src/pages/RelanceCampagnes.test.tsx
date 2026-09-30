import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  relanceGetCampaigns: vi.fn(),
  relanceGetCampaignStats: vi.fn(),
  relancePauseCampaign: vi.fn(),
  relanceResumeCampaign: vi.fn(),
  relanceCancelCampaign: vi.fn(),
  relanceDeleteCampaign: vi.fn(),
  relancePreviewFilters: vi.fn(),
  relanceCreateCampaign: vi.fn(),
  relanceStartCampaign: vi.fn(),
  relancePreviewMessage: vi.fn(),
  relanceGetPacks: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

const relance = vi.hoisted(() => ({ state: { emailBalance: 3000, smsBalance: 0, isLoading: false, hasCredits: true, refreshBalance: vi.fn() } }));
vi.mock('../contexts/RelanceContext', () => ({ useRelance: () => relance.state }));

import RelanceCampagnes from './RelanceCampagnes';

const campaign = (over = {}) => ({
  _id: 'c1', userId: 'u1', name: 'Anciens de juin', type: 'filtered', status: 'active',
  targetsEnrolled: 40, messagesSent: 120, messagesDelivered: 118, messagesFailed: 2, targetsCompleted: 10, targetsExited: 0,
  createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z', startedAt: '2026-09-01T10:00:00Z',
  ...over,
});

beforeEach(() => {
  relance.state = { emailBalance: 3000, smsBalance: 0, isLoading: false, hasCredits: true, refreshBalance: vi.fn() };
  api.relanceGetCampaigns.mockResolvedValue(ok({ campaigns: [], total: 0 }));
  api.relanceGetCampaignStats.mockResolvedValue(ok({
    totalEnrolled: 40, activeTargets: 25, targetsConverted: 4, completedRelance: 10, totalMessagesSent: 120,
    dayProgression: [{ day: 3, count: 20 }], exitReasons: { paid: 4 },
  }));
  api.relancePreviewFilters.mockResolvedValue(ok({ totalCount: 142, sampleUsers: [{ name: 'Awa' }, { name: 'Brice' }] }));
  api.relanceCreateCampaign.mockResolvedValue(ok({ _id: 'new1', status: 'draft' }));
  api.relanceStartCampaign.mockResolvedValue(ok({}));
  api.relanceGetPacks.mockResolvedValue(ok({ emailPacks: [], smsPacks: [] }));
});

describe('Campagnes de relance — the list', () => {
  it('explains what campaigns are for when there are none', async () => {
    renderPage(<RelanceCampagnes />);
    expect(await screen.findByText("Aucune campagne pour l'instant")).toBeInTheDocument();
    expect(screen.getByText(/ne concerne que les filleuls qui s'inscrivent à partir de maintenant/)).toBeInTheDocument();
  });

  it('separates running campaigns from finished ones, with plain status words', async () => {
    api.relanceGetCampaigns.mockResolvedValue(ok({
      campaigns: [campaign(), campaign({ _id: 'c2', name: 'Vieux filleuls', status: 'cancelled' })],
    }));
    renderPage(<RelanceCampagnes />);
    const running = await screen.findByRole('region', { name: 'En cours' });
    expect(within(running).getByText('Anciens de juin')).toBeInTheDocument();
    expect(within(running).getByText('En cours', { selector: 'span' })).toBeInTheDocument();
    const done = screen.getByRole('region', { name: 'Terminées' });
    expect(within(done).getByText('Arrêtée')).toBeInTheDocument();
  });

  it('asks for credits first when there are none', async () => {
    relance.state = { ...relance.state, emailBalance: 0 };
    renderPage(<RelanceCampagnes />);
    expect(await screen.findByRole('button', { name: /Acheter des crédits pour commencer/ })).toBeInTheDocument();
  });
});

describe('Campagnes de relance — one campaign', () => {
  beforeEach(() => {
    api.relanceGetCampaigns.mockResolvedValue(ok({ campaigns: [campaign()] }));
  });

  it('pauses on one tap — a pause can be undone', async () => {
    api.relancePauseCampaign.mockResolvedValue(ok({}));
    renderPage(<RelanceCampagnes />);
    await userEvent.click(await screen.findByRole('button', { name: /Anciens de juin/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mettre en pause' }));
    await waitFor(() => expect(api.relancePauseCampaign).toHaveBeenCalledWith('c1'));
  });

  it('asks before stopping — the old page stopped a campaign on one tap of "Annuler"', async () => {
    api.relanceCancelCampaign.mockResolvedValue(ok({}));
    renderPage(<RelanceCampagnes />);
    await userEvent.click(await screen.findByRole('button', { name: /Anciens de juin/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Arrêter' }));

    expect(await screen.findByText('Arrêter la campagne ?')).toBeInTheDocument();
    expect(api.relanceCancelCampaign).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(api.relanceCancelCampaign).not.toHaveBeenCalled();

    await userEvent.click(await screen.findByRole('button', { name: 'Arrêter' }));
    const dialog = await screen.findByRole('dialog', { name: 'Arrêter la campagne ?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Arrêter' }));
    await waitFor(() => expect(api.relanceCancelCampaign).toHaveBeenCalledWith('c1'));
  });

  it('shows the campaign\'s own journey, including who paid', async () => {
    renderPage(<RelanceCampagnes />);
    await userEvent.click(await screen.findByRole('button', { name: /Anciens de juin/ }));
    const journey = await screen.findByRole('region', { name: 'Le parcours de vos filleuls' });
    expect(within(journey).getByText('Jour 3').closest('li')).toHaveTextContent('20');
    expect(within(journey).getByText('Ont payé').closest('li')).toHaveTextContent('4');
  });

  it('only offers delete once a campaign is over', async () => {
    api.relanceGetCampaigns.mockResolvedValue(ok({ campaigns: [campaign({ status: 'completed' })] }));
    renderPage(<RelanceCampagnes />);
    await userEvent.click(await screen.findByRole('button', { name: /Anciens de juin/ }));
    expect(await screen.findByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Arrêter' })).not.toBeInTheDocument();
  });

  it('reports a failed action in French', async () => {
    api.relancePauseCampaign.mockResolvedValue(fail(404, 'Campaign not found'));
    renderPage(<RelanceCampagnes />);
    await userEvent.click(await screen.findByRole('button', { name: /Anciens de juin/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mettre en pause' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Campagne introuvable.');
  });
});

describe('Campagnes de relance — creating one', () => {
  const openWizard = async () => {
    renderPage(<RelanceCampagnes />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nouvelle campagne' }));
    return screen.findByRole('dialog', { name: 'Nouvelle campagne de relance' });
  };

  it('counts who a campaign would reach, live', async () => {
    const wizard = await openWizard();
    expect(await within(wizard).findByText('142')).toBeInTheDocument();
    expect(within(wizard).getByText(/filleuls non payés correspondent/)).toBeInTheDocument();
    expect(api.relancePreviewFilters).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionStatus: 'non-subscribed',
      excludeCurrentTargets: true,
    }));
  });

  it('will not continue when nobody matches', async () => {
    api.relancePreviewFilters.mockResolvedValue(ok({ totalCount: 0, sampleUsers: [] }));
    const wizard = await openWizard();
    expect(await within(wizard).findByText(/Élargissez la période/)).toBeInTheDocument();
    expect(within(wizard).getByRole('button', { name: 'Continuer' })).toBeDisabled();
  });

  it('narrows by country through a searchable list', async () => {
    const wizard = await openWizard();
    await userEvent.click(within(wizard).getByRole('button', { name: 'Tous les pays' }));
    await userEvent.type(within(wizard).getByRole('textbox', { name: 'Chercher un pays' }), 'camer');
    await userEvent.click(within(wizard).getByRole('checkbox'));
    await waitFor(() => expect(api.relancePreviewFilters).toHaveBeenLastCalledWith(expect.objectContaining({ countries: ['CM'] })));
  });

  it('puts the cursor in the country search as soon as the list opens', async () => {
    const wizard = await openWizard();
    await userEvent.click(within(wizard).getByRole('button', { name: 'Tous les pays' }));
    expect(within(wizard).getByRole('textbox', { name: 'Chercher un pays' })).toHaveFocus();
  });

  it('lists countries by name and finds them without accents', async () => {
    const wizard = await openWizard();
    await userEvent.click(within(wizard).getByRole('button', { name: 'Tous les pays' }));
    const names = within(wizard).getAllByRole('checkbox').map(box => box.closest('label')!.textContent!.trim());
    expect(names.findIndex(n => n.endsWith('Bénin'))).toBeLessThan(names.findIndex(n => n.endsWith('Burundi')));

    await userEvent.keyboard('benin');
    expect(within(wizard).getAllByRole('checkbox')).toHaveLength(1);
    expect(within(wizard).getByText(/Bénin/)).toBeInTheDocument();
  });

  it('launches with SBC\'s messages by default, and starts the campaign it created', async () => {
    const wizard = await openWizard();
    await within(wizard).findByText('142');
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    // Steps swap with an exit-then-enter animation, so the next one arrives a beat later.
    expect(await within(wizard).findByRole('button', { name: /Les messages SBC/ })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    await userEvent.click(within(wizard).getByRole('button', { name: 'Lancer la campagne' }));

    await waitFor(() => expect(api.relanceStartCampaign).toHaveBeenCalledWith('new1'));
    const payload = api.relanceCreateCampaign.mock.calls[0][0];
    expect(payload).not.toHaveProperty('customMessages');
    expect(payload.targetFilter.subscriptionStatus).toBe('non-subscribed');
    expect(await within(wizard).findByText('Campagne lancée')).toBeInTheDocument();
  });

  it('sends the parrain\'s own message for the day they wrote, in French only', async () => {
    const wizard = await openWizard();
    await within(wizard).findByText('142');
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    await userEvent.click(await within(wizard).findByRole('button', { name: /Mes propres messages/ }));
    await userEvent.type(within(wizard).getByRole('textbox', { name: 'Message du jour 1' }), 'Bonjour ');
    await userEvent.click(within(wizard).getByRole('button', { name: '+ Prénom du filleul' }));
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    await userEvent.click(within(wizard).getByRole('button', { name: 'Lancer la campagne' }));

    await waitFor(() => expect(api.relanceCreateCampaign).toHaveBeenCalled());
    expect(api.relanceCreateCampaign.mock.calls[0][0].customMessages).toEqual([
      { dayNumber: 1, messageTemplate: { fr: 'Bonjour {{name}}', en: 'Bonjour {{name}}' } },
    ]);
  });

  it('warns — without blocking — when credits cover only part of the campaign', async () => {
    relance.state = { ...relance.state, emailBalance: 70 }; // 10 filleuls' worth, 142 chosen
    const wizard = await openWizard();
    await within(wizard).findByText('142');
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    expect(await within(wizard).findByText(/couvrent environ 10 filleuls/)).toBeInTheDocument();
    expect(within(wizard).getByRole('button', { name: 'Lancer la campagne' })).toBeEnabled();
  });

  it('shows the server\'s French refusal instead of an English one', async () => {
    api.relanceCreateCampaign.mockResolvedValue(fail(400, "Vous n'avez plus de crédits de relance. Rechargez pour lancer une campagne."));
    const wizard = await openWizard();
    await within(wizard).findByText('142');
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
    await userEvent.click(within(wizard).getByRole('button', { name: 'Lancer la campagne' }));
    expect(await within(wizard).findByRole('alert')).toHaveTextContent('Rechargez pour lancer une campagne');
    expect(api.relanceStartCampaign).not.toHaveBeenCalled();
  });
});
