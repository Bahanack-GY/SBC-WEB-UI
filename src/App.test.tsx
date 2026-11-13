import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { fail, ok } from './test/api';

/**
 * The route tiers of the real App: which pages need a login, which need a pack.
 * Advertisers need no pack (Rufus, 2026-11-13); the hub and the diffuseur pages
 * still do.
 */

const api = vi.hoisted(() => {
    const known: Record<string, ReturnType<typeof vi.fn>> = {
        getCurrentSubscription: vi.fn(),
        getAdsLaunchState: vi.fn(),
        getMyAdsCampaigns: vi.fn(),
        getMyDiffuseurProfile: vi.fn(),
    };
    // Every other call the rendered pages make answers an empty success.
    const fallback = new Map<string, ReturnType<typeof vi.fn>>();
    return new Proxy(known, {
        get(target, prop: string) {
            if (prop in target) return target[prop];
            if (!fallback.has(prop)) {
                fallback.set(prop, vi.fn(async () => ({ statusCode: 200, isSuccessByStatusCode: true, body: { success: true, data: null } })));
            }
            return fallback.get(prop);
        },
    });
});
vi.mock('./services/SBCApiService', () => ({ sbcApiService: api }));

const auth = vi.hoisted(() => ({
    user: null as Record<string, unknown> | null,
    isAuthenticated: true,
    loading: false,
    logout: vi.fn(),
    refreshUser: vi.fn(),
}));
const passthrough = vi.hoisted(() => ({ children }: { children: ReactNode }) => children);
vi.mock('./contexts/AuthContext', () => ({ AuthProvider: passthrough, useAuth: () => auth }));
vi.mock('./contexts/SocketContext', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./contexts/SocketContext')>()),
    SocketProvider: passthrough,
}));
vi.mock('./contexts/RelanceContext', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./contexts/RelanceContext')>()),
    RelanceProvider: passthrough,
}));
vi.mock('./components/common/TourProvider', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./components/common/TourProvider')>()),
    TourProvider: passthrough,
}));
vi.mock('./components/common/Header', () => ({ default: () => <header>En-tête membre</header> }));
vi.mock('./components/common/NavigationBar', () => ({ default: () => null }));
vi.mock('./components/privacy/PrivacyNotices', () => ({ default: () => null }));
vi.mock('./components/common/TourButton', () => ({ default: () => null }));

import App from './App';

/**
 * Starts like the real app: the account is known one render before the auth
 * loading ends (AuthProvider sets the user, then loading). App drops the query
 * cache when the account changes; doing both at once would cancel the pages'
 * first queries, which never happens for real.
 */
function renderApp(route: string) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = () => (
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={[route]}><App /></MemoryRouter>
        </QueryClientProvider>
    );
    auth.loading = true;
    const view = render(tree());
    auth.loading = false;
    view.rerender(tree());
    return view;
}

const annonceur = { _id: 'u1', name: 'Awa Pub', balance: 0, signupIntent: 'annonceur' };
const member = { _id: 'u2', name: 'Paul Membre', balance: 0 };
const noPack = () => api.getCurrentSubscription.mockResolvedValue(ok(null));
const withPack = () => api.getCurrentSubscription.mockResolvedValue(ok({ status: 'active' }));

beforeEach(() => {
    localStorage.clear();
    auth.isAuthenticated = true;
    auth.user = annonceur;
    noPack();
    api.getAdsLaunchState.mockResolvedValue(ok({ launched: true, launchAt: null }));
    api.getMyAdsCampaigns.mockResolvedValue({ ...ok([]), body: { success: true, data: [], pagination: { total: 0 } } });
    api.getMyDiffuseurProfile.mockResolvedValue(fail(404, 'Not found'));
});

describe('advertiser pages without a pack', () => {
    it('opens the advertiser space, with « Se déconnecter » and without the member header', async () => {
        renderApp('/ads-network/annonceur');
        expect(await screen.findByRole('heading', { name: 'Espace annonceur' })).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: /Se déconnecter/ })).toBeInTheDocument();
        expect(screen.queryByText('En-tête membre')).not.toBeInTheDocument();
    });

    it('opens the new campaign form', async () => {
        renderApp('/ads-network/annonceur/nouvelle-campagne');
        expect(await screen.findByRole('heading', { name: 'Nouvelle annonce' })).toBeInTheDocument();
    });

    it('opens the onboarding', async () => {
        renderApp('/ads-network/annonceur/onboarding');
        expect(await screen.findByRole('heading', { name: 'Devenir annonceur' })).toBeInTheDocument();
    });

    it('opens them for a member without a pack too (from the packs page)', async () => {
        auth.user = member;
        renderApp('/ads-network/annonceur');
        expect(await screen.findByRole('heading', { name: 'Espace annonceur' })).toBeInTheDocument();
    });

    it('sends an advertiser who opens the app (/) to the advertiser space', async () => {
        renderApp('/');
        expect(await screen.findByRole('heading', { name: 'Espace annonceur' })).toBeInTheDocument();
    });

    it('keeps the hub and the diffuseur pages for members: an advertiser lands in the advertiser space', async () => {
        renderApp('/ads-network/diffuseur');
        expect(await screen.findByRole('heading', { name: 'Espace annonceur' })).toBeInTheDocument();
        expect(api.getMyDiffuseurProfile).not.toHaveBeenCalled();
    });

    it('keeps the hub paywalled for a member without a pack: the packs page', async () => {
        auth.user = member;
        renderApp('/ads-network');
        expect(await screen.findByRole('heading', { name: 'Abonnement' })).toBeInTheDocument();
    });
});

describe('advertiser pages for a paying member', () => {
    it('look as before: the member header and the back button, no extra « Se déconnecter »', async () => {
        auth.user = member;
        withPack();
        renderApp('/ads-network/annonceur');
        expect(await screen.findByRole('heading', { name: 'Espace annonceur' })).toBeInTheDocument();
        expect(screen.getByText('En-tête membre')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Se déconnecter/ })).not.toBeInTheDocument();
    });
});
