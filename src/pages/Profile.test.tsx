import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({
  getSubscriptionOffers: vi.fn(),
  getMyAffiliator: vi.fn(),
  getReferralStats: vi.fn(),
  generateSettingsFileUrl: vi.fn(() => ''),
  generateThumbnailUrl: vi.fn(() => ''),
  updateUserProfile: vi.fn(),
}));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({
  user: { _id: 'u1', name: 'Membre', email: 'm@x.test', referralCode: 'code1', activeSubscriptions: ['CIBLE'] } as Record<string, unknown>,
  isAuthenticated: true,
  loading: false,
  logout: vi.fn(),
  refreshUser: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/common/TourProvider', () => ({ useTour: () => ({ startTour: vi.fn(), hasSeenTour: () => true }) }));

import Profile from './Profile';

const LINK = 'https://chat.whatsapp.com/vip-test';

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyAffiliator.mockResolvedValue(ok(null));
  api.getReferralStats.mockResolvedValue(ok({ directReferrals: 0, indirectReferrals: 0 }));
  api.getSubscriptionOffers.mockResolvedValue(ok({ winner: { owned: true, vipGroupLink: LINK, extraNumberSlots: 3 } }));
});

describe('Profile: VIP group (Pack Winner)', () => {
  it('gives a Winner member the "Rejoindre le groupe VIP" button', async () => {
    auth.user = { ...auth.user, activeSubscriptions: ['CIBLE', 'WINNER'] };
    renderPage(<Profile />, '/profile');
    expect(await screen.findByRole('link', { name: /Rejoindre le groupe VIP/ })).toHaveAttribute('href', LINK);
  });

  it('shows nothing to members without Pack Winner', async () => {
    auth.user = { ...auth.user, activeSubscriptions: ['CIBLE'] };
    renderPage(<Profile />, '/profile');
    await waitFor(() => expect(screen.getByText(/Changer mon code parrain/)).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Rejoindre le groupe VIP/ })).not.toBeInTheDocument();
    expect(api.getSubscriptionOffers).not.toHaveBeenCalled();
  });
});
