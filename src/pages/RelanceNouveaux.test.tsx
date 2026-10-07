import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, fail, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  relanceGetStatus: vi.fn(),
  relanceGetDefaultStats: vi.fn(),
  relanceGetDefaultTargets: vi.fn(),
  relanceUpdateSettings: vi.fn(),
  relanceUpdateConfig: vi.fn(),
  relanceGetPacks: vi.fn(),
  relanceGetDefaultMessages: vi.fn(),
  relancePreviewFilters: vi.fn(),
  relanceGetSmsMessages: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

const relance = vi.hoisted(() => ({
  state: { emailBalance: 3000, smsBalance: 0, isLoading: false, hasCredits: true, refreshBalance: vi.fn() },
}));
const auth = vi.hoisted(() => ({ user: { country: 'CM', name: 'Paul' } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../contexts/RelanceContext', () => ({ useRelance: () => relance.state }));

import RelanceNouveaux from './RelanceNouveaux';

const status = (over = {}) => ({ enabled: true, sendingPaused: false, enrollmentPaused: false, messagesSentToday: 120, ...over });
const stats = (over = {}) => ({
  activeTargets: 30,
  dayProgression: [{ day: 1, count: 12 }, { day: 2, count: 8 }],
  targetsConverted: 5,
  completedRelance: 3,
  ...over,
});

beforeEach(() => {
  relance.state = { emailBalance: 3000, smsBalance: 0, isLoading: false, hasCredits: true, refreshBalance: vi.fn() };
  api.relanceGetStatus.mockResolvedValue(ok(status()));
  api.relanceGetDefaultStats.mockResolvedValue(ok(stats()));
  api.relanceGetDefaultTargets.mockResolvedValue(ok({
    targets: [{ _id: 't1', currentDay: 2, nextMessageDue: new Date(Date.now() + 3_600_000).toISOString(), referralUser: { name: 'Aïcha' } }],
    total: 1,
  }));
  api.relanceUpdateSettings.mockResolvedValue(ok({}));
  auth.user = { country: 'CM', name: 'Paul' };
  api.relanceGetSmsMessages.mockResolvedValue(ok([
    { type: 'auto', dayNumber: 0, text: 'Bienvenue ! Active ici : {{link}}' },
    { type: 'auto', dayNumber: 1, text: 'Jour 1 {{link}}' },
    { type: 'manual', dayNumber: 1, text: 'Campagne J1 {{link}}' },
  ]));
  api.relanceGetPacks.mockResolvedValue(ok({ emailPacks: [], smsPacks: [] }));
  api.relancePreviewFilters.mockResolvedValue(ok({ totalCount: 0, sampleUsers: [] }));
  api.relanceGetDefaultMessages.mockResolvedValue(ok([
    { dayNumber: 1, subject: 'Bienvenue chez SBC - Message de {{referrerName}}', text: 'Bonjour {{name}}, je suis {{referrerName}}.' },
    { dayNumber: 2, subject: 'Jour 2: Découvrez les opportunités SBC', text: 'Deuxième message pour {{name}}.' },
  ]));
});

describe('Relance des nouveaux', () => {
  it('says plainly that relance is running, and how many emails went today', async () => {
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByTestId('relance-state')).toHaveTextContent('Relance en marche');
    expect(screen.getByRole('switch', { name: 'Relance des nouveaux' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Envoyés aujourd'hui/)).toBeInTheDocument();
    expect(screen.queryByText('/ 500', { exact: false })).not.toBeInTheDocument(); // no daily limit shown
  });

  it('draws the journey from the stats — waiting is what is active on no day', async () => {
    renderPage(<RelanceNouveaux />);
    const journey = await screen.findByRole('region', { name: 'Le parcours de vos filleuls' });
    const chip = (label: string) => within(journey).getByText(label).closest('li')?.textContent;
    expect(chip('En attente')).toContain('10'); // 30 active − 12 − 8
    expect(within(journey).getByLabelText('Jour 1 : 12 filleuls')).toHaveTextContent('12');
    expect(within(journey).getByLabelText('Jour 7 : 0 filleul')).toBeInTheDocument();
    expect(chip('Ont payé')).toContain('5');
  });

  it('shows filleuls by name and day, never a fragment of a database id', async () => {
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByText('Aïcha')).toBeInTheDocument();
    expect(screen.getAllByText(/Jour 2 sur 7/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/#t1/)).not.toBeInTheDocument();
  });

  it('pauses with a single switch', async () => {
    renderPage(<RelanceNouveaux />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Relance des nouveaux' }));
    await waitFor(() => expect(api.relanceUpdateSettings).toHaveBeenCalledWith({ enabled: false }));
  });

  it('turning it on also clears the old hidden pauses, so "on" really sends', async () => {
    api.relanceGetStatus.mockResolvedValue(ok(status({ enabled: false, sendingPaused: true, enrollmentPaused: true })));
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByTestId('relance-state')).toHaveTextContent('Relance en pause');
    await userEvent.click(screen.getByRole('switch', { name: 'Relance des nouveaux' }));
    await waitFor(() => expect(api.relanceUpdateSettings).toHaveBeenCalledWith({ enabled: true, sendingPaused: false, enrollmentPaused: false }));
  });

  it('tells the parrain when a change failed, in French', async () => {
    api.relanceUpdateSettings.mockResolvedValue(fail(500, 'Failed to update settings'));
    renderPage(<RelanceNouveaux />);
    await userEvent.click(await screen.findByRole('switch', { name: 'Relance des nouveaux' }));
    expect(await screen.findByRole('status')).toHaveTextContent("Impossible de changer l'état");
  });

  it('says credits ran out — with the button to fix it — instead of looking "on"', async () => {
    relance.state = { ...relance.state, emailBalance: 0, smsBalance: 0 };
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByTestId('relance-state')).toHaveTextContent('Plus de crédits');
    expect(screen.getByRole('button', { name: 'Recharger mes crédits' })).toBeInTheDocument();
  });

  it('keeps sending however many emails went out today — no daily limit any more', async () => {
    api.relanceGetStatus.mockResolvedValue(ok(status({ messagesSentToday: 5000 })));
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByTestId('relance-state')).not.toHaveTextContent('Limite du jour');
    expect(screen.queryByText(/Reprise demain/)).not.toBeInTheDocument();
  });

  it('explains relance and offers credits to someone who has never used it', async () => {
    relance.state = { ...relance.state, emailBalance: 0, smsBalance: 0 };
    api.relanceGetDefaultStats.mockResolvedValue(ok(stats({ activeTargets: 0, dayProgression: [], targetsConverted: 0, completedRelance: 0 })));
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByText(/Relancez vos nouveaux filleuls, automatiquement/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acheter des crédits' })).toBeInTheDocument();
    // Read what goes out before paying for it.
    expect(screen.getByRole('button', { name: 'Voir les messages' })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('shows a retry when nothing loads', async () => {
    api.relanceGetStatus.mockResolvedValue(fail(500, 'boom'));
    api.relanceGetDefaultStats.mockResolvedValue(fail(500, 'boom'));
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByText('Impossible de charger la relance.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(api.relanceGetStatus).toHaveBeenCalledTimes(2));
  });

  it('has no daily email limit to set', async () => {
    renderPage(<RelanceNouveaux />);
    await screen.findByTestId('relance-state');
    expect(screen.queryByRole('button', { name: 'Réglages' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Emails maximum par jour/)).not.toBeInTheDocument();
  });

  it('sends the parrain to campaigns for their older filleuls', async () => {
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByRole('button', { name: /Relancer vos anciens filleuls/ })).toBeInTheDocument();
  });

  it('says how many older filleuls are waiting, and how many the credits cover', async () => {
    api.relancePreviewFilters.mockResolvedValue(ok({
      totalCount: 312, sampleUsers: [], budget: { emailBalance: 3000, reservedForNew: 140, maxTargets: 122 },
    }));
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByText('312 non payés (3 mois) · 122 avec vos crédits')).toBeInTheDocument();
    // Asked with the filter the wizard opens with, so the two numbers agree.
    expect(api.relancePreviewFilters).toHaveBeenCalledWith(expect.objectContaining({
      subscriptionStatus: 'non-subscribed', excludeCurrentTargets: true,
    }));
  });

  it('lets the parrain read the messages, filled in with their own name', async () => {
    renderPage(<RelanceNouveaux />);
    await userEvent.click(await screen.findByRole('button', { name: 'Voir les messages' }));
    const panel = await screen.findByRole('tabpanel');
    expect(panel).toHaveTextContent('Bienvenue chez SBC - Message de Paul');
    expect(panel).toHaveTextContent('Bonjour Marie, je suis Paul.');

    await userEvent.click(screen.getByRole('tab', { name: 'J2' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Deuxième message pour Marie.');
  });

  // Rufus's team, 2026-10-03: nothing in the app started SMS, and "Voir les
  // messages" showed only the emails. SMS stays Cameroon-only.
  describe('SMS', () => {
    it('lets a Cameroonian parrain switch SMS relance on', async () => {
      relance.state = { ...relance.state, smsBalance: 50, smsEnabled: false } as typeof relance.state;
      renderPage(<RelanceNouveaux />);
      await userEvent.click(await screen.findByRole('switch', { name: 'Relance par SMS' }));
      await waitFor(() => expect(api.relanceUpdateSettings).toHaveBeenCalledWith({ smsEnabled: true }));
      expect(relance.state.refreshBalance).toHaveBeenCalled();
    });

    it('cannot switch SMS on without SMS credits, and offers to buy some', async () => {
      relance.state = { ...relance.state, smsBalance: 0, smsEnabled: false } as typeof relance.state;
      renderPage(<RelanceNouveaux />);
      expect(await screen.findByRole('switch', { name: 'Relance par SMS' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Acheter des SMS' })).toBeInTheDocument();
    });

    it('shows no SMS control outside Cameroon', async () => {
      auth.user = { country: 'BJ', name: 'Paul' };
      relance.state = { ...relance.state, smsBalance: 0, smsEnabled: false } as typeof relance.state;
      renderPage(<RelanceNouveaux />);
      await screen.findByTestId('relance-state');
      expect(screen.queryByRole('switch', { name: 'Relance par SMS' })).not.toBeInTheDocument();
    });

    it('shows the SMS texts in "Voir les messages", with "ton lien" where the link goes', async () => {
      renderPage(<RelanceNouveaux />);
      await userEvent.click(await screen.findByRole('button', { name: 'Voir les messages' }));
      await userEvent.click(await screen.findByRole('radio', { name: 'SMS' }));
      const panel = await screen.findByRole('tabpanel');
      expect(panel).toHaveTextContent('Bienvenue ! Active ici : ton lien');
      // Relance des nouveaux days only — not the campaign texts.
      expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual(['J0', 'J1']);
    });
  });
});
