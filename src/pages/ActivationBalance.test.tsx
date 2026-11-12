import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  getActivationBalance: vi.fn(),
  getActivationPricing: vi.fn(),
  getActivationReferrals: vi.fn(),
  getActivationTransactionHistory: vi.fn(),
  sponsorReferralActivation: vi.fn(),
  generateThumbnailUrl: vi.fn(() => ''),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { balance: 0 }, refreshUser: vi.fn(), isAuthenticated: true, loading: false }),
}));
vi.mock('../components/common/ProtectedRoute', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import ActivationBalance from './ActivationBalance';

const referral = (over: Record<string, unknown>) => ({
  email: 'f@x.test', referralLevel: 1, hasActiveSubscription: true, canUpgrade: false,
  canUpgradeToWinner: false, createdAt: '2026-11-01T10:00:00.000Z', ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  api.getActivationBalance.mockResolvedValue(ok({ activationBalance: 20000, totalSponsored: 0, sponsoredCount: 0 }));
  api.getActivationPricing.mockResolvedValue(ok({
    pricing: { CLASSIQUE: 2150, CIBLE: 5300, UPGRADE: 3150, WINNER: 15900, WINNER_FROM_CLASSIQUE: 13650, WINNER_FROM_CIBLE: 10600 },
    minimumTransfers: { toActivation: 100 },
  }));
  api.getActivationTransactionHistory.mockResolvedValue({ isSuccessByStatusCode: true, body: { data: [], pagination: { totalPages: 1 } } });
  api.getActivationReferrals.mockResolvedValue(ok({
    referrals: [
      referral({ _id: 'r-cible', name: 'Filleul Ciblé', currentSubscriptionType: 'CIBLE', canUpgradeToWinner: true }),
      referral({ _id: 'r-classique', name: 'Filleul Classique', currentSubscriptionType: 'CLASSIQUE', canUpgrade: true, canUpgradeToWinner: true }),
      referral({ _id: 'r-winner', name: 'Filleul Winner', currentSubscriptionType: 'WINNER' }),
      referral({ _id: 'r-new', name: 'Filleul Nouveau', hasActiveSubscription: false, currentSubscriptionType: null }),
    ],
    total: 4, page: 1, pages: 1,
  }));
  api.sponsorReferralActivation.mockResolvedValue(ok({ success: true }));
});

const openReferral = async (name: string) => {
  await userEvent.click(await screen.findByRole('button', { name: /Filleuls/ }));
  const card = (await screen.findByText(name)).closest('.rounded-xl') as HTMLElement;
  return card;
};

describe('ActivationBalance — Pack Winner', () => {
  it('lists the Winner tariffs', async () => {
    renderPage(<ActivationBalance />);
    expect(await screen.findByText('PACK WINNER')).toBeInTheDocument();
    expect(screen.getByText('UPGRADE (CLASSIQUE → WINNER)').nextSibling).toHaveTextContent('13 650');
    expect(screen.getByText('UPGRADE (CIBLE → WINNER)').nextSibling).toHaveTextContent('10 600');
  });

  it('upgrades a Ciblé filleul to Winner at the Ciblé price', async () => {
    renderPage(<ActivationBalance />);
    const card = await openReferral('Filleul Ciblé');
    await userEvent.click(within(card).getByRole('button', { name: /Upgrade/ }));
    const option = await screen.findByRole('button', { name: /Upgrade vers Pack Winner/ });
    expect(option).toHaveTextContent('10 600');
    expect(screen.queryByRole('button', { name: /Upgrade vers CIBLE/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    await waitFor(() => expect(api.sponsorReferralActivation).toHaveBeenCalledWith('r-cible', 'WINNER'));
  });

  it('offers a Classique filleul both upgrades', async () => {
    renderPage(<ActivationBalance />);
    const card = await openReferral('Filleul Classique');
    await userEvent.click(within(card).getByRole('button', { name: /Upgrade/ }));
    expect(await screen.findByRole('button', { name: /Upgrade vers CIBLE/ })).toHaveTextContent('3 150');
    expect(screen.getByRole('button', { name: /Upgrade vers Pack Winner/ })).toHaveTextContent('13 650');
  });

  it('offers Pack Winner to a filleul without a pack, and nothing to a Winner', async () => {
    renderPage(<ActivationBalance />);
    const winnerCard = await openReferral('Filleul Winner');
    expect(within(winnerCard).queryByRole('button')).not.toBeInTheDocument();
    expect(within(winnerCard).getByText('Actif')).toBeInTheDocument();
    const card = (screen.getByText('Filleul Nouveau')).closest('.rounded-xl') as HTMLElement;
    await userEvent.click(within(card).getByRole('button', { name: /Activer/ }));
    expect(await screen.findByRole('button', { name: /Pack Winner/ })).toHaveTextContent('15 900');
  });
});
