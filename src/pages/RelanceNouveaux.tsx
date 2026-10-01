import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, InformationCircleIcon, Megaphone01Icon, Settings02Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import RelancePacksModal from '../components/relance/RelancePacksModal';
import { RelanceStatusCard } from '../components/relance/RelanceStatusCard';
import { RelanceCreditsCard } from '../components/relance/RelanceCreditsCard';
import { RelanceJourney } from '../components/relance/RelanceJourney';
import { RelanceFilleulList, type FilleulRow } from '../components/relance/RelanceFilleulList';
import { RelanceOnboarding } from '../components/relance/RelanceOnboarding';
import { RelanceSettingsSheet } from '../components/relance/RelanceSettingsSheet';
import { RelanceMessagesSheet } from '../components/relance/RelanceMessagesSheet';
import { RelanceEarningsCard, type RelanceEarnings } from '../components/relance/RelanceEarningsCard';
import { Sheet } from '../components/relance/ui/Sheet';
import { useRelance } from '../contexts/RelanceContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { headerDrop, pageFade, popIn, riseFar, sequence, slideLeft, slideRight, unfold } from '../utils/motion';
import { campaignFilter, campaignReach, DEFAULT_CAMPAIGN_DRAFT, deriveRelanceState, frenchErrorFrom, journeyBuckets } from '../utils/relance';
import type { FilterPreviewResponse } from '../types/relance';
import type { DefaultRelanceStats, RelanceStatus } from '../types/relance';

const relanceKeys = {
  status: ['relance', 'status'] as const,
  stats: ['relance', 'default-stats'] as const,
  filleuls: (limit: number) => ['relance', 'default-filleuls', limit] as const,
};

const fetchStatus = async (): Promise<RelanceStatus> =>
  handleApiResponse(await sbcApiService.relanceGetStatus());
const fetchStats = async (): Promise<DefaultRelanceStats> =>
  handleApiResponse(await sbcApiService.relanceGetDefaultStats());
const fetchFilleuls = async (limit: number): Promise<{ targets: FilleulRow[]; total: number }> => {
  const data = handleApiResponse(await sbcApiService.relanceGetDefaultTargets({ page: 1, limit, status: 'active' }));
  return { targets: data?.targets ?? [], total: data?.total ?? 0 };
};

/**
 * Relance des nouveaux — someone registers with the parrain's link and doesn't
 * pay; SBC sends them one message a day for 7 days, until they pay.
 *
 * Replaces a 2,450-line page with 76 controls and 11 dialogs. What's left is
 * what a parrain needs: is it running, how many credits, where each filleul
 * is, and a way to reach older filleuls (campaigns, on their own page).
 */
