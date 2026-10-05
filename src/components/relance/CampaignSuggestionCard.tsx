import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Megaphone01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { suggestionRange, type CampaignSuggestion } from '../../utils/relance';

export const campaignSuggestionKey = ['relance', 'campaign-suggestion'] as const;

/** The server's suggestion, or null. Shared so both relance pages use one request. */
export function useCampaignSuggestion() {
  return useQuery({
    queryKey: campaignSuggestionKey,
    queryFn: async (): Promise<CampaignSuggestion | null> => {
      // handleApiResponse turns { success: true, data: null } into `true`.
      const data = handleApiResponse(await sbcApiService.relanceGetCampaignSuggestion());
      return data && typeof data === 'object' && typeof data.count === 'number' ? (data as CampaignSuggestion) : null;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Points a parrain whose credits sit unused to a campaign (Rufus, 2026-10-05):
 * relance des nouveaux only picks up filleuls in the 2 hours after they sign
 * up, so without new filleuls nothing is ever sent. Shown only when the server
 * has something to suggest — credits, no campaign running, unpaid filleuls.
 */
export function CampaignSuggestionCard({ onStart }: { onStart: (s: CampaignSuggestion) => void }) {
  const { data: s } = useCampaignSuggestion();
  if (!s || s.count <= 0) return null;
  const plural = s.count > 1;
  return (
    <motion.section
      aria-label="Campagne suggérée"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-card bg-accent-soft border border-accent/30"
    >
      <div className="flex items-start gap-3">
        <span className="size-10 grid place-items-center rounded-tile bg-accent text-white shrink-0">
          <HugeiconsIcon icon={Megaphone01Icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {s.count} filleul{plural ? 's' : ''} inscrit{plural ? 's' : ''} {suggestionRange(s)} {plural ? "n'ont" : "n'a"} pas encore payé
          </p>
          <p className="text-sm text-ink-2 mt-0.5">
            Relancez-{plural ? 'les' : 'le'} avec une campagne.
            {s.affordable < s.count ? ` Vos crédits en couvrent ${s.affordable}.` : ''}
          </p>
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => onStart(s)}
        className="mt-3 w-full h-11 rounded-tile bg-accent text-white font-semibold"
      >
        Préparer la campagne
      </motion.button>
    </motion.section>
  );
}
