import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet } from './ui/Sheet';
import { ConfirmSheet } from './ui/ConfirmSheet';
import { RelanceJourney } from './RelanceJourney';
import { CampaignStatusPill } from './CampaignCard';
import { CountUp } from './ui/CountUp';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { frenchErrorFrom, journeyBuckets } from '../../utils/relance';
import type { Campaign, CampaignDetailStats } from '../../types/relance';

type Action = 'pause' | 'resume' | 'stop' | 'delete';

const CONFIRM: Record<'stop' | 'delete', { title: string; message: string; label: string }> = {
  stop: {
    title: 'Arrêter la campagne ?',
    message: "Les filleuls de cette campagne ne recevront plus aucun message. Ce n'est pas une pause : on ne peut pas la reprendre.",
    label: 'Arrêter',
  },
  delete: {
    title: 'Supprimer la campagne ?',
    message: 'Elle disparaît de votre liste. Les messages déjà envoyés ne sont pas concernés.',
    label: 'Supprimer',
  },
};

/** One campaign in full: where its filleuls are, what it achieved, what to do next. */
export function CampaignDetailSheet({
  campaign, onClose, onChanged,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [confirm, setConfirm] = useState<'stop' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useQuery({
    queryKey: ['relance', 'campaign-stats', campaign?._id],
    queryFn: async (): Promise<CampaignDetailStats> =>
      handleApiResponse(await sbcApiService.relanceGetCampaignStats(campaign!._id)),
    enabled: !!campaign,
  });

  const run = async (action: Action) => {
    if (!campaign) return;
    setBusy(true);
    setError(null);
    try {
      const call = {
        pause: () => sbcApiService.relancePauseCampaign(campaign._id),
        resume: () => sbcApiService.relanceResumeCampaign(campaign._id),
        stop: () => sbcApiService.relanceCancelCampaign(campaign._id),
        delete: () => sbcApiService.relanceDeleteCampaign(campaign._id),
      }[action];
      handleApiResponse(await call());
      setConfirm(null);
      onChanged({
        pause: 'Campagne en pause. Ses filleuls attendent là où ils en sont.',
        resume: 'Campagne relancée.',
        stop: 'Campagne arrêtée.',
        delete: 'Campagne supprimée.',
      }[action]);
      onClose();
    } catch (err) {
      setError(frenchErrorFrom(err, "L'action n'a pas abouti. Réessayez."));
    } finally {
      setBusy(false);
    }
  };

  const d = stats.data;
  const buckets = journeyBuckets({
    activeTargets: d?.activeTargets ?? 0,
    dayProgression: d?.dayProgression,
    targetsConverted: d?.targetsConverted ?? d?.exitReasons?.paid,
    completedRelance: d?.completedRelance ?? d?.exitReasons?.completed_7days,
  });
  const status = campaign?.status;

  return (
    <>
      <Sheet
        open={!!campaign && !confirm}
        onClose={onClose}
        title={campaign?.name}
        footer={campaign && (
          <div className="flex gap-2">
            {status === 'active' && (
              <button onClick={() => run('pause')} disabled={busy} className="flex-1 h-12 rounded-tile bg-surface-2 text-ink font-semibold disabled:opacity-50">
                Mettre en pause
              </button>
            )}
            {status === 'paused' && (
              <button onClick={() => run('resume')} disabled={busy} className="flex-1 h-12 rounded-tile bg-success text-white font-semibold disabled:opacity-50">
                Reprendre
              </button>
            )}
            {(status === 'active' || status === 'paused') && (
              <button onClick={() => setConfirm('stop')} disabled={busy} className="flex-1 h-12 rounded-tile bg-danger-soft text-danger font-semibold disabled:opacity-50">
                Arrêter
              </button>
            )}
            {(status === 'completed' || status === 'cancelled' || status === 'draft') && (
              <button onClick={() => setConfirm('delete')} disabled={busy} className="flex-1 h-12 rounded-tile bg-danger-soft text-danger font-semibold disabled:opacity-50">
                Supprimer
              </button>
            )}
          </div>
        )}
      >
        {campaign && (
          <div className="space-y-3">
            <CampaignStatusPill status={campaign.status} />

            <div className="grid grid-cols-3 gap-2">
              {[
                ['Filleuls', d?.totalEnrolled ?? campaign.targetsEnrolled ?? 0],
                ['Messages', d?.totalMessagesSent ?? campaign.messagesSent ?? 0],
                ['Ont payé', buckets.paid],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-tile bg-surface-2 p-3 text-center">
                  <div className="text-lg font-bold text-ink"><CountUp value={Number(value)} /></div>
                  <div className="text-xs text-ink-3">{label}</div>
                </div>
              ))}
            </div>

            {stats.isLoading ? (
              <div className="h-80 rounded-card bg-surface-2 animate-pulse" />
            ) : stats.isError ? (
              <p className="text-sm text-ink-3 text-center py-6">Détails indisponibles pour le moment.</p>
            ) : (
              <RelanceJourney buckets={buckets} live={status === 'active'} />
            )}

            {error && <p role="alert" className="text-sm text-danger text-center">{error}</p>}
          </div>
        )}
      </Sheet>

      {confirm && (
        <ConfirmSheet
          open
          danger
          busy={busy}
          title={CONFIRM[confirm].title}
          message={CONFIRM[confirm].message}
          confirmLabel={CONFIRM[confirm].label}
          onConfirm={() => run(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
