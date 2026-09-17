import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

export interface Formation {
    _id: string;
    title: string;
    /** '' when locked — the server never exposes a link above the member's pack. */
    link: string;
    requiredSubscriptionType?: 'CLASSIQUE' | 'CIBLE';
    /** Presentation hint set by admins: 'new', 'orange', 'gold'. Unknown values render plain. */
    decoration?: string;
    locked?: boolean;
}

/**
 * Formations for the current member. The server filters them by pack, so the
 * list differs per member and is cached as such. Shared by the Home tile (count)
 * and the Formations page, under the same key, so opening the page is instant.
 */
export const useFormations = () =>
    useQuery<Formation[]>({
        queryKey: ['formations'],
        queryFn: async () => {
            try {
                return handleApiResponse(await sbcApiService.getFormations()) ?? [];
            } catch {
                return [];
            }
        },
        staleTime: 30 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 2,
    });
