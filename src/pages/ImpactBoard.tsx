import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, CheckmarkCircle02Icon, GiftIcon, Location01Icon, Rocket01Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import MyVotePurchases from '../components/impact/MyVotePurchases';
import { FREE_ROUND, MEDALS, PAID_ROUND, STAGE_INFO, plural, roundLine } from '../components/impact/stages';
import { sbcApiService } from '../services/SBCApiService';
import JuryEntryCard from '../components/impact/JuryEntryCard';
import { isFinalEdition, openRound, useImpactBoard, useImpactCurrentEdition, useImpactMyVotes } from '../hooks/useImpactCandidate';
import { FINAL_STAGES, type ImpactEdition, type ImpactPublicCandidate, type ImpactStage } from '../types/impact';
import { listContainer, listItem, sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

const card = 'bg-surface border border-border rounded-card p-4';

function StageBanner({ stage, edition }: { stage: ImpactStage; edition: ImpactEdition | null | undefined }) {
  const info = STAGE_INFO[stage];
  const lines: string[] = [];
  if (stage === 'WEEK1' || stage === 'WEEK2') lines.push(roundLine(edition?.rounds?.FREE, FREE_ROUND));
  if (stage === 'WEEK3') lines.push(roundLine(edition?.rounds?.PAID, PAID_ROUND));
  return (
    <motion.section variants={sectionRise} className="bg-primary text-white rounded-card p-4 flex flex-col gap-2 relative overflow-hidden" aria-label={`${info.week} : ${info.title}`}>
      <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-pill bg-white/10" />
      <span className="self-start text-[11px] font-semibold uppercase tracking-wide bg-white/15 rounded-pill px-2.5 py-1">{info.week}</span>
      <h2 className="text-xl font-bold leading-tight relative">{info.title}</h2>
      <p className="text-sm text-white/85 relative">{info.text}</p>
      {lines.map((l) => (
        <p key={l} className="text-sm font-semibold bg-white/10 rounded-tile px-3 py-2 relative" data-testid="impact-round-line">{l}</p>
      ))}
    </motion.section>
  );
}

function Metric({ c, stage, position }: { c: ImpactPublicCandidate; stage: ImpactStage; position: number }) {
  if (FINAL_STAGES.includes(stage)) {
    return (
      <span className="shrink-0 flex flex-col items-end">
        {c.rank ? (
          <span className="text-lg font-bold text-ink" aria-label={`${c.rank}e`}>
            {MEDALS[c.rank] ? <span aria-hidden>{MEDALS[c.rank]} </span> : null}{c.rank === 1 ? '1er' : `${c.rank}e`}
          </span>
        ) : null}
        <span className="text-xs text-ink-3">{plural(c.votes.paid, 'vote', 'votes')}</span>
      </span>
    );
  }
  if (stage === 'WEEK1') {
    return c.seatNumber ? <span className="shrink-0 text-xs font-semibold text-ink-2 bg-surface-2 rounded-pill px-2 py-0.5">Place n° {c.seatNumber}</span> : null;
  }
  const n = stage === 'WEEK2' ? c.votes.free : c.votes.paid;
  return (
    <span className="shrink-0 flex flex-col items-end">
      <span className="text-sm font-bold text-ink">{plural(n, 'vote', 'votes')}</span>
      <span className="text-xs text-ink-3">{position === 1 ? '1er' : `${position}e`}</span>
    </span>
  );
}

function CandidateRow({ c, stage, position, votedFor, mine }: {
  c: ImpactPublicCandidate; stage: ImpactStage; position: number; votedFor: boolean; mine: boolean;
}) {
  return (
    <motion.li variants={listItem}>
      <Link
        to={`/impact-challenge/candidats/${encodeURIComponent(c._id)}`}
        aria-label={`${c.profile.name}, ${c.profile.projectName}`}
        className={cn(card, 'flex items-center gap-3 hover:bg-surface-2 transition-colors',
          FINAL_STAGES.includes(stage) && (c.status === 'FINALIST' || c.status === 'WINNER') && 'border-accent', mine && 'border-primary bg-primary-soft/40')}
      >
        <img
          src={sbcApiService.generateThumbnailUrl(c.profile.photoFileId, 128)}
          alt=""
          loading="lazy"
          className="size-14 rounded-pill object-cover bg-surface-2 shrink-0"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-ink truncate">{c.profile.name}</span>
            {mine && <span className="shrink-0 text-[11px] font-bold text-white bg-primary rounded-pill px-2 py-0.5" data-testid="impact-mine">Vous</span>}
          </span>
          <span className="block text-sm text-ink-2 truncate">{c.profile.projectName}</span>
          <span className="flex items-center gap-1 text-xs text-ink-3 truncate">
            <HugeiconsIcon icon={Location01Icon} size={12} />
            {[c.profile.city, c.profile.country].filter(Boolean).join(', ')}
            {votedFor && <span className="ml-1 font-semibold text-success">· Votre vote</span>}
          </span>
          {FINAL_STAGES.includes(stage) && (
            <span className={cn('mt-1 inline-block text-[11px] font-bold rounded-pill px-2 py-0.5',
              c.status === 'FINALIST' || c.status === 'WINNER' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-3')}>
              {c.statusLabel}
            </span>
          )}
        </span>
        <Metric c={c} stage={stage} position={position} />
      </Link>
    </motion.li>
  );
}

/** The competition's public board: the candidates of the current week and their votes. */
export default function ImpactBoard() {
  const navigate = useNavigate();
  // Both are polled only while a round is open (votes move); paused when the page is hidden.
  const current = useImpactCurrentEdition({ followRounds: true });
  const live = !!openRound(current.data);
  const board = useImpactBoard({ poll: live });
  const myVotes = useImpactMyVotes({ enabled: !!board.data });

  const stage = board.data?.stage ?? 'WEEK1';
  const freeVote = myVotes.data?.freeVote ?? null;
  const votedFor = freeVote?.candidateId ?? null;
  const mineId = myVotes.data?.myCandidateId ?? null;

  let body;
  if (board.isLoading) {
    body = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement des candidats">
        <Skeleton height="h-36" rounded="rounded-card" />
        <Skeleton height="h-20" rounded="rounded-card" />
        <Skeleton height="h-20" rounded="rounded-card" />
      </div>
    );
  } else if (board.isError) {
    body = (
      <div className="bg-danger-soft text-danger rounded-card p-4 flex flex-col gap-3" role="alert">
        <p className="text-sm">{(board.error as Error)?.message || 'Impossible de charger les candidats.'}</p>
        <button type="button" onClick={() => board.refetch()} className="self-start bg-surface text-ink font-semibold text-sm rounded-pill px-4 py-2 border border-border">
          Réessayer
        </button>
      </div>
    );
  } else if (!board.data) {
    body = (
      <motion.section variants={sectionRise} initial="hidden" animate="show" className={cn(card, 'p-6 flex flex-col items-center text-center gap-3')}>
        <span className="size-14 grid place-items-center rounded-pill bg-primary-soft text-primary">
          <HugeiconsIcon icon={Rocket01Icon} size={28} />
        </span>
        <h2 className="text-lg font-bold text-ink">La compétition n’a pas encore commencé</h2>
        <p className="text-sm text-ink-2">
          Les candidats officiels seront présentés ici dès le début de la compétition. Revenez bientôt pour découvrir leurs projets et voter.
        </p>
        {current.data && (
          <Link to="/impact-challenge/candidat" className="text-sm font-semibold text-primary py-1">Voir la qualification</Link>
        )}
      </motion.section>
    );
  } else {
    const list = board.data.candidates;
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        <StageBanner stage={stage} edition={current.data} />

        {(stage === 'LIVE' || stage === 'RESULT') && (
          <motion.div variants={sectionRise}>
            <Link to="/impact-challenge/finale" className="flex items-center justify-between gap-2 bg-accent text-white font-semibold rounded-card px-4 py-3.5">
              {stage === 'LIVE' ? 'Suivre la finale en direct' : 'Voir le résultat de la finale'}
              <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
            </Link>
          </motion.div>
        )}

        <JuryEntryCard active={isFinalEdition(current.data)} />

        {(stage === 'WEEK3' || FINAL_STAGES.includes(stage)) && (
          <motion.div variants={sectionRise}>
            <Link to="/impact-challenge/tombola" className={cn(card, 'flex items-center gap-3 py-3')}>
              <span className="size-9 grid place-items-center rounded-tile bg-accent-soft text-accent shrink-0"><HugeiconsIcon icon={GiftIcon} size={18} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink">Tombola</span>
                <span className="block text-xs text-ink-2">1 vote payant = 1 ticket pour les lots de la SBC Tombola.</span>
              </span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-primary shrink-0" />
            </Link>
          </motion.div>
        )}

        {stage === 'WEEK2' && votedFor && (
          <motion.p variants={sectionRise} role="status" className="text-sm text-success bg-success-soft rounded-card px-4 py-3 flex items-center gap-2">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
            Vous avez voté pour {freeVote?.candidateName ?? 'un candidat'}.
          </motion.p>
        )}

        {mineId && (
          <motion.div variants={sectionRise}>
            <Link to="/impact-challenge/candidat" className={cn(card, 'flex items-center justify-between gap-2 py-3 text-sm font-semibold text-primary')}>
              Mon espace candidat
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </Link>
          </motion.div>
        )}

        <motion.section variants={sectionRise} className="flex flex-col gap-3" aria-labelledby="impact-board-list">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="impact-board-list" className="text-lg font-bold text-ink">
              {stage === 'RESULT' ? 'Classement final' : FINAL_STAGES.includes(stage) ? 'Classement du TOP 3' : 'Les candidats'}
            </h2>
            {stage === 'WEEK2' && <span className="text-xs text-ink-3">{plural(board.data.totals.freeVotes, 'vote gratuit', 'votes gratuits')}</span>}
            {(stage === 'WEEK3' || FINAL_STAGES.includes(stage)) && <span className="text-xs text-ink-3">{plural(board.data.totals.paidVotes, 'vote', 'votes')}</span>}
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-ink-3 bg-surface border border-border rounded-card p-4">Les candidats seront présentés très bientôt.</p>
          ) : (
            <motion.ol variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-3">
              {list.map((c, i) => (
                <CandidateRow key={c._id} c={c} stage={stage} position={i + 1} votedFor={votedFor === c._id} mine={mineId === c._id} />
              ))}
            </motion.ol>
          )}
        </motion.section>

        <MyVotePurchases purchases={myVotes.data?.purchases ?? []} />
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold text-ink">SBC Impact Challenge</h1>
      </div>
      <div className="px-4 pb-10 max-w-2xl mx-auto">{body}</div>
    </div>
  );
}
