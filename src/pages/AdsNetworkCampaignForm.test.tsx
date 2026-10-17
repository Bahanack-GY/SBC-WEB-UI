import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  getAdsQuote: vi.fn(),
  getAdsReach: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({ balance: 0 }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { balance: auth.balance }, refreshUser: vi.fn() }),
}));

import AdsNetworkCampaignForm from './AdsNetworkCampaignForm';

beforeEach(() => {
  vi.clearAllMocks();
  auth.balance = 0;
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

// Rufus (2026-10-17): « payer ou compléter la campagne avec son solde SBC ».
describe('paying with the SBC balance', () => {
  it('offers the balance only to a member who has some', async () => {
    renderPage(<AdsNetworkCampaignForm />);
    await screen.findByPlaceholderText(/Villes/);
    expect(screen.queryByText(/Utiliser mon solde SBC/)).not.toBeInTheDocument();
  });

  it('shows what is available and that the rest goes by Mobile Money', async () => {
    auth.balance = 2500;
    renderPage(<AdsNetworkCampaignForm />);
    expect(await screen.findByText(/Utiliser mon solde SBC \(2\s?500 F disponibles\)/)).toBeInTheDocument();
    expect(screen.getByText(/le reste se paie par Mobile Money/)).toBeInTheDocument();
  });
});
