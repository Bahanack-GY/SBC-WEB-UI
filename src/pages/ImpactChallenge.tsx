import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChampionIcon, Clock01Icon, Location01Icon, Ticket01Icon, Rocket01Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import VoteSheet, { type VoteMode } from '../components/impact/VoteSheet';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { redirectTo } from '../utils/redirect';
import { sequence, sectionRise, listContainer, listItem } from '../utils/motion';
import { cn } from '../lib/utils';
import {
  useCurrentImpactChallenge, useImpactChallengeLeaderboard, useTicketAllowance,
  votingPhase, challengeVideoSrc, challengeErrorMessage, francs, formatCountdown,
  VOTE_PRICE, DEFAULT_MAX_TICKETS,
  type ChallengeEntrepreneur, type ImpactChallenge as Challenge, type VotingPhase,
} from '../hooks/useImpactChallenge';

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

/** Ticks on its own so the rest of the page (and its videos) does not re-render every second. */
function Countdown({ target, onReached }: { target: string; onReached: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  const end = new Date(target).getTime();
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= end) { clearInterval(t); onReached(); }
    }, 1000);
    return () => clearInterval(t);
  }, [end, onReached]);
  return <span className="tabular-nums">{formatCountdown(end - now)}</span>;
}

const PHASE_NOTE: Record<Exclude<VotingPhase, 'open'>, string> = {
  not_started: "Les votes n'ont pas encore commencé.",
  ended: 'Les votes sont terminés. Merci pour votre participation !',
  closed: 'Les votes sont fermés pour ce challenge.',
};

