import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, JusticeScale01Icon } from '@hugeicons/core-free-icons';
import { useImpactJury } from '../../hooks/useImpactCandidate';

/**
 * « Espace jury », shown on the Impact pages to a member who sits on a final's
 * jury. `active` = the edition is in its final: only then can /jury/me be non-empty,
 * so nobody else pays for the request.
 */
export default function JuryEntryCard({ active, className }: { active: boolean; className?: string }) {
  const jury = useImpactJury({ enabled: active });
  const mine = jury.data ?? [];
  if (!active || mine.length === 0) return null;
  const scoring = mine.some((j) => j.canScore);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={className}>
      <Link to="/impact-challenge/jury" className="flex items-center gap-3 bg-surface border border-primary rounded-card p-4">
        <span className="size-10 grid place-items-center rounded-tile bg-primary-soft text-primary shrink-0">
          <HugeiconsIcon icon={JusticeScale01Icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">Espace jury</span>
          <span className="block text-sm text-ink-2">
            {scoring ? 'La notation est ouverte : notez les finalistes.' : 'Vous faites partie du jury de la finale.'}
          </span>
        </span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-primary shrink-0" />
      </Link>
    </motion.div>
  );
}
