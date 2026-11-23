import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ok, renderPage } from '../test/api';

const api = vi.hoisted(() => ({ searchContacts: vi.fn() }));
vi.mock('../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({
  user: { activeSubscriptions: ['CLASSIQUE'] } as Record<string, unknown>,
  isAuthenticated: true,
  loading: false,
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

import Contacts from './Contacts';

beforeEach(() => {
  vi.clearAllMocks();
  api.searchContacts.mockResolvedValue(ok({ contacts: [] }));
});

describe('Contacts: Espace Pro banner', () => {
  it('offers Espace Pro to a member who does not have it', async () => {
    auth.user = { activeSubscriptions: ['CLASSIQUE'] };
    renderPage(<Contacts />, '/contacts');
    expect(await screen.findByText('Recevez les demandes de clients près de chez vous')).toBeInTheDocument();
    expect(screen.getByText('Espace Pro : 2 000 FCFA/mois ou 12 000 FCFA/an')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: "Activer l'Espace Pro" })).toHaveAttribute('href', '/abonnement#pro');
  });

  it('only says Espace Pro is on when it is', async () => {
    auth.user = { activeSubscriptions: ['CIBLE', 'PRO'] };
    renderPage(<Contacts />, '/contacts');
    expect(await screen.findByText('Espace Pro actif')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: "Activer l'Espace Pro" })).not.toBeInTheDocument();
  });

  it('tells every member to download the SBC Network app', async () => {
    auth.user = { activeSubscriptions: ['CIBLE', 'PRO'] };
    renderPage(<Contacts />, '/contacts');
    expect(await screen.findByText(/pour mieux gérer les contacts SBC/)).toBeInTheDocument();
    expect(screen.getByText('SBC Network')).toBeInTheDocument();
    const play = screen.getByRole('link', { name: /Google Play/ });
    expect(play).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.sbc.sbc_contacts');
    expect(play).toHaveAttribute('target', '_blank');
    // No App Store link yet: no dead button.
    expect(screen.queryByRole('link', { name: /App Store/ })).not.toBeInTheDocument();
  });
});
