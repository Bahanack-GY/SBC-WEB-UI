import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { LeaderboardEntry } from '../types/api';

/**
 * Monthly affiliate leaderboard. staleTime matches the server's 1h cache, so
 * refetching sooner would only re-fetch the identical snapshot.
 */
export const useLeaderboard = () =>
    useQuery<LeaderboardEntry[]>({
        queryKey: ['leaderboard'],
        queryFn: async () => {
            const response = await sbcApiService.getLeaderboard();
            return handleApiResponse(response) ?? [];
        },
        staleTime: 60 * 60 * 1000,
        gcTime: 2 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
    });
