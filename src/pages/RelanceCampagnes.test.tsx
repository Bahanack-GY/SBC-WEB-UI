import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
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
  relanceGetCampaignSuggestion: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

const relance = vi.hoisted(() => ({ state: { emailBalance: 3000, smsBalance: 0, isLoading: false, hasCredits: true, refreshBalance: vi.fn() } }));
const auth = vi.hoisted(() => ({ user: { country: 'CM' } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
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
  api.relanceGetCampaignSuggestion.mockResolvedValue(ok(null));
});

describe('Campagnes de relance — the list', () => {
  it('says who campaigns are for when there are none', async () => {
    renderPage(<RelanceCampagnes />);
    expect(await screen.findByText("Aucune campagne pour l'instant")).toBeInTheDocument();
    expect(screen.getByText('Relancez vos anciens filleuls')).toBeInTheDocument();
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
    expect(within(journey).getByLabelText('Jour 3 : 20 filleuls')).toHaveTextContent('20');
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

  // Sterling: older filleuls are relanced within the budget; relance des
  // nouveaux keeps running alongside, so the server keeps a month of it back.
  describe('with SMS (Cameroon)', () => {
    const toMessageStep = async (wizard: HTMLElement) => {
      await within(wizard).findByText('142');
      await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
      await within(wizard).findByRole('button', { name: /Les messages SBC/ });
    };
    const launchFrom = async (wizard: HTMLElement) => {
      await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
      await userEvent.click(within(wizard).getByRole('button', { name: 'Lancer la campagne' }));
      await waitFor(() => expect(api.relanceCreateCampaign).toHaveBeenCalled());
      return api.relanceCreateCampaign.mock.calls[0][0];
    };
    afterEach(() => {
      auth.user = { country: 'CM' };
      relance.state = { ...relance.state, smsBalance: 0, smsEnabled: false } as typeof relance.state;
    });

    it('sends the campaign with SMS when SMS is on and paid for', async () => {
      relance.state = { ...relance.state, smsBalance: 100, smsEnabled: true } as typeof relance.state;
      const wizard = await openWizard();
      await toMessageStep(wizard);
      expect(within(wizard).getByRole('switch', { name: 'Aussi par SMS' })).toBeChecked();
      expect((await launchFrom(wizard)).channel).toBe('both');
    });

    it('sends it by email only when the parrain turns SMS off for this campaign', async () => {
      relance.state = { ...relance.state, smsBalance: 100, smsEnabled: true } as typeof relance.state;
      const wizard = await openWizard();
      await toMessageStep(wizard);
      await userEvent.click(within(wizard).getByRole('switch', { name: 'Aussi par SMS' }));
      expect((await launchFrom(wizard)).channel).toBe('email');
    });

    it('says where to switch SMS on when it is off', async () => {
      relance.state = { ...relance.state, smsBalance: 100, smsEnabled: false } as typeof relance.state;
      const wizard = await openWizard();
      await toMessageStep(wizard);
      expect(within(wizard).getByText(/active-les sur la page Relance/)).toBeInTheDocument();
      expect((await launchFrom(wizard)).channel).toBe('email');
    });

    it('offers nothing about SMS outside Cameroon', async () => {
      auth.user = { country: 'SN' };
      relance.state = { ...relance.state, smsBalance: 100, smsEnabled: true } as typeof relance.state;
      const wizard = await openWizard();
      await toMessageStep(wizard);
      expect(within(wizard).queryByRole('switch', { name: 'Aussi par SMS' })).not.toBeInTheDocument();
      expect((await launchFrom(wizard)).channel).toBe('email');
    });
  });

  describe('within the budget', () => {
    const overBudget = () => api.relancePreviewFilters.mockResolvedValue(ok({
      totalCount: 300, sampleUsers: [], budget: { emailBalance: 1000, reservedForNew: 140, maxTargets: 122 },
    }));
    const launch = async (wizard: HTMLElement) => {
      await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
      await within(wizard).findByRole('button', { name: /Les messages SBC/ });
      await userEvent.click(within(wizard).getByRole('button', { name: 'Continuer' }));
      await userEvent.click(within(wizard).getByRole('button', { name: 'Lancer la campagne' }));
      await waitFor(() => expect(api.relanceCreateCampaign).toHaveBeenCalled());
      return api.relanceCreateCampaign.mock.calls[0][0];
    };

    it('offers to keep to the credits, newest filleuls first, and does so by default', async () => {
      overBudget();
      const wizard = await openWizard();
      expect(await within(wizard).findByText('Selon vos crédits : 122 les plus récents')).toBeInTheDocument();
      expect(within(wizard).getByText('140 crédits gardés pour la relance des nouveaux')).toBeInTheDocument();
      expect(within(wizard).getByRole('switch', { name: 'Selon vos crédits' })).toBeChecked();
      expect((await launch(wizard)).targetFilter.maxTargets).toBe(122);
    });

    it('relances everyone matching when the parrain turns it off', async () => {
      overBudget();
      const wizard = await openWizard();
      await userEvent.click(await within(wizard).findByRole('switch', { name: 'Selon vos crédits' }));
      expect((await launch(wizard)).targetFilter).not.toHaveProperty('maxTargets');
    });

    it('when new filleuls need every credit, says so plainly and lets the parrain take them back (millioncfa, 2026-10-07)', async () => {
      relance.state = { ...relance.state, emailBalance: 4303 };
      api.relancePreviewFilters.mockResolvedValue(ok({
        totalCount: 29821, sampleUsers: [], budget: { emailBalance: 4303, reservedForNew: 12999, maxTargets: 0 },
      }));
      const wizard = await openWizard();
      // Never "12999 crédits gardés" when there are only 4303.
      expect(await within(wizard).findByText('Vos 4303 crédits vont à vos nouveaux filleuls')).toBeInTheDocument();
      expect(within(wizard).getByText('Désactivez pour les utiliser dans cette campagne.')).toBeInTheDocument();
      expect(within(wizard).getByRole('button', { name: 'Continuer' })).toBeDisabled();
      await userEvent.click(within(wizard).getByRole('switch', { name: 'Selon vos crédits' }));
      expect(within(wizard).getByRole('button', { name: 'Continuer' })).toBeEnabled();
    });

    it('says nothing about budget when the credits cover everyone', async () => {
      api.relancePreviewFilters.mockResolvedValue(ok({
        totalCount: 50, sampleUsers: [], budget: { emailBalance: 3000, reservedForNew: 0, maxTargets: 428 },
      }));
      const wizard = await openWizard();
      await within(wizard).findByText('50');
      expect(within(wizard).queryByRole('switch', { name: 'Selon vos crédits' })).not.toBeInTheDocument();
      expect((await launch(wizard)).targetFilter).not.toHaveProperty('maxTargets');
    });
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

describe('Campagnes de relance — counting a big network', () => {
  const openWizard = async () => {
    renderPage(<RelanceCampagnes />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nouvelle campagne' }));
    return screen.findByRole('dialog', { name: 'Nouvelle campagne de relance' });
  };

  it('never shows the previous period\'s number while a long count runs — « 1 » read as « Depuis toujours »', async () => {
    api.relancePreviewFilters.mockResolvedValueOnce(ok({ totalCount: 1, sampleUsers: [{ name: 'Benae' }] }));
    const wizard = await openWizard();
    expect(await within(wizard).findByText('1')).toBeInTheDocument();
    api.relancePreviewFilters.mockReturnValue(new Promise(() => {})); // 35,000 filleuls: still counting
    await userEvent.click(within(wizard).getByRole('button', { name: 'Depuis toujours' }));
    expect(await within(wizard).findByText('Calcul en cours…')).toBeInTheDocument();
    expect(within(wizard).queryByText('1')).not.toBeInTheDocument();
    expect(within(wizard).getByRole('button', { name: 'Continuer' })).toBeDisabled();
  });

  it('keeps the page behind from scrolling while the wizard is open, and gives it back after', async () => {
    const wizard = await openWizard();
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.click(within(wizard).getByRole('button', { name: 'Fermer' }));
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });
});

describe('Campagnes de relance — the suggested campaign', () => {
  it('points a parrain with unused credits to their unpaid filleuls of the last 30 days', async () => {
    api.relanceGetCampaignSuggestion.mockResolvedValue(ok({ period: '30d', from: '2026-09-05T10:00:00Z', to: '2026-10-05T10:00:00Z', count: 42, affordable: 42 }));
    renderPage(<RelanceCampagnes />);
    const card = await screen.findByRole('region', { name: 'Campagne suggérée' });
    expect(within(card).getByText(/42 filleuls inscrits ces 30 derniers jours n'ont pas encore payé/)).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Préparer la campagne' }));
    const wizard = await screen.findByRole('dialog', { name: 'Nouvelle campagne de relance' });
    expect(within(wizard).getByRole('button', { name: '30 derniers jours' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('names the busiest month, and says how many the credits cover', async () => {
    api.relanceGetCampaignSuggestion.mockResolvedValue(ok({ period: 'custom', from: '2026-07-01T00:00:00.000Z', to: '2026-07-31T23:59:59.999Z', count: 30, affordable: 12 }));
    renderPage(<RelanceCampagnes />);
    const card = await screen.findByRole('region', { name: 'Campagne suggérée' });
    expect(within(card).getByText(/30 filleuls inscrits en juillet 2026/)).toBeInTheDocument();
    expect(within(card).getByText(/Vos crédits en couvrent 12/)).toBeInTheDocument();
  });

  it('shows nothing when there is nothing to suggest', async () => {
    renderPage(<RelanceCampagnes />);
    await screen.findByText("Aucune campagne pour l'instant");
    expect(screen.queryByRole('region', { name: 'Campagne suggérée' })).not.toBeInTheDocument();
  });
});
