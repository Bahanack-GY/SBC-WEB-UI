import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

/** The terms page of the app, used when no official PDF is uploaded. */
export const TERMS_PAGE = '/conditions';

/**
 * Where the CGU are read: the official PDF uploaded in the settings
 * (`termsAndConditionsPdf`, Rufus's "Conditions Generales D'utilisation.pdf")
 * when there is one, otherwise the /conditions page. Same cache entry as Home.
 */
export function useTermsUrl(): string {
    const { data } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => handleApiResponse(await sbcApiService.getAppSettings()),
        staleTime: 5 * 60_000,
        retry: 1,
    });
    const fileId = (data as { termsAndConditionsPdf?: { fileId?: string } } | undefined)?.termsAndConditionsPdf?.fileId;
    return fileId ? sbcApiService.generateSettingsFileUrl(fileId) : TERMS_PAGE;
}
