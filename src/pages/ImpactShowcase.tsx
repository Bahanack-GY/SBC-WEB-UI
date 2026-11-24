import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, Location01Icon, StarIcon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import MyShowcaseCard from '../components/impact/MyShowcaseCard';
import { day, goBack, rankLabel } from '../components/impact/stages';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { useImpactShowcase } from '../hooks/useImpactShowcase';
import type { ImpactShowcaseCard } from '../types/impact';
import { listContainer, listItem, sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

const card = 'bg-surface border border-border rounded-card p-4';

function ShowcaseItem({ c }: { c: ImpactShowcaseCard }) {
  const r = c.result;
  const n = c.updates ?? 0;
  return (
    <motion.li variants={listItem}>
      <Link to={`/impact/${encodeURIComponent(c._id)}`} aria-label={`${c.profile.name}, ${c.profile.projectName}`}
        className={cn(card, 'h-full flex flex-col gap-3 hover:bg-surface-2 transition-colors', r.winner && 'border-accent')}>
        <div className="flex items-center gap-3">
          <img src={sbcApiService.generateThumbnailUrl(c.profile.photoFileId, 192)} alt="" loading="lazy"
            className="size-16 rounded-pill object-cover bg-surface-2 shrink-0" />
          <div className="min-w-0">
            <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold rounded-pill px-2 py-0.5',
              r.winner ? 'bg-accent text-white' : 'bg-accent-soft text-accent')} data-testid="showcase-result">
              {r.winner && <HugeiconsIcon icon={ChampionIcon} size={12} />}
              {r.winner ? 'Gagnant' : `Finaliste · ${rankLabel(r.rank)}`}
            </span>
            <p className="font-bold text-ink leading-tight mt-1 truncate">{c.profile.name}</p>
            <p className="text-sm font-semibold text-primary truncate">{c.profile.projectName}</p>
          </div>
        </div>
        <p className="text-xs text-ink-3 flex items-center gap-1">
          <HugeiconsIcon icon={Location01Icon} size={12} />
          {[c.profile.city, c.profile.country].filter(Boolean).join(', ')} · {r.editionName}
        </p>
        <p className="text-xs text-ink-2 mt-auto" data-testid="showcase-news">
          {n > 0
            ? `${n} nouvelle${n > 1 ? 's' : ''}${c.lastUpdateAt ? ` · dernière le ${day(c.lastUpdateAt)}` : ''}`
            : 'Pas encore de nouvelle'}
        </p>
      </Link>
    </motion.li>
  );
}

/** « SBC Impact »: the finalists of the SBC Impact Challenge, followed for at least a year. Public. */
export default function ImpactShowcase() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const list = useImpactShowcase();
  const active = list.data?.active ?? [];
  const archived = list.data?.archived ?? [];

  let body;
  if (list.isLoading) {
    body = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-busy="true" aria-label="Chargement de SBC Impact">
        <Skeleton height="h-40" rounded="rounded-card" />
        <Skeleton height="h-40" rounded="rounded-card" />
      </div>
    );
  } else if (list.isError) {
    body = (
      <div className="bg-danger-soft text-danger rounded-card p-4 flex flex-col gap-3" role="alert">
        <p className="text-sm">{(list.error as Error)?.message || 'Impossible de charger SBC Impact.'}</p>
        <button type="button" onClick={() => list.refetch()} className="self-start bg-surface text-ink font-semibold text-sm rounded-pill px-4 py-2 border border-border">
          Réessayer
        </button>
      </div>
    );
  } else if (!active.length && !archived.length) {
    body = (
      <motion.section variants={sectionRise} initial="hidden" animate="show" className={cn(card, 'p-6 flex flex-col items-center text-center gap-3')}>
        <span className="size-14 grid place-items-center rounded-pill bg-accent-soft text-accent"><HugeiconsIcon icon={StarIcon} size={28} /></span>
        <h2 className="text-lg font-bold text-ink">Les premiers finalistes arrivent bientôt</h2>
        <p className="text-sm text-ink-2">Après la grande finale du SBC Impact Challenge, ses finalistes et leurs projets seront présentés ici.</p>
      </motion.section>
    );
  } else {
    body = (
      <div className="flex flex-col gap-4">
        {active.length > 0 && (
          <motion.ul variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-label="Les finalistes à l’affiche">
            {active.map((c) => <ShowcaseItem key={c._id} c={c} />)}
          </motion.ul>
        )}
        {archived.length > 0 && (
          <details className={card} data-testid="showcase-archives">
            <summary className="text-sm font-semibold text-ink cursor-pointer select-none">Archives ({archived.length})</summary>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3" aria-label="Archives">
              {archived.map((c) => <ShowcaseItem key={c._id} c={c} />)}
            </ul>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 max-w-5xl mx-auto">
        <BackButton onClick={() => goBack(navigate, '/')} />
        <h1 className="text-xl font-bold text-ink">SBC Impact</h1>
      </div>
      <motion.div variants={sequence} initial="hidden" animate="show" className="px-4 pb-10 max-w-5xl mx-auto flex flex-col gap-4">
        <motion.section variants={sectionRise} className="bg-primary text-white rounded-card p-4 lg:p-6 flex flex-col gap-2 relative overflow-hidden">
          <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-pill bg-white/10" />
          <h2 className="text-xl lg:text-3xl font-bold leading-tight relative">Les entrepreneurs SBC Impact</h2>
          <p className="text-sm lg:text-base text-white/85 relative">
            Les finalistes du SBC Impact Challenge, suivis pendant au moins un an : leurs projets, leurs résultats et les nouvelles de leur aventure.
          </p>
        </motion.section>
        {isAuthenticated && <MyShowcaseCard />}
        {body}
      </motion.div>
    </div>
  );
}
