import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { ok, renderPage } from '../../test/api';

const api = vi.hoisted(() => ({ getCurrentSubscription: vi.fn() }));
vi.mock('../../services/SBCApiService', () => ({ sbcApiService: api }));
const auth = vi.hoisted(() => ({
    user: { _id: 'u1' } as Record<string, unknown> | null,
    isAuthenticated: true,
    loading: false,
}));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => auth }));

import { RequireSubscription } from './RouteGuards';

const app = (route: string) => renderPage(
    <Routes>
        <Route element={<RequireSubscription />}>
            <Route path="/" element={<p>Accueil membre</p>} />
        </Route>
        <Route path="/abonnement" element={<p>Les packs</p>} />
        <Route path="/ads-network/annonceur" element={<p>Espace annonceur</p>} />
    </Routes>,
    route,
);

beforeEach(() => {
    auth.user = { _id: 'u1' };
    auth.isAuthenticated = true;
    api.getCurrentSubscription.mockResolvedValue(ok(null));
});

describe('RequireSubscription (paywall)', () => {
    it('sends a member without a pack to the packs', async () => {
        app('/');
        expect(await screen.findByText('Les packs')).toBeInTheDocument();
    });

    it('sends an advertiser account without a pack to its advertiser space, not to the packs', async () => {
        auth.user = { _id: 'u1', signupIntent: 'annonceur' };
        app('/');
        expect(await screen.findByText('Espace annonceur')).toBeInTheDocument();
        expect(screen.queryByText('Les packs')).not.toBeInTheDocument();
    });

    it('lets an advertiser account that bought a pack into the member area', async () => {
        auth.user = { _id: 'u1', signupIntent: 'annonceur' };
        api.getCurrentSubscription.mockResolvedValue(ok({ status: 'active' }));
        app('/');
        expect(await screen.findByText('Accueil membre')).toBeInTheDocument();
    });
});
