import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Link01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import MyVotePurchases from '../components/impact/MyVotePurchases';
import ShareLink from '../components/impact/ShareLink';
import VotePurchaseSheet from '../components/impact/VotePurchaseSheet';
import { FREE_ROUND, MEDALS, PAID_ROUND, candidatePageUrl, plural, roundLine } from '../components/impact/stages';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import {
  ImpactApiError, impactData, impactKeys, openRound, useImpactCurrentEdition,
  useImpactMyVotes, useImpactPublicCandidate,
} from '../hooks/useImpactCandidate';
import {
  FINAL_STAGES, IMPACT_PROJECT_FIELDS, type ImpactMyVotes, type ImpactPublicCandidate, type ImpactSubmission,
} from '../types/impact';
import { sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

const card = 'bg-surface border border-border rounded-card p-4';

function StoredVideo({ fileId, poster, label }: { fileId: string; poster?: string; label: string }) {
  // Same as the event and challenge pages: the stored file from the media CDN, nothing loaded before play.
  return (
    <video
      src={sbcApiService.generateSettingsFileUrl(fileId)}
      poster={poster}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      className="w-full max-h-[70vh] rounded-tile bg-black"
    />
  );
}

function PublishedLink({ s }: { s: ImpactSubmission }) {
  if (!s.externalUrl) return null;
  return (
    <a href={s.externalUrl} target="_blank" rel="noopener noreferrer" className="self-start flex items-center gap-1.5 text-sm font-semibold text-primary py-1">
      <HugeiconsIcon icon={Link01Icon} size={16} />
      Voir la publication
    </a>
  );
}

function VotesStats({ c, showFree, showPaid }: { c: ImpactPublicCandidate; showFree: boolean; showPaid: boolean }) {
  if (!showFree && !showPaid) return null;
  return (
    <motion.div variants={sectionRise} className="grid grid-cols-2 gap-2">
      {showFree && (
        <div className={card}>
          <p className="text-xs text-ink-2">Vote gratuit</p>
          <p className="text-lg font-bold text-ink tabular-nums" data-testid="impact-free-votes">{plural(c.votes.free, 'vote', 'votes')}</p>
        </div>
      )}
      {showPaid && (
        <div className={card}>
          <p className="text-xs text-ink-2">Votes de la semaine 3</p>
          <p className="text-lg font-bold text-ink tabular-nums" data-testid="impact-paid-votes">{plural(c.votes.paid, 'vote', 'votes')}</p>
        </div>
      )}
    </motion.div>
  );
}

/** A published candidate: profile, video, project, and the votes of the current week. */
export default function ImpactCandidateProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const current = useImpactCurrentEdition({ followRounds: true });
  const edition = current.data;
  const round = openRound(edition);
  const cand = useImpactPublicCandidate(id, { poll: !!round });
  const myVotes = useImpactMyVotes();

  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const refreshCounts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: impactKeys.candidate(id) });
    queryClient.invalidateQueries({ queryKey: impactKeys.board });
    queryClient.invalidateQueries({ queryKey: impactKeys.myVotes });
  }, [queryClient, id]);

  const c = cand.data;
  const stage = edition?.stage ?? null;
  const freeOpen = edition?.rounds?.FREE?.status === 'OPEN';
  const paidOpen = edition?.rounds?.PAID?.status === 'OPEN';
  const freeVotable = !!c && freeOpen && c.status === 'STAGE_2' && !!c.video;
  const paidVotable = !!c && paidOpen && c.status === 'STAGE_3' && !!c.project;
  const myFree = myVotes.data?.freeVote ?? null;
  const canFree = myVotes.data?.canFreeVote ?? null;
  // Their own page: self-votes follow the edition's settings (free: off by default, paid: on).
  const isMine = !!c && myVotes.data?.myCandidateId === c._id;
  const ownFreeHidden = isMine && !edition?.settings.freeVote?.selfVote;
  const ownPaidHidden = isMine && !edition?.settings.paidSelfVote;

  const freeVote = async () => {
    if (!c) return;
    setVoting(true);
    setVoteError('');
    try {
      const done = impactData<{ candidateId: string; at: string }>(await sbcApiService.impactFreeVote(c._id), 'Le vote n’a pas pu être enregistré. Réessayez.');
      queryClient.setQueryData<ImpactMyVotes>(impactKeys.myVotes, (cur) => ({
        purchases: cur?.purchases ?? [],
        myCandidateId: cur?.myCandidateId ?? null,
        canFreeVote: { ok: false, code: 'ALREADY_VOTED' },
        freeVote: { candidateId: done?.candidateId ?? c._id, candidateName: c.profile.name, at: done?.at ?? new Date().toISOString() },
      }));
      queryClient.invalidateQueries({ queryKey: impactKeys.candidate(id) });
      queryClient.invalidateQueries({ queryKey: impactKeys.board });
    } catch (err) {
      const e = err as ImpactApiError;
      setVoteError(e.message || 'Le vote n’a pas pu être enregistré. Réessayez.');
      if (e.code && e.code !== 'MEMBER_CHECK_UNAVAILABLE' && e.code !== 'TOO_MANY_REQUESTS') {
        myVotes.refetch();
        current.refetch();
      }
    } finally {
      setVoting(false);
    }
  };

  let body;
  if (cand.isLoading) {
    body = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement du candidat">
        <Skeleton height="h-48" rounded="rounded-card" />
        <Skeleton height="h-24" rounded="rounded-card" />
        <Skeleton height="h-72" rounded="rounded-card" />
      </div>
    );
  } else if (cand.isError || !c) {
    const notFound = (cand.error as ImpactApiError)?.status === 404;
    body = (
      <div className={cn(card, 'flex flex-col gap-3')} role="alert">
        <p className="text-sm text-ink-2">
          {notFound ? 'Ce candidat n’est pas présenté dans la compétition en cours.' : (cand.error as Error)?.message || 'Impossible de charger ce candidat.'}
        </p>
        <div className="flex gap-2">
          {!notFound && (
            <button type="button" onClick={() => cand.refetch()} className="bg-surface-2 text-ink font-semibold text-sm rounded-pill px-4 py-2">Réessayer</button>
          )}
          <Link to="/impact-challenge/candidats" className="text-sm font-semibold text-primary px-2 py-2">Voir tous les candidats</Link>
        </div>
      </div>
    );
  } else {
    const p = c.profile;
    const poster = sbcApiService.generateThumbnailUrl(p.photoFileId, 768);
    const showFree = stage === 'WEEK2' || stage === 'WEEK3' || (!!stage && FINAL_STAGES.includes(stage));
    const showPaid = stage === 'WEEK3' || (!!stage && FINAL_STAGES.includes(stage));
    const ownNote = (stage === 'WEEK2' && ownFreeHidden) || (stage === 'WEEK3' && ownPaidHidden);
    const share = (
      <ShareLink url={candidatePageUrl(c._id)} text={`Votez pour ${p.name} (${p.projectName}) au SBC Impact Challenge`} />
    );
    const ownPage = (
      <div className="flex flex-col gap-2" data-testid="impact-own-page">
        <p className="text-sm text-ink-2">
          C’est votre page de candidat : vous ne pouvez pas voter pour vous-même. Partagez-la pour que votre communauté vote pour vous.
        </p>
        {share}
      </div>
    );

    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        <motion.section variants={sectionRise} className={cn(card, 'flex flex-col items-center text-center gap-2')}>
          <img src={sbcApiService.generateThumbnailUrl(p.photoFileId, 384)} alt={`Photo de ${p.name}`}
            className="size-28 rounded-pill object-cover bg-surface-2" />
          <h2 className="text-xl font-bold text-ink leading-tight">{p.name}</h2>
          <p className="text-base font-semibold text-primary">{p.projectName}</p>
          <p className="text-xs text-ink-3 flex items-center gap-1">
            <HugeiconsIcon icon={Location01Icon} size={12} />
            {[p.city, p.country].filter(Boolean).join(', ')}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {p.category && <span className="text-[11px] font-semibold text-primary bg-primary-soft rounded-pill px-2 py-0.5">{p.category}</span>}
            {p.activity && <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 rounded-pill px-2 py-0.5">{p.activity}</span>}
            {c.seatNumber && <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 rounded-pill px-2 py-0.5">Candidat n° {c.seatNumber}</span>}
          </div>
          {c.rank && (
            <p className="text-sm font-bold text-ink" data-testid="impact-rank">
              {MEDALS[c.rank] ? `${MEDALS[c.rank]} ` : ''}{c.rank === 1 ? '1er' : `${c.rank}e`} · {c.statusLabel}
            </p>
          )}
        </motion.section>

        <VotesStats c={c} showFree={showFree} showPaid={showPaid} />

        {(stage === 'LIVE' || stage === 'RESULT') && (c.status === 'FINALIST' || c.status === 'WINNER') && (
          <motion.div variants={sectionRise}>
            <Link to="/impact-challenge/finale" className="block text-center bg-accent text-white font-semibold py-3 rounded-pill">
              {stage === 'LIVE' ? 'Suivre la finale en direct' : 'Voir le résultat de la finale'}
            </Link>
          </motion.div>
        )}

        {/* ---------- Votes of the current week ---------- */}
        {stage === 'WEEK2' && (
          <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-label="Vote gratuit">
            {myFree ? (
              <p role="status" className="text-sm text-success font-semibold flex items-center gap-2">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
                Vous avez voté pour {myFree.candidateId === c._id ? p.name : myFree.candidateName ?? 'un autre candidat'}.
              </p>
            ) : ownFreeHidden ? ownPage : !freeOpen ? (
              <p className="text-sm text-ink-2">{roundLine(edition?.rounds?.FREE, FREE_ROUND)}</p>
            ) : !freeVotable ? (
              <p className="text-sm text-ink-2">Ce candidat ne peut pas recevoir de vote pour le moment.</p>
            ) : myVotes.isLoading ? (
              <Skeleton height="h-12" rounded="rounded-pill" />
            ) : canFree && !canFree.ok ? (
              <p className="text-sm text-ink-2 bg-surface-2 rounded-tile px-3 py-2" data-testid="impact-free-vote-refusal">
                {canFree.message || 'Vous ne pouvez pas voter pour le moment.'}
              </p>
            ) : (
              <motion.button type="button" whileTap={voting ? undefined : { scale: 0.98 }} onClick={freeVote} disabled={voting}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60">
                {voting ? 'Vote en cours…' : 'Voter pour ce candidat (gratuit)'}
              </motion.button>
            )}
            {!myFree && !ownFreeHidden && freeVotable && canFree?.ok && (
              <p className="text-xs text-ink-3">1 compte SBC = 1 vote gratuit pour toute la semaine. Choisissez bien !</p>
            )}
            {voteError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{voteError}</p>}
          </motion.section>
        )}

        {stage === 'WEEK3' && (
          <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-label="Votes payants">
            {ownPaidHidden ? ownPage : paidVotable ? (
              <>
                <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => setSheetOpen(true)}
                  className="w-full bg-accent text-white font-semibold py-3 rounded-pill">
                  Acheter des votes
                </motion.button>
                <p className="text-xs text-ink-3">{roundLine(edition?.rounds?.PAID, PAID_ROUND)}</p>
              </>
            ) : (
              <p className="text-sm text-ink-2">{paidOpen ? 'Ce candidat ne peut pas recevoir de votes pour le moment.' : roundLine(edition?.rounds?.PAID, PAID_ROUND)}</p>
            )}
          </motion.section>
        )}

        {/* ---------- Contents ---------- */}
        {c.video?.video && (
          <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-labelledby="impact-video">
            <h3 id="impact-video" className="text-lg font-bold text-ink">Ma vision de SBC</h3>
            <StoredVideo fileId={c.video.video.videoFileId} poster={poster} label={`Vidéo « Ma vision de SBC » de ${p.name}`} />
            {c.video.video.caption && <p className="text-sm text-ink-2 whitespace-pre-line">{c.video.video.caption}</p>}
            <PublishedLink s={c.video} />
          </motion.section>
        )}

        <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="impact-project">
          <h3 id="impact-project" className="text-lg font-bold text-ink">Le projet</h3>
          {p.projectDescription && <p className="text-sm text-ink-2 whitespace-pre-line">{p.projectDescription}</p>}
          {c.project?.project ? (
            <>
              {c.project.project.videoFileId && (
                <StoredVideo fileId={c.project.project.videoFileId} poster={poster} label={`Vidéo du projet ${p.projectName}`} />
              )}
              <dl className="flex flex-col gap-3">
                {IMPACT_PROJECT_FIELDS.map((f) => (
                  <div key={f.key}>
                    <dt className="text-sm font-semibold text-ink">{f.label}</dt>
                    <dd className="text-sm text-ink-2 whitespace-pre-line mt-0.5">{c.project!.project![f.key]}</dd>
                  </div>
                ))}
              </dl>
              <PublishedLink s={c.project} />
            </>
          ) : (
            p.presentation && <p className="text-sm text-ink-2 whitespace-pre-line">{p.presentation}</p>
          )}
          {p.link && (
            <a href={p.link} target="_blank" rel="noopener noreferrer nofollow" className="self-start flex items-center gap-1.5 text-sm font-semibold text-primary py-1">
              <HugeiconsIcon icon={Link01Icon} size={16} />
              Voir son activité
            </a>
          )}
        </motion.section>

        {!ownNote && (
          <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-label="Partager">
            <p className="text-sm text-ink-2">
              {isMine ? 'Partagez votre page pour récolter des votes.' : `Partagez la page de ${p.name} pour l’aider à récolter des votes.`}
            </p>
            {share}
          </motion.section>
        )}

        <MyVotePurchases purchases={myVotes.data?.purchases ?? []} />
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold text-ink truncate">{c?.profile.name ?? 'Candidat'}</h1>
      </div>
      <div className="px-4 pb-10 max-w-2xl mx-auto">{body}</div>

      {c && (
        <VotePurchaseSheet
          open={sheetOpen}
          candidateId={c._id}
          candidateName={c.profile.name}
          packs={edition?.settings.votePacks ?? []}
          balancePayment={!!edition?.settings.balancePayment}
          balance={typeof user?.balance === 'number' ? user.balance : undefined}
          onClose={() => setSheetOpen(false)}
          onSettled={refreshCounts}
        />
      )}
    </div>
  );
}
