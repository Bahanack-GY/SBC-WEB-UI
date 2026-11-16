import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoneyReceive02Icon } from '@hugeicons/core-free-icons';
import { CountUp } from './ui/CountUp';
import { popIn } from '../../utils/motion';

export type RelanceEarnings = { paid: number; earnings: { XAF: number; USD: number } | null };

/** What relance brought: the commissions from filleuls who paid while being relanced. */
export function RelanceEarningsCard({ data }: { data: RelanceEarnings }) {
  const plural = data.paid > 1 ? 's' : '';
  return (
    <motion.section
      variants={popIn}
      aria-label="Gains de la relance"
      className="rounded-card p-4 bg-success-soft border border-success/30 flex items-center gap-3"
    >
      <span className="size-11 grid place-items-center rounded-tile bg-success text-white shrink-0">
        <HugeiconsIcon icon={MoneyReceive02Icon} size={22} />
      </span>
      <div className="min-w-0">
        {data.earnings ? (
          <>
            <div className="text-xl font-bold text-success leading-tight">
              <CountUp value={data.earnings.XAF} /> FCFA
              {data.earnings.USD > 0 && <span className="text-base"> + {data.earnings.USD} $</span>}
            </div>
            <div className="text-xs text-ink-2">gagnés grâce à {data.paid} filleul{plural} relancé{plural}</div>
          </>
        ) : (
          <div className="text-sm font-semibold text-success">{data.paid} filleul{plural} relancé{plural} {data.paid > 1 ? 'ont' : 'a'} payé</div>
        )}
      </div>
    </motion.section>
  );
}
