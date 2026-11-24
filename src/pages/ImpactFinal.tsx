import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, CheckmarkCircle02Icon, GiftIcon, Location01Icon, Mic01Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import JuryEntryCard from '../components/impact/JuryEntryCard';
import { MEDALS, PHASE_LABEL, STAGE_INFO, plural, rankLabel, roundLine, score } from '../components/impact/stages';
import { sbcApiService } from '../services/SBCApiService';
import {
  ImpactApiError, impactData, impactKeys, useImpactCurrentEdition, useImpactFinal, useImpactMyVotes,
} from '../hooks/useImpactCandidate';
import type { ImpactFinal as Final, ImpactMyVotes, ImpactResultRow, ImpactWeights } from '../types/impact';
import { listContainer, listItem, sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

type Finalist = Final['finalists'][number];

const card = 'bg-surface border border-border rounded-card p-4';
const VOTE_WHAT = 'Vote du public';

function OnStage({ f, phase }: { f: Finalist; phase: Final['phase'] }) {
  return (
    <motion.section variants={sectionRise} aria-label="En scène"
      className="bg-ink text-white rounded-card p-4 lg:p-6 flex flex-col sm:flex-row items-center gap-4 lg:gap-6 relative overflow-hidden" data-testid="impact-on-stage">
      <span aria-hidden className="absolute -right-12 -top-12 size-48 rounded-pill bg-white/5" />
      <img src={sbcApiService.generateThumbnailUrl(f.profile.photoFileId, 512)} alt=""
        className="size-28 lg:size-40 rounded-pill object-cover ring-4 ring-accent shrink-0" />
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 min-w-0 relative">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-danger rounded-pill px-2.5 py-1">
            <span aria-hidden className="size-2 rounded-pill bg-white animate-pulse" />
            En scène
          </span>
          {phase && (
            <span className="flex items-center gap-1 text-xs font-semibold bg-white/15 rounded-pill px-2.5 py-1" data-testid="impact-phase">
              <HugeiconsIcon icon={Mic01Icon} size={14} />
              {PHASE_LABEL[phase]}
            </span>
          )}
        </div>
        <h2 className="text-2xl lg:text-4xl font-bold leading-tight">{f.profile.name}</h2>
        <p className="text-base lg:text-xl text-white/85 font-semibold">{f.profile.projectName}</p>
        <p className="text-sm text-white/70">{[f.profile.city, f.profile.country].filter(Boolean).join(', ')}</p>
      </div>
    </motion.section>
  );
}

function Winner({ row, f }: { row: ImpactResultRow; f: Finalist | undefined }) {
  return (
    <motion.section variants={sectionRise} aria-label="Le gagnant"
      className="bg-accent text-white rounded-card p-5 lg:p-8 flex flex-col items-center text-center gap-3 relative overflow-hidden" data-testid="impact-winner">
      <span aria-hidden className="absolute -left-10 -bottom-12 size-48 rounded-pill bg-white/10" />
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide bg-white/20 rounded-pill px-3 py-1">
        <HugeiconsIcon icon={ChampionIcon} size={16} />
        Gagnant
      </span>
      {f && <img src={sbcApiService.generateThumbnailUrl(f.profile.photoFileId, 512)} alt="" className="size-28 lg:size-40 rounded-pill object-cover ring-4 ring-white/70" />}
      <h2 className="text-2xl lg:text-5xl font-bold leading-tight">{row.name}</h2>
      <p className="text-base lg:text-2xl font-semibold text-white/90">{row.projectName}</p>
      <p className="text-lg lg:text-3xl font-bold">{score(row.score)}/100</p>
    </motion.section>
  );
}

const PARTS: { key: keyof ImpactWeights; label: string; detail: (r: ImpactResultRow) => string }[] = [
  { key: 'paidVotes', label: 'Votes payants', detail: (r) => plural(r.paidVotes, 'vote', 'votes') },
  { key: 'publicVote', label: 'Vote du public', detail: (r) => plural(r.finalVotes, 'vote', 'votes') },
  { key: 'jury', label: 'Jury', detail: (r) => `${score(r.juryAverage)}/${r.juryMax} · ${plural(r.jurorsCount, 'juré', 'jurés')}` },
];

const componentOf = (r: ImpactResultRow, k: keyof ImpactWeights) =>
  k === 'paidVotes' ? r.components.paidVotes : k === 'publicVote' ? r.components.publicVote : r.components.jury;

/** One finalist's result: each part on 100 with its weight, then the final score and rank (spec §12). */
function ResultTable({ row, weights, winner }: { row: ImpactResultRow; weights: ImpactWeights; winner: boolean }) {
  return (
    <motion.li variants={listItem} className={cn(card, 'flex flex-col gap-3', winner && 'border-accent')} aria-label={`Résultat de ${row.name}`}>
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>{MEDALS[row.rank] ?? ''}</span>
        <div className="min-w-0">
          <p className="font-bold text-ink truncate">{row.name}</p>
          <p className="text-xs text-ink-3 truncate">{row.projectName}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-3">
            <th scope="col" className="text-left font-medium pb-1">Partie</th>
            <th scope="col" className="text-right font-medium pb-1">Poids</th>
            <th scope="col" className="text-right font-medium pb-1">Sur 100</th>
          </tr>
        </thead>
        <tbody>
          {PARTS.map((p) => (
            <tr key={p.key} className="border-t border-border">
              <th scope="row" className="text-left font-normal py-1.5">
                <span className="block text-ink">{p.label}</span>
                <span className="block text-xs text-ink-3">{p.detail(row)}</span>
              </th>
              <td className="text-right text-ink-2 py-1.5">{weights[p.key]} %</td>
              <td className="text-right font-semibold text-ink py-1.5 tabular-nums">{score(componentOf(row, p.key))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink/10">
            <th scope="row" colSpan={2} className="text-left font-bold text-ink pt-2">Score final · {rankLabel(row.rank)}</th>
            <td className="text-right font-bold text-ink text-base pt-2 tabular-nums" data-testid="impact-final-score">{score(row.score)}</td>
          </tr>
        </tfoot>
      </table>
    </motion.li>
  );
}

function FinalistCard({ f, onStage, mine, voted, showVote, voting, onVote, row }: {
  f: Finalist; onStage: boolean; mine: boolean; voted: boolean; showVote: boolean; voting: boolean; onVote: () => void;
  row: ImpactResultRow | null;
}) {
  return (
    <motion.li variants={listItem} aria-label={f.profile.name}
      className={cn(card, 'flex flex-col items-center text-center gap-2', onStage && 'border-danger ring-2 ring-danger/30', mine && 'border-primary')}>
      <div className="flex flex-wrap justify-center gap-1.5 min-h-6">
        {onStage && <span className="text-[11px] font-bold text-white bg-danger rounded-pill px-2 py-0.5">En scène</span>}
        {mine && <span className="text-[11px] font-bold text-white bg-primary rounded-pill px-2 py-0.5">Vous</span>}
        {row ? (
          <span className="text-[11px] font-bold text-ink bg-accent-soft rounded-pill px-2 py-0.5">{MEDALS[row.rank] ?? ''} {rankLabel(row.rank)}</span>
        ) : f.top3Rank ? (
          <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 rounded-pill px-2 py-0.5">TOP 3 : {rankLabel(f.top3Rank)}</span>
        ) : null}
      </div>
      <img src={sbcApiService.generateThumbnailUrl(f.profile.photoFileId, 384)} alt="" loading="lazy"
        className="size-24 lg:size-32 rounded-pill object-cover bg-surface-2" />
      <p className="text-lg font-bold text-ink leading-tight">{f.profile.name}</p>
      <p className="text-sm font-semibold text-primary">{f.profile.projectName}</p>
      <p className="text-xs text-ink-3 flex items-center gap-1">
        <HugeiconsIcon icon={Location01Icon} size={12} />
        {[f.profile.city, f.profile.country].filter(Boolean).join(', ')}
      </p>
      {voted && (
        <p className="text-xs font-semibold text-success flex items-center gap-1">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
          Votre vote
        </p>
      )}
      {showVote && (
        <motion.button type="button" whileTap={voting ? undefined : { scale: 0.98 }} onClick={onVote} disabled={voting}
          aria-label={`Voter pour ${f.profile.name}`}
          className="w-full mt-1 bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60">
          {voting ? 'Vote en cours…' : 'Voter pour ce finaliste'}
        </motion.button>
      )}
      <Link to={`/impact-challenge/candidats/${encodeURIComponent(f._id)}`} className="text-sm font-semibold text-primary py-1">
        Voir son projet
      </Link>
    </motion.li>
  );
}

/** The live final: who is on stage, the public vote, then the result (shown on phones and on the big screen). */
export default function ImpactFinal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const final = useImpactFinal();
  const current = useImpactCurrentEdition();
  const data = final.data;
  const voteOpen = data?.finalVote?.status === 'OPEN';
  const myVotes = useImpactMyVotes({ enabled: !!data });
  const [voting, setVoting] = useState<string | null>(null);
  const [voteError, setVoteError] = useState('');

  // The vote opens or closes during the live: read the member's eligibility again.
  const voteStatus = data?.finalVote?.status;
  const refetchVotes = myVotes.refetch;
  useEffect(() => {
    if (voteStatus) refetchVotes();
  }, [voteStatus, refetchVotes]);

  const myFinal = myVotes.data?.finalVote ?? null;
  const can = myVotes.data?.canFinalVote ?? null;
  const mineId = myVotes.data?.myCandidateId ?? null;
  const selfVote = !!current.data?.settings.freeVote?.selfVote;

  const vote = async (f: Finalist) => {
    setVoting(f._id);
    setVoteError('');
    try {
      const done = impactData<{ candidateId: string; at: string }>(await sbcApiService.impactFinalVote(f._id), 'Le vote n’a pas pu être enregistré. Réessayez.');
      queryClient.setQueryData<ImpactMyVotes>(impactKeys.myVotes, (cur) => ({
        freeVote: cur?.freeVote ?? null,
        purchases: cur?.purchases ?? [],
        myCandidateId: cur?.myCandidateId ?? null,
        canFreeVote: cur?.canFreeVote ?? null,
        finalVote: { candidateId: done?.candidateId ?? f._id, candidateName: f.profile.name, at: done?.at ?? new Date().toISOString() },
        canFinalVote: { ok: false, code: 'ALREADY_VOTED' },
      }));
    } catch (err) {
      const e = err as ImpactApiError;
      setVoteError(e.message || 'Le vote n’a pas pu être enregistré. Réessayez.');
      if (e.code && e.code !== 'MEMBER_CHECK_UNAVAILABLE' && e.code !== 'TOO_MANY_REQUESTS') {
        myVotes.refetch();
        final.refetch();
      }
    } finally {
      setVoting(null);
    }
  };

  let body;
  if (final.isLoading) {
    body = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de la finale">
        <Skeleton height="h-40" rounded="rounded-card" />
        <Skeleton height="h-64" rounded="rounded-card" />
      </div>
    );
  } else if (final.isError) {
    body = (
      <div className="bg-danger-soft text-danger rounded-card p-4 flex flex-col gap-3" role="alert">
        <p className="text-sm">{(final.error as Error)?.message || 'Impossible de charger la finale.'}</p>
        <button type="button" onClick={() => final.refetch()} className="self-start bg-surface text-ink font-semibold text-sm rounded-pill px-4 py-2 border border-border">
          Réessayer
        </button>
      </div>
    );
  } else if (!data) {
    body = (
      <motion.section variants={sectionRise} initial="hidden" animate="show" className={cn(card, 'p-6 flex flex-col items-center text-center gap-3 max-w-xl mx-auto')}>
        <span className="size-14 grid place-items-center rounded-pill bg-accent-soft text-accent">
          <HugeiconsIcon icon={ChampionIcon} size={28} />
        </span>
        <h2 className="text-lg font-bold text-ink">La finale n’a pas encore lieu</h2>
        <p className="text-sm text-ink-2">
          Les finalistes du SBC Impact Challenge seront présentés ici. Revenez le jour de la grande finale pour la suivre en direct et voter.
        </p>
        <Link to="/impact-challenge/candidats" className="text-sm font-semibold text-primary py-1">Voir les candidats</Link>
      </motion.section>
    );
  } else {
    const stage = data.stage;
    const info = stage ? STAGE_INFO[stage] : null;
    const onStage = data.onStageCandidateId ? data.finalists.find((f) => f._id === data.onStageCandidateId) : undefined;
    const result = data.result;
    const rowOf = (id: string) => result?.rows.find((r) => r.candidateId === id) ?? null;
    const winnerRow = result ? result.rows.find((r) => r.candidateId === result.winnerCandidateId) ?? result.rows[0] : null;
    const finalists = result
      ? [...data.finalists].sort((a, b) => (rowOf(a._id)?.rank ?? 99) - (rowOf(b._id)?.rank ?? 99))
      : data.finalists;
    const refusal = voteOpen && can && !can.ok && can.code !== 'ALREADY_VOTED' ? can.message || 'Vous ne pouvez pas voter pour le moment.' : '';

    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4 lg:gap-6">
        <motion.section variants={sectionRise} className="bg-primary text-white rounded-card p-4 lg:p-6 flex flex-col gap-2 relative overflow-hidden">
          <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-pill bg-white/10" />
          <span className="self-start text-[11px] font-semibold uppercase tracking-wide bg-white/15 rounded-pill px-2.5 py-1">{data.name}</span>
          <h2 className="text-xl lg:text-3xl font-bold leading-tight relative">{info?.title ?? 'La finale'}</h2>
          {info && <p className="text-sm lg:text-base text-white/85 relative">{info.text}</p>}
          {data.finalVote && !result && (
            <p className="text-sm font-semibold bg-white/10 rounded-tile px-3 py-2 relative" data-testid="impact-final-vote-line">
              {roundLine(data.finalVote, VOTE_WHAT)}
            </p>
          )}
        </motion.section>

        {winnerRow && <Winner row={winnerRow} f={data.finalists.find((f) => f._id === winnerRow.candidateId)} />}
        {!result && onStage && <OnStage f={onStage} phase={data.phase} />}

        {myFinal && (
          <motion.p variants={sectionRise} role="status" className="text-sm text-success bg-success-soft rounded-card px-4 py-3 flex items-center gap-2">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
            Vous avez voté pour {myFinal.candidateName ?? 'un finaliste'}.
          </motion.p>
        )}
        {refusal && (
          <motion.p variants={sectionRise} className="text-sm text-ink-2 bg-surface-2 rounded-card px-4 py-3" data-testid="impact-final-vote-refusal">{refusal}</motion.p>
        )}
        {voteError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-card px-4 py-3">{voteError}</p>}

        <motion.section variants={sectionRise} className="flex flex-col gap-3" aria-labelledby="impact-finalists">
          <h2 id="impact-finalists" className="text-lg lg:text-2xl font-bold text-ink">Les finalistes</h2>
          <motion.ul variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5">
            {finalists.map((f) => {
              const mine = mineId === f._id;
              return (
                <FinalistCard
                  key={f._id}
                  f={f}
                  onStage={!result && f._id === data.onStageCandidateId}
                  mine={mine}
                  voted={myFinal?.candidateId === f._id}
                  showVote={!!voteOpen && !!can?.ok && !myFinal && !(mine && !selfVote)}
                  voting={voting === f._id}
                  onVote={() => vote(f)}
                  row={rowOf(f._id)}
                />
              );
            })}
          </motion.ul>
          {voteOpen && !myFinal && can?.ok && (
            <p className="text-xs text-ink-3 text-center">1 compte SBC = 1 vote. Les résultats du vote restent cachés jusqu’à l’annonce du gagnant.</p>
          )}
          {voteOpen && mineId && !selfVote && data.finalists.some((f) => f._id === mineId) && (
            <p className="text-xs text-ink-3 text-center">Vous ne pouvez pas voter pour vous-même : partagez la finale avec votre communauté !</p>
          )}
        </motion.section>

        {result && (
          <motion.section variants={sectionRise} className="flex flex-col gap-3" aria-labelledby="impact-result">
            <h2 id="impact-result" className="text-lg lg:text-2xl font-bold text-ink">Le détail du résultat</h2>
            <motion.ol variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-5">
              {[...result.rows].sort((a, b) => a.rank - b.rank).map((r) => (
                <ResultTable key={r.candidateId} row={r} weights={result.weights ?? data.weights} winner={r.candidateId === result.winnerCandidateId} />
              ))}
            </motion.ol>
            <p className="text-xs text-ink-3" data-testid="impact-formula">{data.formula}</p>
          </motion.section>
        )}

        <motion.div variants={sectionRise}>
          <Link to="/impact-challenge/tombola" className={cn(card, 'flex items-center gap-3 py-3')}>
            <span className="size-9 grid place-items-center rounded-tile bg-accent-soft text-accent shrink-0"><HugeiconsIcon icon={GiftIcon} size={18} /></span>
            <span className="flex-1 text-sm font-semibold text-ink">Tombola : les lots et le tirage</span>
          </Link>
        </motion.div>

        <JuryEntryCard active />
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 max-w-6xl mx-auto">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl lg:text-2xl font-bold text-ink">La grande finale</h1>
      </div>
      <div className="px-4 pb-10 max-w-6xl mx-auto">{body}</div>
    </div>
  );
}
