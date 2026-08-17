import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { useAuth } from '../contexts/AuthContext';

export interface AdsRoles {
    isDiffuseur: boolean;
    isAnnonceur: boolean;
}

/**
 * Remembered from the last visit, so a returning user routes to their dashboard
 * on the first frame instead of watching onboarding for a second.
 *
 * Keyed per user. An unkeyed cache survives logout and hands the next account
 * the previous one's roles — on a shared device that means being shown a
 * dashboard for a role you do not hold.
 *
 * Only two booleans, and only ever used to pick a screen — never to grant
 * anything. Every endpoint behind these screens re-checks server-side, so a
 * stale or hand-edited value costs a wrong redirect and nothing more.
 */
const PREFIX = 'sbc.adsRoles';

const keyFor = (userId: string | null) => `${PREFIX}.${userId ?? 'anonymous'}`;

const currentUserId = (user: unknown): string | null =>
    (user as { id?: string; _id?: string })?.id ||
    (user as { id?: string; _id?: string })?._id ||
    (typeof window !== 'undefined' ? localStorage.getItem('userId') : null) ||
    null;

const readCache = (userId: string | null): AdsRoles | null => {
    try {
        const raw = localStorage.getItem(keyFor(userId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.isDiffuseur !== 'boolean' || typeof parsed?.isAnnonceur !== 'boolean') return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeCache = (userId: string | null, roles: AdsRoles) => {
    try {
        localStorage.setItem(keyFor(userId), JSON.stringify(roles));
    } catch {
        // Private browsing or a full quota. Losing the cache costs a redirect, not correctness.
    }
};

/** Called on logout. Drops every user's entry, including pre-keying leftovers. */
export const clearAdsRolesCache = () => {
    try {
        Object.keys(localStorage)
            .filter(k => k === PREFIX || k.startsWith(`${PREFIX}.`))
            .forEach(k => localStorage.removeItem(k));
    } catch { /* nothing to do */ }
};

/**
 * Which Ads Network roles the current user holds.
 *
 * `isResolved` is the flag every screen must gate on. Rendering onboarding while
 * this is false is what produced the "onboarding flashes, then jumps to the
 * dashboard" behaviour — the redirect was correct, it just ran after the wrong
 * screen had already painted.
 */
export function useAdsRoles() {
    const { user } = useAuth();
    const userId = currentUserId(user);
    const cached = readCache(userId);

    const { data, isFetching, isError } = useQuery<AdsRoles>({
        queryKey: ['ads-roles', userId ?? 'anonymous'],
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
            writeCache(userId, roles);
            return roles;
        },
        // Render the remembered value immediately...
        initialData: cached ?? undefined,
        // ...but treat it as already stale, so a refetch starts on mount and a
        // role that changed server-side corrects itself. Without this, staleTime
        // applies to the cached value and the screen can stay wrong indefinitely.
        initialDataUpdatedAt: 0,
        staleTime: 30_000,
        refetchOnMount: 'always',
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
