import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  getAdsQuote: vi.fn(),
  getAdsReach: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));

import AdsNetworkCampaignForm from './AdsNetworkCampaignForm';

beforeEach(() => {
  vi.clearAllMocks();
  api.getAdsQuote.mockResolvedValue(ok({ views: 2000 }));
  api.getAdsReach.mockResolvedValue(ok({ eligible: 100 }));
});

const lastReachCities = () => {
  const calls = api.getAdsReach.mock.calls;
  return calls[calls.length - 1]?.[0]?.targeting?.cities;
};

// Rufus (2026-10-17): "cibler plusieurs villes, c'est pas possible". Phone
// keyboards often send no Entrée/"," key to the page, so the chip never formed.
describe('targeting several cities', () => {
  it('a comma makes a chip, and "Ajouter" adds the city still in the field', async () => {
    renderPage(<AdsNetworkCampaignForm />);
    const input = await screen.findByPlaceholderText(/Villes/);
    await userEvent.type(input, 'Douala, Kribi');
    expect(screen.getByRole('button', { name: 'Douala ×' })).toBeInTheDocument();
    expect(input).toHaveValue('Kribi');

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }));
    expect(screen.getByRole('button', { name: 'Kribi ×' })).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('a city typed but never turned into a chip still counts', async () => {
    renderPage(<AdsNetworkCampaignForm />);
    const input = await screen.findByPlaceholderText(/Villes/);
    await userEvent.type(input, 'Douala, Bafoussam');
    await waitFor(() => expect(lastReachCities()).toEqual(['Douala', 'Bafoussam']));
  });
});
