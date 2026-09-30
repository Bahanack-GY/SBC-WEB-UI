import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { LeaderboardResponse, CountryLeaderboardResponse, MyFilleulsLeaderboardResponse } from '../types/api';

/**
 * Monthly affiliate leaderboard. staleTime matches the server's 1h cache, so
 * refetching sooner would only re-fetch the identical snapshot.
 */
export const useLeaderboard = () =>
    useQuery<LeaderboardResponse>({
        queryKey: ['leaderboard'],
        queryFn: async () => {
            const response = await sbcApiService.getLeaderboard();
            const data = handleApiResponse(response);
            // Tolerate the older bare-array shape while the API rolls out.
            if (Array.isArray(data)) return { top: data, me: null };
            return { top: data?.top ?? [], me: data?.me ?? null };
        },
        staleTime: 60 * 60 * 1000,
        gcTime: 2 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
    });

/**
 * "Classement par pays". Only fetched once the country view is opened — the
 * home preview and the general tab never need it. Same 1h server cache.
 */
export const useCountryLeaderboard = (enabled: boolean) =>
    useQuery<CountryLeaderboardResponse>({
        queryKey: ['leaderboard', 'countries'],
        queryFn: async () => {
            const data = handleApiResponse(await sbcApiService.getCountryLeaderboard());
            return { countries: data?.countries ?? [], byCountry: data?.byCountry ?? {} };
        },
        enabled,
        staleTime: 60 * 60 * 1000,
        gcTime: 2 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
    });

/** "Top de mes filleuls". Per viewer, so the key carries nothing shared; fetched on tab open. */
export const useMyFilleulsLeaderboard = (enabled: boolean) =>
    useQuery<MyFilleulsLeaderboardResponse>({
        queryKey: ['leaderboard', 'filleuls'],
        queryFn: async () => {
            const data = handleApiResponse(await sbcApiService.getMyFilleulsLeaderboard());
            return { top: data?.top ?? [], totalRanked: data?.totalRanked ?? 0 };
        },
        enabled,
        staleTime: 60 * 60 * 1000,
        gcTime: 2 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
