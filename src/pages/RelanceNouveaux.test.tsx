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
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

const relance = vi.hoisted(() => ({
  state: { emailBalance: 3000, smsBalance: 0, isLoading: false, hasCredits: true, refreshBalance: vi.fn() },
}));
vi.mock('../contexts/RelanceContext', () => ({ useRelance: () => relance.state }));

import RelanceNouveaux from './RelanceNouveaux';

const status = (over = {}) => ({ enabled: true, sendingPaused: false, enrollmentPaused: false, messagesSentToday: 120, maxMessagesPerDay: 500, ...over });
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
  api.relanceGetPacks.mockResolvedValue(ok({ emailPacks: [], smsPacks: [] }));
});

describe('Relance des nouveaux', () => {
  it('says plainly that relance is running, and how many emails went today', async () => {
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByTestId('relance-state')).toHaveTextContent('Relance en marche');
    expect(screen.getByRole('switch', { name: 'Relance des nouveaux' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Emails envoyés aujourd'hui/)).toBeInTheDocument();
    expect(screen.getByText('/ 500', { exact: false })).toBeInTheDocument();
  });

  it('draws the journey from the stats — waiting is what is active on no day', async () => {
    renderPage(<RelanceNouveaux />);
    const journey = await screen.findByRole('region', { name: 'Le parcours de vos filleuls' });
    // The row holding a label, read whole (a day row also shows its node number).
    const text = (label: string) => within(journey).getByText(label).closest('li')?.textContent;
    expect(text('En attente du 1er message')).toContain('10'); // 30 active − 12 − 8
    expect(text('Jour 1')).toContain('12');
    expect(text('Ont payé')).toContain('5');
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

  it('says the daily limit is reached and that sending resumes tomorrow', async () => {
    api.relanceGetStatus.mockResolvedValue(ok(status({ messagesSentToday: 500 })));
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByTestId('relance-state')).toHaveTextContent('Limite du jour atteinte');
    expect(screen.getByText(/partent demain/)).toBeInTheDocument();
  });

  it('explains relance and offers credits to someone who has never used it', async () => {
    relance.state = { ...relance.state, emailBalance: 0, smsBalance: 0 };
    api.relanceGetDefaultStats.mockResolvedValue(ok(stats({ activeTargets: 0, dayProgression: [], targetsConverted: 0, completedRelance: 0 })));
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByText(/Relancez vos nouveaux filleuls, automatiquement/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acheter des crédits' })).toBeInTheDocument();
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

  it('saves a new daily limit from the settings', async () => {
    api.relanceUpdateConfig.mockResolvedValue(ok({}));
    renderPage(<RelanceNouveaux />);
    await userEvent.click(await screen.findByRole('button', { name: 'Réglages' }));
    await userEvent.click(screen.getByRole('button', { name: 'Plus' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(api.relanceUpdateConfig).toHaveBeenCalledWith({ maxMessagesPerDay: 550 }));
  });

  it('sends the parrain to campaigns for their older filleuls', async () => {
    renderPage(<RelanceNouveaux />);
    expect(await screen.findByRole('button', { name: /Relancer vos anciens filleuls/ })).toBeInTheDocument();
  });
});