export default function RelanceNouveaux() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { emailBalance, smsBalance, isLoading: balanceLoading, refreshBalance } = useRelance();

  const [packsOpen, setPacksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [flash, setFlash] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // A light refresh keeps the counts moving while the page is open — sends go
  // out every 15 minutes, so a minute is plenty.
  const live = { refetchInterval: 60_000, refetchOnWindowFocus: true };
  const status = useQuery({ queryKey: relanceKeys.status, queryFn: fetchStatus, ...live });
  const stats = useQuery({ queryKey: relanceKeys.stats, queryFn: fetchStats, ...live });
  const filleuls = useQuery({ queryKey: relanceKeys.filleuls(10), queryFn: () => fetchFilleuls(10), ...live });
  // Older unpaid filleuls a campaign would reach — same filter the wizard opens with,
  // so the numbers match. Only worth asking once there are credits to spend.
  const older = useQuery({
    queryKey: ['relance', 'older-unpaid'],
    queryFn: async (): Promise<FilterPreviewResponse> =>
      handleApiResponse(await sbcApiService.relancePreviewFilters(campaignFilter(DEFAULT_CAMPAIGN_DRAFT))),
    enabled: emailBalance > 0,
    staleTime: 30 * 60_000,
  });
  const earnings = useQuery({
    queryKey: ['relance', 'earnings'],
    queryFn: async (): Promise<RelanceEarnings> => handleApiResponse(await sbcApiService.relanceGetEarnings()),
    ...live,
  });
  const olderCount = older.data?.totalCount ?? 0;
  const olderAffordable = campaignReach(olderCount, older.data?.budget, true);
  const allFilleuls = useQuery({ queryKey: relanceKeys.filleuls(100), queryFn: () => fetchFilleuls(100), enabled: allOpen });

  const say = (tone: 'ok' | 'error', text: string) => {
    setFlash({ tone, text });
    window.setTimeout(() => setFlash(null), 3500);
  };

  const s = status.data;
  const buckets = journeyBuckets({
    activeTargets: stats.data?.activeTargets ?? 0,
    dayProgression: stats.data?.dayProgression,
    targetsConverted: stats.data?.targetsConverted,
    completedRelance: stats.data?.completedRelance,
  });
  const state = s
    ? deriveRelanceState({ ...s, emailBalance, smsBalance })
    : 'paused';
  const on = !!s && s.enabled && !s.sendingPaused;

  const neverUsed = emailBalance <= 0 && smsBalance <= 0
    && buckets.inProgress === 0 && buckets.paid === 0 && buckets.finished === 0;

  const toggle = async (next: boolean) => {
    setToggling(true);
    try {
      // Turning it on also clears the old global and "ajout" pauses, which the
      // new page no longer shows — otherwise "on" could still send nothing.
      handleApiResponse(await sbcApiService.relanceUpdateSettings(
        next ? { enabled: true, sendingPaused: false, enrollmentPaused: false } : { enabled: false },
      ));
      await queryClient.invalidateQueries({ queryKey: relanceKeys.status });
      say('ok', next ? 'Relance rallumée.' : 'Relance mise en pause.');
    } catch (err) {
      say('error', frenchErrorFrom(err, "Impossible de changer l'état. Réessayez."));
    } finally {
      setToggling(false);
    }
  };

  const loading = status.isLoading || stats.isLoading || balanceLoading;
  const failed = status.isError && stats.isError;

  return (
    <motion.div variants={pageFade} initial="hidden" animate="show" className="min-h-screen bg-bg pb-10">
      <motion.header variants={headerDrop} className="sticky top-0 z-20 bg-bg flex items-center gap-2 px-4 py-3">
        <BackButton />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-ink leading-tight">Relance des nouveaux</h1>
          <p className="text-xs text-ink-3">Vos filleuls qui n'ont pas encore payé</p>
        </div>
        {!neverUsed && (
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Réglages"
            data-tour="relance-settings"
            className="size-10 grid place-items-center rounded-pill text-ink-2 hover:bg-surface-2"
          >
            <HugeiconsIcon icon={Settings02Icon} size={22} />
          </button>
        )}
      </motion.header>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3 pt-2" aria-busy="true" aria-label="Chargement">
            {[88, 120, 320].map(h => (
              <div key={h} className="rounded-card bg-surface-2 animate-pulse" style={{ height: h }} />
            ))}
          </div>
        ) : failed ? (
          <div className="bg-surface border border-border rounded-card p-5 text-center mt-2">
            <p className="text-ink font-medium">Impossible de charger la relance.</p>
            <button
              onClick={() => { status.refetch(); stats.refetch(); refreshBalance(); }}
              className="mt-4 h-10 px-5 rounded-pill bg-primary text-white font-semibold"
            >
              Réessayer
            </button>
          </div>
        ) : neverUsed ? (
          <RelanceOnboarding onBuy={() => setPacksOpen(true)} onSeeMessages={() => setMessagesOpen(true)} />
        ) : (
          <motion.div variants={sequence} initial="hidden" animate="show" className="space-y-3 pt-1">
            <motion.div variants={popIn} data-tour="relance-status">
              <RelanceStatusCard
                state={state}
                on={on}
                busy={toggling}
                onToggle={toggle}
                sentToday={s?.messagesSentToday ?? 0}
                maxPerDay={s?.maxMessagesPerDay ?? 500}
                onRecharge={() => setPacksOpen(true)}
                onChangeLimit={() => setSettingsOpen(true)}
              />
            </motion.div>

            {(earnings.data?.paid ?? 0) > 0 && <RelanceEarningsCard data={earnings.data!} />}

            <motion.div variants={slideLeft} data-tour="relance-credits">
              <RelanceCreditsCard emailBalance={emailBalance} smsBalance={smsBalance} onRecharge={() => setPacksOpen(true)} />
            </motion.div>

            <motion.div variants={riseFar} data-tour="relance-journey">
              <RelanceJourney buckets={buckets} live={state === 'running'} />
            </motion.div>

            <motion.button variants={riseFar} onClick={() => setMessagesOpen(true)} className="w-full h-10 text-sm font-semibold text-primary">
              Voir les messages
            </motion.button>

            <motion.div variants={slideRight}>
              <RelanceFilleulList
                filleuls={filleuls.data?.targets ?? []}
                total={filleuls.data?.total ?? 0}
                onSeeAll={() => setAllOpen(true)}
              />
            </motion.div>

            <motion.button
              variants={unfold}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/relance/campagnes')}
              data-tour="relance-campagnes"
              className="w-full bg-surface border border-border rounded-card p-4 flex items-center gap-3 text-left"
            >
              <span className="size-10 grid place-items-center rounded-tile bg-accent-soft text-accent shrink-0">
                <HugeiconsIcon icon={Megaphone01Icon} size={20} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink text-sm">Relancer vos anciens filleuls</span>
                {olderCount > 0 && (
                  <span className="block text-xs text-ink-3">
                    {olderCount} non payés (3 mois)
                    {olderAffordable < olderCount && ` · ${olderAffordable} avec vos crédits`}
                  </span>
                )}
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3 shrink-0" />
            </motion.button>

            <motion.div variants={unfold} className="bg-surface border border-border rounded-card">
              <button
                onClick={() => setHowOpen(o => !o)}
                aria-expanded={howOpen}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <HugeiconsIcon icon={InformationCircleIcon} size={20} className="text-ink-3" />
                <span className="flex-1 text-sm font-medium text-ink">Comment ça marche ?</span>
                <motion.span animate={{ rotate: howOpen ? 90 : 0 }} className="text-ink-3">
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {howOpen && (
                  <motion.ol
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden px-4 pb-4 space-y-2 text-sm text-ink-2 list-decimal list-inside"
                  >
                    <li>Inscrit sans payer</li>
                    <li>1 message par jour, 7 jours</li>
                    <li>Il paie : ça s'arrête</li>
                    <li>1 message = 1 crédit</li>
                  </motion.ol>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-pill text-sm font-medium text-white ${flash.tone === 'ok' ? 'bg-ink' : 'bg-danger'}`}
          >
            {flash.text}
          </motion.div>
        )}
      </AnimatePresence>

      <RelanceMessagesSheet open={messagesOpen} onClose={() => setMessagesOpen(false)} />
      <RelancePacksModal isOpen={packsOpen} onClose={() => { setPacksOpen(false); refreshBalance(); }} />

      <RelanceSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxPerDay={s?.maxMessagesPerDay ?? 500}
        showSmsLinks={smsBalance > 0 || !!s?.smsEnabled}
        onSaved={async (value) => {
          await queryClient.invalidateQueries({ queryKey: relanceKeys.status });
          say('ok', `Limite enregistrée : ${value} emails par jour.`);
        }}
      />

      <Sheet open={allOpen} onClose={() => setAllOpen(false)} title="Vos filleuls en cours">
        {allFilleuls.isLoading ? (
          <p className="text-sm text-ink-3 py-6 text-center">Chargement…</p>
        ) : (
          <RelanceFilleulList filleuls={allFilleuls.data?.targets ?? []} total={allFilleuls.data?.total ?? 0} />
        )}
      </Sheet>
    </motion.div>
  );
}
