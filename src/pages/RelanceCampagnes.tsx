import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Megaphone01Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import RelancePacksModal from '../components/relance/RelancePacksModal';
import { CampaignCard } from '../components/relance/CampaignCard';
import { CampaignWizard } from '../components/relance/CampaignWizard';
import { CampaignDetailSheet } from '../components/relance/CampaignDetailSheet';
import { CountUp } from '../components/relance/ui/CountUp';
import { useRelance } from '../contexts/RelanceContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { headerDrop, listContainer, listItem, pageFade, popIn } from '../utils/motion';
import { filleulsCovered } from '../utils/relance';
import type { Campaign } from '../types/relance';

const campaignsKey = ['relance', 'campaigns'] as const;

/**
 * Campagnes de relance — the parrain picks older filleuls (registered before
 * relance des nouveaux could reach them) and sends them the same 7 days.
 *
 * A page of its own, as Sterling asked, so the two never get confused: relance
 * des nouveaux is automatic, a campaign is a decision the parrain makes.
 */
export default function RelanceCampagnes() {
  const queryClient = useQueryClient();
  const { emailBalance, refreshBalance } = useRelance();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [packsOpen, setPacksOpen] = useState(false);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const campaigns = useQuery({
    queryKey: campaignsKey,
    queryFn: async (): Promise<Campaign[]> => {
      const data = handleApiResponse(await sbcApiService.relanceGetCampaigns({ limit: 50 }));
      return data?.campaigns ?? [];
    },
    refetchInterval: 60_000,
  });

  const say = (text: string) => {
    setFlash(text);
    window.setTimeout(() => setFlash(null), 3500);
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: campaignsKey });

  const list = campaigns.data ?? [];
  const running = list.filter(c => c.status === 'active' || c.status === 'paused');
  const past = list.filter(c => c.status !== 'active' && c.status !== 'paused');

  const startNew = () => (emailBalance > 0 ? setWizardOpen(true) : setPacksOpen(true));

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-bg pb-28">
      <motion.header variants={headerDrop} className="sticky top-0 z-20 bg-bg flex items-center gap-2 px-3 py-3">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-ink leading-tight">Campagnes de relance</h1>
          <p className="text-xs text-ink-3">Relancez vos anciens filleuls</p>
        </div>
      </motion.header>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <motion.div variants={popIn} className="flex items-center justify-between p-3 rounded-tile bg-surface border border-border text-sm">
          <span className="text-ink-2">Crédits email</span>
          <span className="font-semibold text-ink">
            <CountUp value={emailBalance} /> <span className="text-ink-3 font-normal">≈ {filleulsCovered(emailBalance)} filleuls</span>
          </span>
        </motion.div>

        {campaigns.isLoading ? (
          <div className="space-y-3">
            {[0, 1].map(i => <div key={i} className="h-28 rounded-card bg-surface-2 animate-pulse" />)}
          </div>
        ) : campaigns.isError ? (
          <div className="p-5 rounded-card bg-surface border border-border text-center">
            <p className="text-ink font-medium">Impossible de charger vos campagnes.</p>
            <button onClick={() => campaigns.refetch()} className="mt-3 h-10 px-5 rounded-pill bg-primary text-white font-semibold">Réessayer</button>
          </div>
        ) : list.length === 0 ? (
          <motion.div variants={popIn} className="p-6 rounded-card bg-surface border border-border text-center">
            <motion.span
              className="mx-auto size-14 grid place-items-center rounded-pill bg-accent-soft text-accent"
              animate={{ rotate: [0, -10, 10, -6, 0] }}
              transition={{ duration: 1.2, delay: 0.4, repeat: Infinity, repeatDelay: 3 }}
            >
              <HugeiconsIcon icon={Megaphone01Icon} size={26} />
            </motion.span>
            <h2 className="mt-3 font-semibold text-ink">Aucune campagne pour l'instant</h2>
          </motion.div>
        ) : (
          <>
            {running.length > 0 && (
              <section aria-label="En cours">
                <h2 className="text-sm font-semibold text-ink mb-2">En cours</h2>
                <motion.ul variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                  {running.map(c => (
                    <motion.li key={c._id} variants={listItem}><CampaignCard campaign={c} onOpen={() => setSelected(c)} /></motion.li>
                  ))}
                </motion.ul>
              </section>
            )}
            {past.length > 0 && (
              <section aria-label="Terminées">
                <h2 className="text-sm font-semibold text-ink mb-2">Terminées</h2>
                <motion.ul variants={listContainer} initial="hidden" animate="show" className="space-y-2">
                  {past.map(c => (
                    <motion.li key={c._id} variants={listItem}><CampaignCard campaign={c} onOpen={() => setSelected(c)} /></motion.li>
                  ))}
                </motion.ul>
              </section>
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 px-4 pb-5 pt-3 bg-bg border-t border-border">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={startNew}
          data-tour="campagne-new"
          className="max-w-lg mx-auto w-full h-12 rounded-tile bg-primary text-white font-semibold flex items-center justify-center gap-2"
        >
          <HugeiconsIcon icon={Add01Icon} size={20} />
          {emailBalance > 0 ? 'Nouvelle campagne' : 'Acheter des crédits pour commencer'}
        </motion.button>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-pill bg-ink text-white text-sm font-medium"
          >
            {flash}
          </motion.div>
        )}
      </AnimatePresence>

      <CampaignWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        emailBalance={emailBalance}
        onLaunched={() => { refresh(); refreshBalance(); say('Campagne lancée.'); }}
      />
      <CampaignDetailSheet campaign={selected} onClose={() => setSelected(null)} onChanged={(m) => { refresh(); say(m); }} />
      <RelancePacksModal isOpen={packsOpen} onClose={() => { setPacksOpen(false); refreshBalance(); }} />
    </motion.div>
  );
}
