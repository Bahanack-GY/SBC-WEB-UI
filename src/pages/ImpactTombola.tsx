import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, GiftIcon, SecurityCheckIcon, Ticket01Icon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { dateTime, plural } from '../components/impact/stages';
import { useImpactCurrentEdition } from '../hooks/useImpactCandidate';
import {
  isRevealing, rangesLabel, useImpactTombola, useMyTombola, useTombolaHistory, weightOf,
} from '../hooks/useImpactTombola';
import { TOMBOLA_REVEAL_MS, TOMBOLA_REVEAL_REDUCED_MS } from '../hooks/tombolaTiming';
import type {
  ImpactTicketTier, ImpactTombola, ImpactTombolaPrize, ImpactTombolaWinner, ImpactTombolaWinnerStatus,
} from '../types/impact';
import { listContainer, listItem, sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

const card = 'bg-surface border border-border rounded-card p-4';
const pct = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const fraction = (w: number) => (w === 1 ? '1' : w === 0.5 ? '½' : w === 0.25 ? '¼' : w.toLocaleString('fr-FR'));

const WINNER_STATUS: Record<ImpactTombolaWinnerStatus, string> = {
  PENDING: 'À remettre',
  DELIVERED: 'Remis',
  FORFEITED: 'Non réclamé',
  NOT_AWARDED: 'Lot non attribué',
};

/** Rolls ticket numbers, then lands on the winner. Runs only for a winner revealed while the page is open. */
function RevealCard({ prize, w, drawing, total }: { prize: ImpactTombolaPrize; w: ImpactTombolaWinner; drawing: boolean; total: number }) {
  const reduced = useReducedMotion();
  const [rolling, setRolling] = useState(1);
  useEffect(() => {
    if (!drawing || reduced) return;
    const t = setInterval(() => setRolling(1 + Math.floor(Math.random() * Math.max(1, total))), 70);
    return () => clearInterval(t);
  }, [drawing, reduced, total]);

  if (drawing) {
    return (
      <motion.li variants={listItem} className="bg-ink text-white rounded-card p-4 lg:p-6 flex flex-col items-center text-center gap-2 min-h-44 justify-center"
        aria-label={`Lot ${w.order} : ${prize.label}`} data-testid={`tombola-drawing-${w.order}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Lot n° {w.order}</p>
        <p className="text-lg lg:text-2xl font-bold">{prize.label}</p>
        <p className="text-sm text-white/70">Tirage en cours…</p>
        <p className="text-4xl lg:text-6xl font-bold tabular-nums text-accent" aria-hidden>{reduced ? '…' : `n° ${rolling}`}</p>
      </motion.li>
    );
  }
  const none = w.status === 'NOT_AWARDED' || w.ticketNumber === null;
  return (
    <motion.li variants={listItem} aria-label={`Lot ${w.order} : ${prize.label}`} data-testid={`tombola-winner-${w.order}`}
      className={cn('rounded-card p-4 lg:p-6 flex flex-col items-center text-center gap-2 min-h-44 justify-center border',
        none ? 'bg-surface-2 border-border' : 'bg-accent text-white border-accent')}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', none ? 'text-ink-3' : 'text-white/80')}>Lot n° {w.order}</p>
      <p className={cn('text-lg lg:text-2xl font-bold', none ? 'text-ink' : '')}>{prize.label}</p>
      {none ? (
        <p className="text-sm font-semibold text-ink-2">Lot non attribué</p>
      ) : (
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex flex-col items-center gap-1">
          <span className="text-3xl lg:text-5xl font-bold tabular-nums">n° {w.ticketNumber}</span>
          <span className="text-base lg:text-2xl font-semibold">{w.displayName ?? 'Gagnant'}</span>
        </motion.div>
      )}
    </motion.li>
  );
}

function Upcoming({ prize, order }: { prize: ImpactTombolaPrize; order: number }) {
  return (
    <motion.li variants={listItem} aria-label={`Lot ${order} : ${prize.label}`} data-testid={`tombola-upcoming-${order}`}
      className="bg-surface border border-dashed border-border rounded-card p-4 lg:p-6 flex flex-col items-center text-center gap-2 min-h-44 justify-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Lot n° {order}</p>
      <p className="text-lg lg:text-2xl font-bold text-ink">{prize.label}</p>
      <p className="text-sm text-ink-3">À venir</p>
    </motion.li>
  );
}

function Rules({ tiers, cooldownDays }: { tiers: ImpactTicketTier[]; cooldownDays: number }) {
  let from = 1;
  const parts = tiers.map((t) => {
    const label = t.upTo === null ? `à partir du ${from}e : ${fraction(t.weight)}` : `du ${from}e au ${t.upTo}e : ${fraction(t.weight)}`;
    from = (t.upTo ?? from) + 1;
    return label;
  });
  const big = weightOf(100, tiers);
  const single = weightOf(1, tiers);
  const chance = (single / (big + single)) * 100;
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="tombola-rules">
      <h2 id="tombola-rules" className="text-lg font-bold text-ink">Comment ça marche ?</h2>
      <ol className="flex flex-col gap-2.5 text-sm text-ink-2">
        <li className="flex gap-3"><span className="size-6 shrink-0 grid place-items-center rounded-pill bg-primary-soft text-primary text-xs font-bold">1</span>
          <span><strong className="text-ink">1 vote payant = 1 ticket.</strong> Chaque vote acheté pour un candidat en semaine 3, et compté, vous donne un ticket numéroté.</span></li>
        <li className="flex gap-3"><span className="size-6 shrink-0 grid place-items-center rounded-pill bg-primary-soft text-primary text-xs font-bold">2</span>
          <span>
            <strong className="text-ink">Chacun garde sa chance.</strong> Le poids de vos tickets baisse avec leur nombre ({parts.join(' ; ')}).{' '}
            <span data-testid="tombola-example">
              Exemple : 100 tickets pèsent {pct(big)} contre {pct(single)} pour un ticket seul, qui garde donc {pct(Math.round(chance * 10) / 10)} % de chances.
            </span>
          </span></li>
        <li className="flex gap-3"><span className="size-6 shrink-0 grid place-items-center rounded-pill bg-primary-soft text-primary text-xs font-bold">3</span>
          <span><strong className="text-ink">Un seul lot par personne</strong> à chaque tirage.</span></li>
        <li className="flex gap-3"><span className="size-6 shrink-0 grid place-items-center rounded-pill bg-primary-soft text-primary text-xs font-bold">4</span>
          <span><strong className="text-ink">Pas deux fois le même type de lot</strong> en {cooldownDays >= 365 && cooldownDays <= 366 ? 'un an' : `${cooldownDays} jours`} : un gagnant récent d’un lot de cette catégorie ne peut pas le regagner.</span></li>
      </ol>
    </motion.section>
  );
}

function Commitment({ t }: { t: ImpactTombola }) {
  const d = t.draw;
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="tombola-commitment">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={SecurityCheckIcon} size={20} className="text-primary" />
        <h2 id="tombola-commitment" className="text-lg font-bold text-ink">Empreinte du tirage</h2>
      </div>
      {d ? (
        <>
          <p className="font-mono text-xs text-ink bg-surface-2 rounded-tile px-3 py-2 break-all select-all" data-testid="tombola-commitment">{d.seedCommitment}</p>
          <p className="text-xs text-ink-3">Publiée le {dateTime(d.committedAt)}.</p>
          {!d.committedBeforeTicketsClosed && (
            <p className="text-sm text-ink bg-accent-soft rounded-tile px-3 py-2" data-testid="tombola-late-commitment">
              Cette empreinte a été fixée après la clôture des votes payants, quand les tickets étaient déjà connus. Le tirage reste vérifiable, mais il n’offre pas
              la garantie supplémentaire d’une graine choisie avant.
            </p>
          )}
          <Link to={`/impact-challenge/tombola/preuve/${encodeURIComponent(d._id)}`} className="self-start text-sm font-semibold text-primary py-1">
            Vérifier le tirage
          </Link>
        </>
      ) : (
        <p className="text-sm text-ink-2">L’empreinte sera publiée ici avant le tirage.</p>
      )}
      <details>
        <summary className="text-sm font-semibold text-primary cursor-pointer select-none">Pourquoi ?</summary>
        <p className="text-sm text-ink-2 mt-2">
          Le tirage utilise un nombre secret, la « graine ». Avant le tirage, SBC publie son empreinte : un code calculé à partir de la graine, qui ne la révèle pas
          mais ne correspond qu’à elle. Après le tirage, la graine est publiée : chacun peut vérifier qu’elle donne bien cette empreinte, donc qu’elle n’a pas été
          changée pour favoriser quelqu’un, puis recalculer les gagnants à partir des tickets.
        </p>
      </details>
    </motion.section>
  );
}

function MyTickets({ live }: { live: boolean }) {
  const mine = useMyTombola({ live });
  const m = mine.data;
  if (mine.isLoading || !m) return null;
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="tombola-mine">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={Ticket01Icon} size={20} className="text-accent" />
        <h2 id="tombola-mine" className="text-lg font-bold text-ink">Mes tickets</h2>
      </div>
      {m.wins.map((w) => (
        <p key={`${w.prizeLabel}-${w.ticketNumber}`} role="status" className="text-sm font-bold text-white bg-success rounded-tile px-3 py-2 flex items-center gap-2">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
          Gagné ! {w.prizeLabel} avec le ticket n° {w.ticketNumber}.
        </p>
      ))}
      {m.tickets > 0 ? (
        <>
          <p className="text-2xl font-bold text-ink" data-testid="tombola-my-count">{plural(m.tickets, 'ticket', 'tickets')}</p>
          <p className="text-sm text-ink-2 break-words" data-testid="tombola-my-ranges">{rangesLabel(m.ranges)}</p>
          <p className="text-sm text-ink-2" data-testid="tombola-my-chance">
            {m.drawn ? 'Vos chances au 1er lot étaient de ' : 'Vos chances au 1er lot : '}<strong className="text-ink">{pct(m.sharePct)} %</strong>
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-2">
          Vous n’avez pas encore de ticket. Chaque vote payant pour un candidat en semaine 3 vous en donne un.{' '}
          <Link to="/impact-challenge/candidats" className="font-semibold text-primary">Voir les candidats</Link>
        </p>
      )}
    </motion.section>
  );
}

function History() {
  const h = useTombolaHistory();
  if (!h.data?.length) return null;
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="tombola-history">
      <h2 id="tombola-history" className="text-lg font-bold text-ink">Historique des tirages</h2>
      {h.data.map((d) => (
        <div key={d.drawId} className="flex flex-col gap-2" data-testid="tombola-history-draw">
          <p className="text-sm font-semibold text-ink">{d.editionName ?? 'SBC Impact Challenge'} · <span className="font-normal text-ink-3">{dateTime(d.drawnAt)}</span></p>
          <ul className="flex flex-col divide-y divide-border">
            {d.winners.map((w) => (
              <li key={w.order} className="py-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                <span className="text-ink font-medium">{w.prize}</span>
                <span className="text-ink-2">
                  {w.ticketNumber ? `Ticket n° ${w.ticketNumber} · ${w.displayName ?? '—'}` : '—'}
                </span>
                <span className="text-xs font-semibold text-ink-3">{WINNER_STATUS[w.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </motion.section>
  );
}

/** SBC Tombola: the prizes, the rules, the live draw, the member's tickets, the proof and the history. */
export default function ImpactTombola() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const current = useImpactCurrentEdition();
  const liveFinal = current.data?.stage === 'LIVE';
  const tombola = useImpactTombola({ live: liveFinal });
  const t = tombola.data;
  const revealing = isRevealing(t);

  // A winner revealed while the page is open is drawn once; winners already shown at the first load are not.
  const seen = useRef<Set<number> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [drawing, setDrawing] = useState<Set<number>>(() => new Set());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (tombola.data === undefined) return;
    const winners = tombola.data?.draw?.status === 'DONE' ? tombola.data.draw.winners : [];
    if (!seen.current) {
      seen.current = new Set(winners.map((w) => w.order));
      return;
    }
    const fresh = winners.filter((w) => !seen.current!.has(w.order)).map((w) => w.order);
    if (!fresh.length) return;
    fresh.forEach((o) => seen.current!.add(o));
    setDrawing((cur) => new Set([...cur, ...fresh]));
    const ms = reduced ? TOMBOLA_REVEAL_REDUCED_MS : TOMBOLA_REVEAL_MS;
    timers.current.push(setTimeout(() => setDrawing((cur) => {
      const next = new Set(cur);
      fresh.forEach((o) => next.delete(o));
      return next;
    }), ms));
  }, [tombola.data, reduced]);

  let body;
  if (tombola.isLoading) {
    body = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de la tombola">
        <Skeleton height="h-36" rounded="rounded-card" />
        <Skeleton height="h-48" rounded="rounded-card" />
      </div>
    );
  } else if (tombola.isError) {
    body = (
      <div className="bg-danger-soft text-danger rounded-card p-4 flex flex-col gap-3" role="alert">
        <p className="text-sm">{(tombola.error as Error)?.message || 'Impossible de charger la tombola.'}</p>
        <button type="button" onClick={() => tombola.refetch()} className="self-start bg-surface text-ink font-semibold text-sm rounded-pill px-4 py-2 border border-border">
          Réessayer
        </button>
      </div>
    );
  } else if (!t) {
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        <motion.section variants={sectionRise} className={cn(card, 'p-6 flex flex-col items-center text-center gap-3')}>
          <span className="size-14 grid place-items-center rounded-pill bg-accent-soft text-accent">
            <HugeiconsIcon icon={GiftIcon} size={28} />
          </span>
          <h2 className="text-lg font-bold text-ink">La tombola n’a pas encore commencé</h2>
          <p className="text-sm text-ink-2">Elle s’ouvre avec la compétition du SBC Impact Challenge : chaque vote payant vous donnera un ticket.</p>
        </motion.section>
        <History />
      </motion.div>
    );
  } else {
    const d = t.draw;
    const done = d?.status === 'DONE';
    const prizes = done && d!.prizes.length ? d!.prizes : t.prizes;
    const total = (done ? d!.totalTickets : null) ?? t.totalTickets;
    const status = !done ? 'Tirage au sort à la fin de la grande finale.'
      : revealing ? `Tirage en cours : ${d!.revealedCount} lot${d!.revealedCount > 1 ? 's' : ''} sur ${d!.winnersCount} dévoilé${d!.revealedCount > 1 ? 's' : ''}.`
        : `Tirage effectué le ${dateTime(d!.drawnAt)}.`;
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4 lg:gap-6">
        <motion.section variants={sectionRise} className="bg-primary text-white rounded-card p-4 lg:p-6 flex flex-col gap-3 relative overflow-hidden">
          <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-pill bg-white/10" />
          <span className="self-start text-[11px] font-semibold uppercase tracking-wide bg-white/15 rounded-pill px-2.5 py-1">{t.editionName}</span>
          <h2 className="text-xl lg:text-3xl font-bold leading-tight relative">SBC Tombola</h2>
          <p className="text-sm lg:text-base text-white/85 relative" data-testid="tombola-status">{status}</p>
          <div className="grid grid-cols-2 gap-2 relative">
            <div className="bg-white/10 rounded-tile px-3 py-2">
              <span className="block text-xs text-white/75">Tickets</span>
              <span className="block font-bold text-lg lg:text-2xl" data-testid="tombola-total">{total.toLocaleString('fr-FR')}</span>
            </div>
            <div className="bg-white/10 rounded-tile px-3 py-2">
              <span className="block text-xs text-white/75">Participants</span>
              <span className="block font-bold text-lg lg:text-2xl" data-testid="tombola-participants">
                {((done ? d!.participants : null) ?? t.participants).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>
        </motion.section>

        <motion.section variants={sectionRise} className="flex flex-col gap-3" aria-labelledby="tombola-prizes">
          <h2 id="tombola-prizes" className="text-lg lg:text-2xl font-bold text-ink">{done ? 'Les gagnants' : 'Les lots'}</h2>
          <motion.ol variants={listContainer} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-5">
            {prizes.map((p, i) => {
              const order = i + 1;
              const w = done ? d!.winners.find((x) => x.order === order) : undefined;
              if (w) return <RevealCard key={p.key + order} prize={p} w={w} drawing={drawing.has(order)} total={total} />;
              if (done) return <Upcoming key={p.key + order} prize={p} order={order} />;
              return (
                <motion.li key={p.key + order} variants={listItem} aria-label={`Lot ${order} : ${p.label}`}
                  className={cn(card, 'flex flex-col items-center text-center gap-2 min-h-32 justify-center')}>
                  <span className="size-10 grid place-items-center rounded-pill bg-accent-soft text-accent"><HugeiconsIcon icon={GiftIcon} size={20} /></span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Lot n° {order}</p>
                  <p className="text-lg font-bold text-ink">{p.label}</p>
                </motion.li>
              );
            })}
          </motion.ol>
          {done && <p className="text-xs text-ink-3 text-center">Les gagnants sont prévenus au moment où leur lot est dévoilé.</p>}
        </motion.section>

        <MyTickets live={liveFinal || revealing} />
        <Rules tiers={t.tiers} cooldownDays={t.cooldownDays} />
        <Commitment t={t} />
        <History />
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 max-w-5xl mx-auto">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl lg:text-2xl font-bold text-ink">SBC Tombola</h1>
      </div>
      <div className="px-4 pb-10 max-w-5xl mx-auto">{body}</div>
    </div>
  );
}
