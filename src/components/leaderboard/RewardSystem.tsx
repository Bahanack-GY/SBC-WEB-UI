import { HugeiconsIcon } from '@hugeicons/react';
import { Award01Icon, GiftIcon } from '@hugeicons/core-free-icons';
import { LEADER_TIERS, nextTier, tierForSales } from '../../lib/leaderTiers';
import { cn } from '../../lib/utils';

const xaf = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * The badge ladder. `mySales` highlights the tier the viewer currently holds
 * and how far the next one is; omit it to render the table alone.
 */
function RewardSystem({ mySales }: { mySales?: number }) {
  const held = typeof mySales === 'number' ? tierForSales(mySales) : null;
  const next = typeof mySales === 'number' ? nextTier(mySales) : null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Award01Icon} size={18} className="text-accent" />
        <h2 className="text-base font-bold text-ink">Système de récompense</h2>
      </div>
      <p className="text-xs text-ink-3 -mt-1">
        Les badges se gagnent sur vos ventes du mois. Le bonus est versé sur votre
        <strong className="font-semibold text-ink-2"> solde d'activation</strong>, pour activer vos filleuls.
      </p>

      <ul className="flex flex-col gap-2 mt-1">
        {LEADER_TIERS.map((tier) => {
          const isHeld = held?.key === tier.key;
          return (
            <li
              key={tier.key}
              className={cn(
                'bg-surface rounded-card border p-3 flex items-center gap-3',
                isHeld ? 'border-primary' : 'border-border',
              )}
            >
              <span className={cn('shrink-0 size-10 grid place-items-center rounded-tile', tier.tint)}>
                <HugeiconsIcon icon={Award01Icon} size={20} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-ink text-sm">{tier.label}</span>
                  {isHeld && (
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-pill bg-primary text-white">
                      Votre badge
                    </span>
                  )}
                </span>
                <span className="block text-xs text-ink-3">
                  {tier.minSales} ventes / mois
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold text-success">{xaf(tier.bonusXaf)}</span>
                {tier.extra && (
                  <span className="block text-[11px] text-ink-2 flex items-center gap-1 justify-end">
                    <HugeiconsIcon icon={GiftIcon} size={11} className="text-accent" />
                    {tier.extra}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {next && (
        <p className="text-xs text-ink-2 bg-primary-soft rounded-card p-3 mt-1">
          Encore <span className="font-bold text-primary">{next.remaining} vente{next.remaining > 1 ? 's' : ''}</span>{' '}
          ce mois pour décrocher <span className="font-bold text-primary">{next.tier.label}</span>.
        </p>
      )}
    </section>
  );
}

export default RewardSystem;
