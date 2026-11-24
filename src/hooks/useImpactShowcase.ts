import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { ImpactApiError, impactData } from './useImpactCandidate';
import type { ImpactMyShowcasePage, ImpactShowcaseCard, ImpactShowcasePage } from '../types/impact';

// « SBC Impact » (Phase 5): the finalists' pages, kept at least a year after the final.

export const showcaseKeys = {
  list: ['impact-v2', 'showcase'] as const,
  page: (id: string) => ['impact-v2', 'showcase', id] as const,
  mine: ['impact-v2', 'showcase', 'mine'] as const,
};

export const useImpactShowcase = (opts: { enabled?: boolean } = {}) =>
  useQuery<{ active: ImpactShowcaseCard[]; archived: ImpactShowcaseCard[] }>({
    queryKey: showcaseKeys.list,
    queryFn: async () => {
      const d = impactData<{ active?: ImpactShowcaseCard[]; archived?: ImpactShowcaseCard[] } | null>(
        await sbcApiService.impactShowcase(), 'Impossible de charger SBC Impact.') ?? {};
      return { active: d.active ?? [], archived: d.archived ?? [] };
    },
    enabled: opts.enabled ?? true,
    staleTime: 60 * 1000,
    retry: 1,
  });

export const useImpactShowcasePage = (id: string | undefined) =>
  useQuery<ImpactShowcasePage>({
    queryKey: showcaseKeys.page(id ?? ''),
    queryFn: async () => impactData<ImpactShowcasePage>(await sbcApiService.impactShowcasePage(id!), 'Impossible de charger cette page.'),
    enabled: !!id,
    staleTime: 60 * 1000,
    retry: (count, err) => count < 1 && (err as ImpactApiError)?.status !== 404,
  });

/** The finalist's own pages ([] for everyone else). */
export const useMyShowcase = (opts: { enabled?: boolean } = {}) =>
  useQuery<ImpactMyShowcasePage[]>({
    queryKey: showcaseKeys.mine,
    queryFn: async () => {
      const d = impactData<ImpactMyShowcasePage[] | null>(await sbcApiService.impactMyShowcase(), 'Impossible de charger votre page SBC Impact.');
      return Array.isArray(d) ? d : [];
    },
    enabled: opts.enabled ?? true,
    retry: 1,
  });
