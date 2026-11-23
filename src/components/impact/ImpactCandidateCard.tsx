import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ChampionIcon, Rocket01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import type { ImpactEdition } from '../../types/impact';
import { FREE_ROUND, PAID_ROUND, STAGE_INFO, roundLine } from './stages';

/**
 * Entry to the SBC Impact Challenge (v2), shown while an edition is live: at the
 * top of /impact-challenge and on the home page. During the qualification it
 * leads to the candidate space; once the competition starts, to the board.
 */
export default function ImpactCandidateCard({ edition }: { edition: ImpactEdition }) {
  const competition = edition.status === 'COMPETITION' || edition.status === 'FINAL' || edition.status === 'FINISHED';
  if (competition) {
    const stage = edition.stage ?? 'WEEK1';
    const toFinal = stage === 'LIVE' || stage === 'RESULT';
    const info = STAGE_INFO[stage];
    const line = stage === 'WEEK2' ? roundLine(edition.rounds?.FREE, FREE_ROUND)
      : stage === 'WEEK3' ? roundLine(edition.rounds?.PAID, PAID_ROUND)
        : `${info.week} : ${info.title}`;
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
        <Link to={toFinal ? '/impact-challenge/finale' : '/impact-challenge/candidats'} className="relative block overflow-hidden bg-ink text-white rounded-card p-4">
          <span aria-hidden className="absolute -right-8 -bottom-10 size-32 rounded-pill bg-white/10" />
          <span aria-hidden className="absolute right-4 top-4 size-10 grid place-items-center rounded-pill bg-accent text-white">
            <HugeiconsIcon icon={ChampionIcon} size={20} />
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/70">{edition.name}</span>
          <span className="block font-bold text-lg leading-tight mt-1 pr-12">
            {stage === 'LIVE' ? 'SBC Impact Challenge : la finale en direct'
              : stage === 'RESULT' ? 'SBC Impact Challenge : le résultat'
                : stage === 'TOP3' ? 'SBC Impact Challenge : les finalistes' : 'SBC Impact Challenge : votez pour les candidats'}
          </span>
          <span className="block text-sm text-white/85 mt-1 pr-6">{info.text}</span>
          <span className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-white/80 min-w-0">{line}</span>
            <span className="flex items-center gap-1 bg-white text-ink text-sm font-semibold rounded-pill px-3 py-1.5 shrink-0">
              {stage === 'LIVE' ? 'Suivre la finale' : stage === 'RESULT' ? 'Voir le résultat' : 'Voir les candidats'}
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </span>
          </span>
        </Link>
      </motion.div>
    );
  }

  const open = edition.registrationOpen;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
      <Link
        to="/impact-challenge/candidat"
        className="relative block overflow-hidden bg-ink text-white rounded-card p-4"
      >
        <span aria-hidden className="absolute -right-8 -bottom-10 size-32 rounded-pill bg-white/10" />
        <span aria-hidden className="absolute right-4 top-4 size-10 grid place-items-center rounded-pill bg-accent text-white">
          <HugeiconsIcon icon={Rocket01Icon} size={20} />
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/70">{edition.name}</span>
        <span className="block font-bold text-lg leading-tight mt-1 pr-12">
          {open ? 'SBC Impact Challenge : devenez candidat' : 'SBC Impact Challenge'}
        </span>
        <span className="block text-sm text-white/85 mt-1 pr-6">
          {open
            ? `Invitez ${edition.settings.invitationsRequired} personnes qui rejoignent SBC et décrochez votre place dans la compétition.`
            : 'Suivez votre candidature et les prochaines étapes.'}
        </span>
        <span className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-white/80">
            <HugeiconsIcon icon={UserGroupIcon} size={14} />
            {edition.seats.taken}/{edition.seats.max} places prises
          </span>
          <span className="flex items-center gap-1 bg-white text-ink text-sm font-semibold rounded-pill px-3 py-1.5 shrink-0">
            {open ? 'Participer' : 'Mon espace'}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
