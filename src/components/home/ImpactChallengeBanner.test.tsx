import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ getCurrentImpactChallenge: vi.fn(), impactCurrent: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import ImpactChallengeBanner from './ImpactChallengeBanner';
import { timeLeftLabel } from '../../hooks/useImpactChallenge';

const DAY = 86_400_000;

beforeEach(() => {
  vi.clearAllMocks();
  api.impactCurrent.mockResolvedValue(ok(null));
});

const settle = async () => {
  await waitFor(() => expect(api.getCurrentImpactChallenge).toHaveBeenCalled());
  await waitFor(() => expect(api.impactCurrent).toHaveBeenCalled());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

describe('Impact Challenge on the home page', () => {
  it('links to the challenge while one is open to votes', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(ok({
      challenge: {
        _id: 'c1', campaignName: 'Impact Challenge Octobre', status: 'active',
        startDate: new Date(Date.now() - DAY).toISOString(),
        endDate: new Date(Date.now() + 4 * DAY + 60_000).toISOString(),
        description: { fr: '', en: '' }, totalCollected: 0, totalVoteCount: 0,
      },
      entrepreneurs: [{ _id: 'e1' }, { _id: 'e2' }, { _id: 'e3' }],
    }));
    renderPage(<ImpactChallengeBanner />);
    const link = await screen.findByRole('link', { name: /Impact Challenge Octobre/ });
    expect(link).toHaveAttribute('href', '/impact-challenge');
    expect(link).toHaveTextContent('3 entrepreneurs · Fin dans 4 jours');
  });

  it('is not shown when no challenge is running (404)', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(404, 'No active challenge found'));
    const { container } = renderPage(<ImpactChallengeBanner />);
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it('is not shown when the service fails', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(500, 'boom'));
    const { container } = renderPage(<ImpactChallengeBanner />);
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the v2 candidate space while an edition is live, even with no monthly challenge', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(404, 'No active challenge found'));
    api.impactCurrent.mockResolvedValue(ok({
      _id: 'ed1', name: 'SBC Impact Challenge 2027', status: 'QUALIFICATION', registrationOpen: true,
      seats: { taken: 5, max: 20 }, settings: { invitationsRequired: 10 },
    }));
    renderPage(<ImpactChallengeBanner />);
    const link = await screen.findByRole('link', { name: /SBC Impact Challenge : devenez candidat/ });
    expect(link).toHaveAttribute('href', '/impact-challenge/candidat');
    expect(link).toHaveTextContent('5/20 places prises');
    expect(screen.queryByRole('link', { name: /Voter/ })).not.toBeInTheDocument();
  });

  it('during the competition, leads to the board instead', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(404, 'No active challenge found'));
    api.impactCurrent.mockResolvedValue(ok({
      _id: 'ed1', name: 'SBC Impact Challenge 2027', status: 'COMPETITION', stage: 'WEEK2', registrationOpen: false,
      seats: { taken: 20, max: 20 }, settings: { invitationsRequired: 10 },
      rounds: { FREE: { status: 'OPEN', opensAt: null, closesAt: null, openedAt: null, closedAt: null }, PAID: null },
    }));
    renderPage(<ImpactChallengeBanner />);
    const link = await screen.findByRole('link', { name: /votez pour les candidats/ });
    expect(link).toHaveAttribute('href', '/impact-challenge/candidats');
    expect(link).toHaveTextContent('Vote gratuit ouvert.');
  });

  it('during the live final, leads to the live screen', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(404, 'No active challenge found'));
    api.impactCurrent.mockResolvedValue(ok({
      _id: 'ed1', name: 'SBC Impact Challenge 2027', status: 'FINAL', stage: 'LIVE', registrationOpen: false,
      seats: { taken: 20, max: 20 }, settings: { invitationsRequired: 10 }, rounds: { FREE: null, PAID: null },
    }));
    renderPage(<ImpactChallengeBanner />);
    const link = await screen.findByRole('link', { name: /la finale en direct/ });
    expect(link).toHaveAttribute('href', '/impact-challenge/finale');
  });

  it('is not shown when the edition call fails and no challenge runs', async () => {
    api.getCurrentImpactChallenge.mockResolvedValue(fail(404, 'No active challenge found'));
    api.impactCurrent.mockResolvedValue(fail(500, 'boom'));
    const { container } = renderPage(<ImpactChallengeBanner />);
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it('time left', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    expect(timeLeftLabel('2026-10-17T12:00:00Z', now)).toBe('Fin dans 2 jours');
    expect(timeLeftLabel('2026-10-16T13:00:00Z', now)).toBe('Fin dans 1 jour');
    expect(timeLeftLabel('2026-10-15T17:30:00Z', now)).toBe('Fin dans 5 h');
    expect(timeLeftLabel('2026-10-15T12:20:00Z', now)).toBe('Fin dans 20 min');
    expect(timeLeftLabel('2026-10-15T11:00:00Z', now)).toBe('Votes terminés');
  });
});
