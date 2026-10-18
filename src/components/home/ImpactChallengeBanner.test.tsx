import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import { ok, fail, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ getCurrentImpactChallenge: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));

import ImpactChallengeBanner from './ImpactChallengeBanner';
import { timeLeftLabel } from '../../hooks/useImpactChallenge';

const DAY = 86_400_000;

beforeEach(() => {
  vi.clearAllMocks();
});

const settle = async () => {
  await waitFor(() => expect(api.getCurrentImpactChallenge).toHaveBeenCalled());
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

  it('time left', () => {
    const now = Date.parse('2026-10-15T12:00:00Z');
    expect(timeLeftLabel('2026-10-17T12:00:00Z', now)).toBe('Fin dans 2 jours');
    expect(timeLeftLabel('2026-10-16T13:00:00Z', now)).toBe('Fin dans 1 jour');
    expect(timeLeftLabel('2026-10-15T17:30:00Z', now)).toBe('Fin dans 5 h');
    expect(timeLeftLabel('2026-10-15T12:20:00Z', now)).toBe('Fin dans 20 min');
    expect(timeLeftLabel('2026-10-15T11:00:00Z', now)).toBe('Votes terminés');
  });
});
