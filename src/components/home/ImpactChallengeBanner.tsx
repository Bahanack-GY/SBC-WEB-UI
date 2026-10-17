import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, ArrowRight01Icon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { useCurrentImpactChallenge, timeLeftLabel } from '../../hooks/useImpactChallenge';

/**
 * Home entry to the Impact Challenge. Shown only while a challenge is open to
 * votes: the API answers 404 otherwise, and a failing call hides it too — the
 * home page must not show a broken card for an optional module.
 */
function ImpactChallengeBanner() {
  const { data } = useCurrentImpactChallenge();
  if (!data) return null;
  const { challenge, entrepreneurs } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to="/impact-challenge"
        className="relative block overflow-hidden bg-primary text-white rounded-card p-4"
      >
        <span aria-hidden className="absolute -right-8 -bottom-10 size-32 rounded-pill bg-white/10" />
        <span aria-hidden className="absolute right-4 top-4 size-10 grid place-items-center rounded-pill bg-white/15">
          <HugeiconsIcon icon={ChampionIcon} size={20} />
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/80">SBC Impact Challenge</span>
        <span className="block font-bold text-lg leading-tight mt-1 pr-12">{challenge.campaignName}</span>
        <span className="block text-sm text-white/85 mt-1 pr-6">
          Votez pour l'entrepreneur de votre choix et gagnez des tickets de tombola.
        </span>
        <span className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-white/80">
            <HugeiconsIcon icon={Ticket01Icon} size={14} />
            {entrepreneurs.length > 0 && `${entrepreneurs.length} entrepreneur${entrepreneurs.length > 1 ? 's' : ''} · `}
            {timeLeftLabel(challenge.endDate)}
          </span>
          <span className="flex items-center gap-1 bg-white text-primary text-sm font-semibold rounded-pill px-3 py-1.5 shrink-0">
            Voter
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </span>
        </span>
      </Link>
    </motion.div>
  );
}

export default ImpactChallengeBanner;
