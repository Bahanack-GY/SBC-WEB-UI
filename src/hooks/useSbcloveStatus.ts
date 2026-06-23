import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { SbcloveStatus } from '../types/sbclove';

/**
 * Polls the SBCLOVE module status so the UI can show/hide the entry point as the
 * weekly Wednesday session opens and closes (spec §1-2). Refetched periodically
 * and on window focus so a member who keeps the app open sees the button appear
 * at 18:00 and disappear at 21:00 without a manual reload.
 */
export const useSbcloveStatus = (enabled = true) => {
    const query = useQuery<SbcloveStatus>({
        queryKey: ['sbclove', 'status'],
        queryFn: async () => {
            const data = await handleApiResponse(await sbcApiService.sbcloveGetStatus());
            return data as SbcloveStatus;
        },
        enabled,
        refetchInterval: 60 * 1000,   // re-check every minute
        refetchOnWindowFocus: true,
        staleTime: 30 * 1000,
        retry: 1,
    });

    const status = query.data;
    // The module is usable only when enabled AND inside the weekly window.
    const isOpen = !!status?.enabled && !!status?.isOpen;

    return {
        status,
        isOpen,
        nextOpenAt: status?.nextOpenAt ?? null,
        isLoading: query.isLoading,
        refetch: query.refetch,
    };
};
