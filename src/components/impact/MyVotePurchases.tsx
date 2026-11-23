import { motion } from 'motion/react';
import { francs } from '../../hooks/useImpactChallenge';
import { sectionRise } from '../../utils/motion';
import { cn } from '../../lib/utils';
import type { ImpactPurchase } from '../../types/impact';
import { dateTime, plural } from './stages';

const STATUS: Record<ImpactPurchase['status'], { label: string; tone: string }> = {
  PENDING: { label: 'En cours de vérification', tone: 'bg-accent-soft text-accent' },
  SUCCESS: { label: 'Votes comptés', tone: 'bg-success-soft text-success' },
  FAILED: { label: 'Échoué', tone: 'bg-danger-soft text-danger' },
  CANCELLED: { label: 'Annulé', tone: 'bg-surface-2 text-ink-2' },
  REFUNDED: { label: 'Remboursé', tone: 'bg-surface-2 text-ink-2' },
};

const statusOf = (p: ImpactPurchase) =>
  p.status === 'SUCCESS' && !p.counted
    ? { label: 'Payé après la clôture : remboursé sur votre solde', tone: 'bg-surface-2 text-ink-2' }
    : STATUS[p.status] ?? STATUS.PENDING;

/** « Mes achats de votes »: each purchase, its status and, when refunded, why. */
export default function MyVotePurchases({ purchases }: {
  purchases: (ImpactPurchase & { candidateName?: string | null })[];
}) {
  if (!purchases.length) return null;
  return (
    <motion.section variants={sectionRise} initial="hidden" animate="show"
      className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3" aria-labelledby="impact-my-purchases">
      <h2 id="impact-my-purchases" className="text-lg font-bold text-ink">Mes achats de votes</h2>
      <ul className="flex flex-col divide-y divide-border">
        {purchases.map((p) => {
          const s = statusOf(p);
          const who = p.candidateName;
          return (
            <li key={p._id} className="py-2.5 flex flex-col gap-1" data-testid="impact-purchase">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-ink">
                  {plural(p.votes, 'vote', 'votes')}{who ? ` pour ${who}` : ''}
                </span>
                <span className="text-sm font-bold text-ink shrink-0">{francs(p.amount)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                <span className={cn('font-semibold rounded-pill px-2 py-0.5', s.tone)}>{s.label}</span>
                <span>{p.method === 'BALANCE' ? 'Solde SBC' : 'Mobile Money'}</span>
                <span>· {dateTime(p.createdAt)}</span>
              </div>
              {p.refund?.reason && (
                <p className="text-xs text-ink-2">Remboursé sur votre solde SBC : {p.refund.reason}</p>
              )}
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
