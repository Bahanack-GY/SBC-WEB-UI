import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, Link01Icon, Location01Icon, Mic01Icon, Store01Icon, Video01Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import ShareLink from '../components/impact/ShareLink';
import { MEDALS, SHOWCASE_KIND, day, goBack, rankLabel, score, showcasePageUrl } from '../components/impact/stages';
import { sbcApiService } from '../services/SBCApiService';
import { useImpactShowcasePage } from '../hooks/useImpactShowcase';
import type { ImpactApiError } from '../hooks/useImpactCandidate';
import { sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

const card = 'bg-surface border border-border rounded-card p-4';
const outLink = 'flex items-center gap-3 rounded-tile border border-border bg-surface px-3 py-3 hover:bg-surface-2';

/** One « SBC Impact » page: the finalist, the project, the result, the links and the news. Public. */
export default function ImpactShowcasePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const page = useImpactShowcasePage(id);
  const p = page.data;

  let body;
  if (page.isLoading) {
    body = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de la page">
        <Skeleton height="h-56" rounded="rounded-card" />
        <Skeleton height="h-40" rounded="rounded-card" />
      </div>
    );
  } else if (page.isError || !p) {
    const notFound = (page.error as ImpactApiError)?.status === 404;
    body = (
      <div className={cn(card, 'flex flex-col gap-3')} role="alert">
        <p className="text-sm text-ink-2">{notFound ? 'Cette page n’existe pas ou n’est plus visible.' : (page.error as Error)?.message || 'Impossible de charger cette page.'}</p>
        <Link to="/impact" className="self-start text-sm font-semibold text-primary py-1">Voir SBC Impact</Link>
      </div>
    );
  } else {
    const r = p.result;
    const pr = p.profile;
    const podcastText = [p.podcast?.title, p.podcast?.platform].filter(Boolean).join(' · ');
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        <motion.section variants={sectionRise} className={cn(card, 'flex flex-col items-center text-center gap-2', r.winner && 'border-accent')}>
          <img src={sbcApiService.generateThumbnailUrl(pr.photoFileId, 384)} alt={`Photo de ${pr.name}`} className="size-28 rounded-pill object-cover bg-surface-2" />
          <span className={cn('inline-flex items-center gap-1 text-xs font-bold rounded-pill px-2.5 py-1', r.winner ? 'bg-accent text-white' : 'bg-accent-soft text-accent')}>
            {r.winner && <HugeiconsIcon icon={ChampionIcon} size={14} />}
            {r.winner ? 'Gagnant' : 'Finaliste'} · {r.editionName}
          </span>
          <h2 className="text-2xl font-bold text-ink leading-tight">{pr.name}</h2>
          <p className="text-base font-semibold text-primary">{pr.projectName}</p>
          <p className="text-xs text-ink-3 flex items-center gap-1">
            <HugeiconsIcon icon={Location01Icon} size={12} />
            {[pr.city, pr.country].filter(Boolean).join(', ')}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {pr.category && <span className="text-[11px] font-semibold text-primary bg-primary-soft rounded-pill px-2 py-0.5">{pr.category}</span>}
            {pr.activity && <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 rounded-pill px-2 py-0.5">{pr.activity}</span>}
          </div>
          {p.archived && <p className="text-xs text-ink-3">Page archivée.</p>}
        </motion.section>

        <motion.section variants={sectionRise} className="grid grid-cols-2 gap-2" aria-label="Résultat de la finale" data-testid="showcase-page-result">
          <div className={card}>
            <p className="text-xs text-ink-2">Classement</p>
            <p className="text-lg font-bold text-ink">{MEDALS[r.rank] ? `${MEDALS[r.rank]} ` : ''}{rankLabel(r.rank)}</p>
          </div>
          <div className={card}>
            <p className="text-xs text-ink-2">Score final</p>
            <p className="text-lg font-bold text-ink">{score(r.score)}/100</p>
          </div>
          <p className="col-span-2 text-xs text-ink-3 text-center">Finale du {day(r.decidedAt)} · {r.editionName}</p>
        </motion.section>

        {p.videoFileId && (
          <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-label="Vidéo de présentation">
            <video src={sbcApiService.generateSettingsFileUrl(p.videoFileId)} poster={sbcApiService.generateThumbnailUrl(pr.photoFileId, 768)}
              controls playsInline preload="metadata" aria-label={`Vidéo de présentation de ${pr.name}`} className="w-full max-h-[70vh] rounded-tile bg-black" />
          </motion.section>
        )}

        <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="showcase-project">
          <h3 id="showcase-project" className="text-lg font-bold text-ink">{pr.projectName}</h3>
          {pr.projectDescription && <p className="text-sm text-ink-2 whitespace-pre-line">{pr.projectDescription}</p>}
          {pr.presentation && <p className="text-sm text-ink-2 whitespace-pre-line">{pr.presentation}</p>}
        </motion.section>

        {(p.podcast || p.youtubeUrl || p.shopUrl) && (
          <motion.section variants={sectionRise} className="flex flex-col gap-2" aria-label="Liens">
            {p.podcast && (
              <a href={p.podcast.url} target="_blank" rel="noopener noreferrer" className={outLink}>
                <span className="size-9 grid place-items-center rounded-tile bg-primary-soft text-primary shrink-0"><HugeiconsIcon icon={Mic01Icon} size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">Écouter le podcast</span>
                  {podcastText && <span className="block text-xs text-ink-2 truncate">{podcastText}</span>}
                </span>
              </a>
            )}
            {p.youtubeUrl && (
              <a href={p.youtubeUrl} target="_blank" rel="noopener noreferrer" className={outLink}>
                <span className="size-9 grid place-items-center rounded-tile bg-danger-soft text-danger shrink-0"><HugeiconsIcon icon={Video01Icon} size={18} /></span>
                <span className="text-sm font-semibold text-ink">Voir sur YouTube</span>
              </a>
            )}
            {p.shopUrl && (
              <a href={p.shopUrl} target="_blank" rel="noopener noreferrer nofollow" className={outLink}>
                <span className="size-9 grid place-items-center rounded-tile bg-success-soft text-success shrink-0"><HugeiconsIcon icon={Store01Icon} size={18} /></span>
                <span className="text-sm font-semibold text-ink">Boutique / site</span>
              </a>
            )}
          </motion.section>
        )}

        <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="showcase-news">
          <h3 id="showcase-news" className="text-lg font-bold text-ink">Nouvelles du projet</h3>
          {p.updates.length === 0 ? (
            <p className="text-sm text-ink-3">Pas encore de nouvelle.</p>
          ) : (
            <ol className="flex flex-col">
              {p.updates.map((u, i) => (
                <li key={u._id} className="flex gap-3" data-testid="showcase-update">
                  <div className="flex flex-col items-center">
                    <span aria-hidden className="size-3 mt-1.5 rounded-pill bg-primary shrink-0" />
                    {i < p.updates.length - 1 && <span aria-hidden className="w-0.5 flex-1 bg-border" />}
                  </div>
                  <div className="pb-5 min-w-0 flex-1 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-semibold text-primary bg-primary-soft rounded-pill px-2 py-0.5">{SHOWCASE_KIND[u.kind] ?? u.kind}</span>
                      {u.publishedAt && <span className="text-xs text-ink-3">{day(u.publishedAt)}</span>}
                    </div>
                    <p className="text-sm font-bold text-ink">{u.title}</p>
                    <p className="text-sm text-ink-2 whitespace-pre-line">{u.body}</p>
                    {u.imageFileId && (
                      <img src={sbcApiService.generateThumbnailUrl(u.imageFileId, 768)} alt="" loading="lazy" className="w-full max-h-80 object-cover rounded-tile bg-surface-2" />
                    )}
                    {u.link && (
                      <a href={u.link} target="_blank" rel="noopener noreferrer nofollow" className="self-start flex items-center gap-1 text-sm font-semibold text-primary">
                        <HugeiconsIcon icon={Link01Icon} size={14} />
                        En savoir plus
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </motion.section>

        <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-label="Partager">
          <p className="text-sm text-ink-2">Partagez le parcours de {pr.name}.</p>
          <ShareLink url={showcasePageUrl(p._id)} text={`Découvrez ${pr.name} et son projet ${pr.projectName} sur SBC Impact`} title="SBC Impact" />
        </motion.section>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 max-w-2xl mx-auto">
        <BackButton onClick={() => goBack(navigate, '/impact')} />
        <h1 className="text-xl font-bold text-ink truncate">{p?.profile.name ?? 'SBC Impact'}</h1>
      </div>
      <div className="px-4 pb-10 max-w-2xl mx-auto">{body}</div>
    </div>
  );
}
