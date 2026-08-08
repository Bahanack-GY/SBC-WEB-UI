import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';

export interface AdsRoles {
    isDiffuseur: boolean;
    isAnnonceur: boolean;
}

/**
 * Remembered from the last visit, so a returning user routes to their dashboard
 * on the first frame instead of watching onboarding for a second.
 *
 * Only two booleans, and only ever used to pick a screen — never to grant
 * anything. Every endpoint behind these screens re-checks server-side, so a
 * stale or hand-edited value costs a wrong redirect and nothing more.
 */
const CACHE_KEY = 'sbc.adsRoles';

const readCache = (): AdsRoles | null => {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.isDiffuseur !== 'boolean' || typeof parsed?.isAnnonceur !== 'boolean') return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeCache = (roles: AdsRoles) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(roles));
    } catch {
        // Private browsing or a full quota. Losing the cache costs a redirect, not correctness.
    }
};

export const clearAdsRolesCache = () => {
    try {
        localStorage.removeItem(CACHE_KEY);
    } catch { /* nothing to do */ }
};

/**
 * Which Ads Network roles the current user holds.
 *
 * `isResolved` is the flag every screen must gate on. Rendering onboarding while
 * this is false is what produced the "onboarding flashes for five seconds, then
 * jumps to the dashboard" behaviour — the redirect was correct, it just ran after
 * the wrong screen had already painted.
 */
export function useAdsRoles() {
    const cached = readCache();

    const { data, isFetching, isError } = useQuery<AdsRoles>({
        queryKey: ['ads-roles'],
        queryFn: async () => {
            // One round trip each, in parallel: a sequential pair doubles the wait
            // on exactly the screen the user is staring at.
            const [profileRes, campaignRes] = await Promise.all([
                sbcApiService.getMyDiffuseurProfile(),
                sbcApiService.getMyAdsCampaigns({ limit: 1 }),
            ]);

            const roles: AdsRoles = {
                // 404 is the service's way of saying "not enrolled", not a failure.
                isDiffuseur: profileRes.isSuccessByStatusCode && Boolean(profileRes.body?.data),
                isAnnonceur: Boolean(campaignRes.body?.pagination?.total),
            };
            writeCache(roles);
            return roles;
        },
        // The cached value renders immediately; the query still refreshes behind it.
        initialData: cached ?? undefined,
        staleTime: 30_000,
        retry: false,
    });

    return {
        roles: data ?? { isDiffuseur: false, isAnnonceur: false },
        /** True once we know enough to pick a screen — from cache or from the network. */
        isResolved: Boolean(data),
        isRefreshing: isFetching,
        isError,
    };
}