function Hero({ challenge, phase, totalVotes, onReached }: {
  challenge: Challenge; phase: VotingPhase; totalVotes: number; onReached: () => void;
}) {
  return (
    <motion.section variants={sectionRise} className="bg-primary text-white rounded-card p-4 flex flex-col gap-3 relative overflow-hidden">
      <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-pill bg-white/10" />
      <span className="self-start text-[11px] font-semibold uppercase tracking-wide bg-white/15 rounded-pill px-2.5 py-1">
        Challenge du mois
      </span>
      <div className="relative">
        <h2 className="text-xl font-bold leading-tight">{challenge.campaignName}</h2>
        {challenge.description?.fr && (
          <p className="text-sm text-white/85 mt-1 whitespace-pre-line">{challenge.description.fr}</p>
        )}
      </div>

      <div className="bg-white/10 rounded-tile px-3 py-2.5 flex items-center gap-2.5">
        <HugeiconsIcon icon={Clock01Icon} size={20} className="shrink-0" />
        <div className="min-w-0">
          {phase === 'open' && (
            <>
              <span className="block text-xs text-white/75">Fin des votes dans</span>
              <span className="block font-bold text-lg leading-tight"><Countdown target={challenge.endDate} onReached={onReached} /></span>
            </>
          )}
          {phase === 'not_started' && (
            <>
              <span className="block text-xs text-white/75">Les votes ouvrent le {longDate(challenge.startDate)}</span>
              <span className="block font-bold text-lg leading-tight"><Countdown target={challenge.startDate} onReached={onReached} /></span>
            </>
          )}
          {(phase === 'ended' || phase === 'closed') && (
            <span className="block font-semibold">{PHASE_NOTE[phase]}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/10 rounded-tile px-3 py-2">
          <span className="block text-xs text-white/75">Votes</span>
          <span className="block font-bold">{totalVotes.toLocaleString('fr-FR')}</span>
        </div>
        <div className="bg-white/10 rounded-tile px-3 py-2">
          <span className="block text-xs text-white/75">Cagnotte</span>
          <span className="block font-bold">{francs(challenge.totalCollected ?? 0)}</span>
        </div>
      </div>
    </motion.section>
  );
}

function HowItWorks() {
  const steps = [
    'Chaque mois, 3 entrepreneurs présentent leur projet dans une courte vidéo.',
    `Vous votez pour le projet que vous préférez : ${francs(VOTE_PRICE)} par vote. Vous pouvez voter plusieurs fois.`,
    `Chaque vote vous donne aussi 1 ticket pour la tombola du mois (${DEFAULT_MAX_TICKETS} tickets maximum par mois).`,
    "À la fin du mois, l'entrepreneur qui a le plus de votes gagne.",
  ];
  const split = [
    { pct: 50, label: "pour l'entrepreneur gagnant", tint: 'bg-primary' },
    { pct: 30, label: 'pour les lots de la tombola', tint: 'bg-accent' },
    { pct: 20, label: 'pour la SBC', tint: 'bg-ink-3' },
  ];
  return (
    <motion.section variants={sectionRise} className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink">Comment ça marche ?</h2>
      <ol className="flex flex-col gap-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-ink-2">
            <span className="size-6 shrink-0 grid place-items-center rounded-pill bg-primary-soft text-primary text-xs font-bold">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div>
        <p className="text-sm font-semibold text-ink mb-2">L'argent collecté est partagé ainsi :</p>
        <div className="flex h-3 rounded-pill overflow-hidden" aria-hidden>
          {split.map((p) => <span key={p.pct} className={p.tint} style={{ width: `${p.pct}%` }} />)}
        </div>
        <ul className="mt-2 flex flex-col gap-1">
          {split.map((p) => (
            <li key={p.pct} className="flex items-center gap-2 text-sm text-ink-2">
              <span className={cn('size-2.5 rounded-pill shrink-0', p.tint)} aria-hidden />
              <span><span className="font-bold text-ink">{p.pct} %</span> {p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}

function AllowanceCard({ used, max, remaining, loading, failed }: {
  used: number; max: number; remaining: number; loading: boolean; failed: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <motion.section variants={sectionRise} className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="size-10 grid place-items-center rounded-tile bg-accent-soft text-accent shrink-0">
          <HugeiconsIcon icon={Ticket01Icon} size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">Mes tickets de tombola</h2>
          {loading ? (
            <Skeleton width="w-32" height="h-4" className="mt-1" />
          ) : failed ? (
            <p className="text-sm text-ink-3">Impossible de charger vos tickets pour le moment.</p>
          ) : (
            <p className="text-sm text-ink-2">
              <span className="font-bold text-ink">{used} ticket{used > 1 ? 's' : ''}</span> sur {max} ce mois-ci
            </p>
          )}
        </div>
      </div>
      {!loading && !failed && (
        <>
          <div className="h-2 bg-surface-2 rounded-pill overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-pill"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          <p className="text-xs text-ink-3">
            {remaining > 0
              ? `Encore ${remaining} vote${remaining > 1 ? 's' : ''} avec ticket ce mois-ci.`
              : `Vous avez vos ${max} tickets du mois. Vous pouvez encore soutenir un entrepreneur : votre soutien compte pour lui, mais ne donne plus de ticket.`}
          </p>
        </>
      )}
    </motion.section>
  );
}

function Ranking({ rows, totalVotes }: {
  rows: { _id: string; projectName: string; name: string; voteCount: number }[];
  totalVotes: number;
}) {
  if (rows.length === 0) return null;
  return (
    <motion.section variants={sectionRise} className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3" aria-labelledby="impact-ranking">
      <div className="flex items-center justify-between">
        <h2 id="impact-ranking" className="text-lg font-bold text-ink flex items-center gap-2">
          Classement en direct
          <HugeiconsIcon icon={ChampionIcon} size={18} className="text-accent" />
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-ink-3">
          <span className="size-2 rounded-pill bg-success-dot animate-pulse" aria-hidden />
          en direct
        </span>
      </div>
      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => {
          const pct = totalVotes > 0 ? Math.round((r.voteCount / totalVotes) * 100) : 0;
          return (
            <motion.li layout key={r._id} className="flex items-center gap-3">
              <span className={cn(
                'size-8 shrink-0 grid place-items-center rounded-pill text-sm font-bold',
                i === 0 ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2',
              )}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm text-ink truncate">{r.projectName}</span>
                  <span className="text-xs text-ink-2 shrink-0">
                    {r.voteCount.toLocaleString('fr-FR')} vote{r.voteCount > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-surface-2 rounded-pill overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-pill', i === 0 ? 'bg-accent' : 'bg-primary')}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.section>
  );
}

function EntrepreneurCard({ e, votes, totalVotes, rank, action, disabled, onAction }: {
  e: ChallengeEntrepreneur; votes: number; totalVotes: number; rank: number;
  action: VoteMode; disabled: boolean; onAction: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  const description = e.projectDescription?.fr || '';
  const long = description.length > 180;
  const poster = e.videoThumbnailUrl ? sbcApiService.generateThumbnailUrl(e.videoThumbnailUrl, 640) : undefined;
  const label = action === 'vote' ? 'Voter' : 'Soutenir';

  return (
    <motion.article variants={listItem} aria-label={e.projectName} className="bg-surface border border-border rounded-card overflow-hidden">
      {e.videoUrl ? (
        <video
          src={challengeVideoSrc(e.videoUrl)}
          poster={poster}
          controls
          playsInline
          // Nothing is downloaded before the member presses play: three pitch
          // videos on one screen would otherwise be pulled on every visit.
          preload="none"
          aria-label={`Vidéo de présentation : ${e.projectName}`}
          className="w-full aspect-[4/5] max-h-[60vh] object-contain bg-black"
        />
      ) : (
        <div className="w-full aspect-video grid place-items-center bg-surface-2 text-ink-3 text-sm">Vidéo bientôt disponible</div>
      )}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-ink leading-tight">{e.projectName}</h3>
          {totalVotes > 0 && (
            <span className={cn(
              'shrink-0 text-xs font-bold rounded-pill px-2 py-0.5',
              rank === 1 ? 'bg-accent text-white' : 'bg-surface-2 text-ink-2',
            )}>
              {rank === 1 ? '1er' : `${rank}e`}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-3 flex items-center gap-1">
          <span className="font-semibold text-ink-2">{e.name}</span>
          {(e.city || e.country) && (
            <>
              <span aria-hidden>·</span>
              <HugeiconsIcon icon={Location01Icon} size={12} />
              {[e.city, e.country].filter(Boolean).join(', ')}
            </>
          )}
        </p>
        {e.businessCategory && (
          <span className="self-start text-[11px] font-semibold text-primary bg-primary-soft rounded-pill px-2 py-0.5">
            {e.businessCategory}
          </span>
        )}
        {description && (
          <div>
            <p className={cn('text-sm text-ink-2 whitespace-pre-line', !expanded && long && 'line-clamp-4')}>{description}</p>
            {long && (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs font-semibold text-primary mt-1">
                {expanded ? 'Voir moins' : 'Lire la suite'}
              </button>
            )}
          </div>
        )}

        <div className="mt-1">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-bold text-ink text-sm">{votes.toLocaleString('fr-FR')} vote{votes > 1 ? 's' : ''}</span>
            <span className="text-ink-3">{pct} %</span>
          </div>
          <div className="mt-1 h-2 bg-surface-2 rounded-pill overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-pill"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={disabled ? undefined : { scale: 0.97 }}
          onClick={onAction}
          disabled={disabled}
          aria-label={action === 'vote' ? `Voter pour ${e.projectName}` : `Soutenir ${e.projectName}`}
          className={cn(
            'mt-2 w-full font-semibold py-3 rounded-pill transition-colors disabled:cursor-not-allowed',
            action === 'vote'
              ? 'bg-primary hover:bg-primary-hover text-white disabled:bg-surface-2 disabled:text-ink-3'
              : 'bg-accent text-white disabled:bg-surface-2 disabled:text-ink-3',
          )}
        >
          {label}
          {action === 'vote' && !disabled && <span className="font-normal opacity-80"> · {francs(VOTE_PRICE)}</span>}
        </motion.button>
      </div>
    </motion.article>
  );
}

function EmptyState() {
  return (
    <motion.section variants={sectionRise} className="bg-surface border border-border rounded-card p-6 flex flex-col items-center text-center gap-3">
      <span className="size-14 grid place-items-center rounded-pill bg-primary-soft text-primary">
        <HugeiconsIcon icon={Rocket01Icon} size={28} />
      </span>
      <h2 className="text-lg font-bold text-ink">Aucun challenge en cours</h2>
      <p className="text-sm text-ink-2">
        Le prochain SBC Impact Challenge arrive bientôt. Revenez ici pour découvrir les entrepreneurs du mois et voter pour votre préféré.
      </p>
    </motion.section>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement du challenge">
      <Skeleton height="h-48" rounded="rounded-card" />
      <Skeleton height="h-20" rounded="rounded-card" />
      <Skeleton height="h-80" rounded="rounded-card" />
    </div>
  );
}

export default function ImpactChallenge() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const current = useCurrentImpactChallenge();
  const challenge = current.data?.challenge;
  const entrepreneurs = useMemo(() => current.data?.entrepreneurs ?? [], [current.data]);
  const leaderboard = useImpactChallengeLeaderboard(challenge?._id);
  const allowance = useTicketAllowance(challenge?._id);

  // Re-evaluated now and then, and at once when a countdown reaches zero, so the
  // vote buttons close the moment voting ends.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(t);
  }, []);
  const onReached = useCallback(() => setNow(Date.now()), []);

  const [sheet, setSheet] = useState<{ entrepreneur: ChallengeEntrepreneur; mode: VoteMode } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState('');

  // Live counts from the leaderboard (polled), falling back to the counts that
  // came with the challenge.
  const liveVotes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of leaderboard.data ?? []) m.set(r._id, r.voteCount);
    return m;
  }, [leaderboard.data]);
  const votesOf = (e: { _id: string; voteCount: number }) => liveVotes.get(e._id) ?? e.voteCount ?? 0;

  const ranking = useMemo(() => {
    const rows = leaderboard.data?.length
      ? leaderboard.data.map((r) => ({ _id: r._id, projectName: r.projectName, name: r.name, voteCount: r.voteCount }))
      : entrepreneurs.map((e) => ({ _id: e._id, projectName: e.projectName, name: e.name, voteCount: e.voteCount ?? 0 }));
    return [...rows].sort((a, b) => b.voteCount - a.voteCount);
  }, [leaderboard.data, entrepreneurs]);
  const totalVotes = ranking.reduce((sum, r) => sum + r.voteCount, 0);
  const rankOf = (id: string) => ranking.findIndex((r) => r._id === id) + 1;

  const phase: VotingPhase | null = challenge ? votingPhase(challenge, now) : null;
  const maxTickets = allowance.data?.max ?? DEFAULT_MAX_TICKETS;
  // Unknown allowance: let the member try; the server refuses beyond the limit.
  const remaining = allowance.data ? allowance.data.remaining : maxTickets;
  const action: VoteMode = allowance.data && allowance.data.remaining <= 0 ? 'support' : 'vote';

  const openSheet = (entrepreneur: ChallengeEntrepreneur) => {
    setSheetError('');
    setSheet({ entrepreneur, mode: action });
  };

  const confirm = async (votes: number) => {
    if (!challenge || !sheet) return;
    const amount = votes * VOTE_PRICE;
    setBusy(true);
    setSheetError('');
    try {
      const res = sheet.mode === 'vote'
        ? await sbcApiService.voteImpactChallenge(challenge._id, sheet.entrepreneur._id, amount)
        : await sbcApiService.supportImpactChallenge(challenge._id, {
          entrepreneurId: sheet.entrepreneur._id,
          amount,
          // /support is a public route: the server does not read the session,
          // so the name is the only trace of who gave.
          supporterName: user?.name,
        });
      if (!res.isSuccessByStatusCode) {
        const raw = res.body?.message || res.message;
        setSheetError(challengeErrorMessage(raw));
        // The ticket count moved since the page loaded (another tab, a payment
        // that just confirmed): show the real one.
        if (/ticket/i.test(raw || '')) allowance.refetch();
        return;
      }
      const data = res.body?.data;
      const url = data?.paymentSessionId
        ? sbcApiService.generatePaymentUrl(data.paymentSessionId)
        : data?.checkoutUrl;
      if (!url) {
        setSheetError("Le paiement n'a pas pu être ouvert. Réessayez.");
        return;
      }
      redirectTo(url);
    } catch {
      setSheetError('Erreur réseau. Vérifiez votre connexion et réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold text-ink">SBC Impact Challenge</h1>
      </div>

      <div className="px-4 pb-10 max-w-2xl mx-auto">
        {current.isLoading ? (
          <LoadingState />
        ) : current.isError ? (
          <div className="bg-danger-soft text-danger rounded-card p-4 flex flex-col gap-3" role="alert">
            <p className="text-sm">{(current.error as Error)?.message || 'Impossible de charger le challenge.'}</p>
            <button type="button" onClick={() => current.refetch()} className="self-start bg-surface text-ink font-semibold text-sm rounded-pill px-4 py-2 border border-border">
              Réessayer
            </button>
          </div>
        ) : !challenge ? (
          <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
            <EmptyState />
            <HowItWorks />
          </motion.div>
        ) : (
          <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
            <Hero challenge={challenge} phase={phase!} totalVotes={totalVotes} onReached={onReached} />

            {phase !== 'open' && (
              <motion.p variants={sectionRise} className="text-sm text-ink-2 bg-surface-2 rounded-card px-3 py-2.5" role="status">
                {phase === 'not_started' ? `${PHASE_NOTE.not_started} Ouverture le ${longDate(challenge.startDate)}.` : PHASE_NOTE[phase!]}
              </motion.p>
            )}

            <AllowanceCard
              used={allowance.data?.used ?? 0}
              max={maxTickets}
              remaining={remaining}
              loading={allowance.isLoading}
              failed={allowance.isError}
            />

            <Ranking rows={ranking} totalVotes={totalVotes} />

            <motion.section variants={sectionRise} className="flex flex-col gap-3">
              <h2 className="text-lg font-bold text-ink">Les entrepreneurs du mois</h2>
              {entrepreneurs.length === 0 ? (
                <p className="text-sm text-ink-3 bg-surface border border-border rounded-card p-4">
                  Les entrepreneurs de ce challenge seront présentés très bientôt.
                </p>
              ) : (
                <motion.div variants={listContainer} initial="hidden" animate="show" className="flex flex-col gap-4">
                  {entrepreneurs.map((e) => (
                    <EntrepreneurCard
                      key={e._id}
                      e={e}
                      votes={votesOf(e)}
                      totalVotes={totalVotes}
                      rank={rankOf(e._id)}
                      action={action}
                      disabled={phase !== 'open'}
                      onAction={() => openSheet(e)}
                    />
                  ))}
                </motion.div>
              )}
            </motion.section>

            <HowItWorks />
          </motion.div>
        )}
      </div>

      <VoteSheet
        open={!!sheet}
        mode={sheet?.mode ?? 'vote'}
        projectName={sheet?.entrepreneur.projectName ?? ''}
        entrepreneurName={sheet?.entrepreneur.name ?? ''}
        maxVotes={sheet?.mode === 'support' ? 500 : Math.max(1, remaining)}
        maxTickets={maxTickets}
        busy={busy}
        error={sheetError}
        onConfirm={confirm}
        onClose={() => setSheet(null)}
      />
    </div>
  );
}
