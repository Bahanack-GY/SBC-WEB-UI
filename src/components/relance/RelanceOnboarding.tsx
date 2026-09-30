import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, SentIcon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { popIn, riseFar, sequence, slideLeft } from '../../utils/motion';
import { RELANCE_DAYS } from '../../utils/relance';

/** Seven days light up one after another, then the filleul pays. Loops. */
function JourneyTeaser() {
  const reduce = useReducedMotion();
  const cycle = 4.2;
  return (
    <div className="flex items-center justify-center gap-1.5 py-2" aria-hidden>
      {Array.from({ length: RELANCE_DAYS }, (_, i) => (
        <motion.span
          key={i}
          className="grid place-items-center size-7 rounded-pill text-[11px] font-bold bg-surface-2 text-ink-3"
          animate={reduce ? undefined : {
            backgroundColor: ['#F1F5F9', '#115CF6', '#115CF6', '#F1F5F9'],
            color: ['#94A3B8', '#FFFFFF', '#FFFFFF', '#94A3B8'],
            scale: [1, 1.18, 1, 1],
          }}
          transition={{ duration: cycle, times: [0, 0.06 + i * 0.07, 0.85, 1], repeat: Infinity, ease: 'easeOut' }}
        >
          {i + 1}
        </motion.span>
      ))}
      <motion.span
        className="grid place-items-center size-8 rounded-pill bg-success text-white ml-1"
        animate={reduce ? undefined : { scale: [0, 0, 1.25, 1, 1, 0], opacity: [0, 0, 1, 1, 1, 0] }}
        transition={{ duration: cycle, times: [0, 0.55, 0.62, 0.68, 0.9, 1], repeat: Infinity }}
      >
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
      </motion.span>
    </div>
  );
}

const STEPS = [
  { icon: Wallet01Icon, title: 'Achetez des crédits', text: '1 crédit = 1 message' },
  { icon: SentIcon, title: "SBC s'occupe du reste", text: '1 message par jour, 7 jours' },
  { icon: CheckmarkCircle02Icon, title: 'Il paie, ça s’arrête', text: 'Plus aucun message' },
];

/** First visit, no credits yet: what relance does, in three steps, and one button. */
export function RelanceOnboarding({ onBuy }: { onBuy: () => void }) {
  return (
    <motion.div variants={sequence} initial="hidden" animate="show" className="space-y-4 pt-2">
      <motion.section variants={popIn} className="bg-surface border border-border rounded-card p-5 text-center">
        <JourneyTeaser />
        <h2 className="mt-3 text-xl font-bold text-ink">Relancez vos nouveaux filleuls, automatiquement</h2>
      </motion.section>

      <motion.ol variants={slideLeft} className="bg-surface border border-border rounded-card divide-y divide-border">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 p-4">
            <span className="size-9 grid place-items-center rounded-tile bg-primary-soft text-primary shrink-0 font-bold">
              {i + 1}
            </span>
            <div>
              <div className="font-semibold text-ink text-sm flex items-center gap-1.5">
                <HugeiconsIcon icon={step.icon} size={16} className="text-ink-3" />
                {step.title}
              </div>
              <p className="text-sm text-ink-2 mt-0.5">{step.text}</p>
            </div>
          </li>
        ))}
      </motion.ol>

      <motion.button
        variants={riseFar}
        whileTap={{ scale: 0.97 }}
        onClick={onBuy}
        className="w-full h-12 rounded-tile bg-primary text-white font-semibold"
      >
        Acheter des crédits
      </motion.button>
    </motion.div>
  );
}
