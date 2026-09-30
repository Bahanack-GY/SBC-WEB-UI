import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { CAMPAIGN_STATUS } from '../../utils/relance';
import type { Campaign } from '../../types/relance';

const TONE: Record<string, string> = {
  live: 'bg-success-soft text-success',
  paused: 'bg-accent-soft text-accent',
  done: 'bg-primary-soft text-primary',
  stopped: 'bg-surface-2 text-ink-3',
  draft: 'bg-surface-2 text-ink-2',
};

const DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

export function CampaignStatusPill({ status }: { status: Campaign['status'] }) {
  const s = CAMPAIGN_STATUS[status] ?? CAMPAIGN_STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-pill text-xs font-semibold ${TONE[s.tone]}`}>
      {s.tone === 'live' && (
        <motion.span
          className="size-1.5 rounded-pill bg-success-dot"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
      {s.label}
    </span>
  );
}

/** One campaign: what it is, where it's at, and a tap to see more. */
export function CampaignCard({ campaign, onOpen }: { campaign: Campaign; onOpen: () => void }) {
  const done = campaign.targetsCompleted ?? 0;
  const enrolled = campaign.targetsEnrolled ?? 0;
  const share = enrolled > 0 ? Math.min(1, done / enrolled) : 0;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onOpen}
      className="w-full text-left bg-surface border border-border rounded-card p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-ink truncate">{campaign.name}</div>
          <div className="text-xs text-ink-3 mt-0.5">Lancée le {DATE.format(new Date(campaign.startedAt ?? campaign.createdAt))}</div>
        </div>
        <CampaignStatusPill status={campaign.status} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-ink-2">
        <span><strong className="text-ink">{enrolled}</strong> filleuls</span>
        <span><strong className="text-ink">{campaign.messagesSent ?? 0}</strong> messages envoyés</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="ml-auto text-ink-3" />
      </div>

      <div className="mt-2 h-1.5 rounded-pill bg-surface-2 overflow-hidden" aria-hidden>
        <motion.div
          className="h-full rounded-pill bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${share * 100}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.button>
  );
}
