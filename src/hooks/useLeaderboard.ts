import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { LeaderboardResponse } from '../types/api';

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
