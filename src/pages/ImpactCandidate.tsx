import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Book02Icon, Calendar03Icon, CheckmarkCircle02Icon, Clock01Icon, Copy01Icon, RefreshIcon,
  Rocket01Icon, Share08Icon, Tick02Icon, UserGroupIcon,
} from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { Sheet } from '../components/relance/ui/Sheet';
import { ConfirmSheet } from '../components/relance/ui/ConfirmSheet';
import CandidateProfileForm from '../components/impact/CandidateProfileForm';
import { countryName } from '../components/impact/profile';
import ShareLink from '../components/impact/ShareLink';
import { ProjectSubmissionCard, VideoSubmissionCard } from '../components/impact/SubmissionCards';
import { MEDALS, STAGE_INFO, candidatePageUrl, plural as countOf, rankLabel, score as formatScore } from '../components/impact/stages';
import JuryEntryCard from '../components/impact/JuryEntryCard';
import MyShowcaseCard from '../components/impact/MyShowcaseCard';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import {
  ImpactApiError, impactData, impactKeys, isCounting, isFinalEdition, useImpactFinal, useImpactMySpace, withCandidate,
} from '../hooks/useImpactCandidate';
import type {
  ImpactCandidate as Candidate, ImpactCandidateStatus, ImpactEdition, ImpactMySpace, ImpactProfileInput, ImpactStage, ImpactSubmission,
} from '../types/impact';
import { FINAL_STAGES } from '../types/impact';
import { sequence, sectionRise } from '../utils/motion';
import { cn } from '../lib/utils';

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const card = 'bg-surface border border-border rounded-card p-4';

/** The competition (Phase 2) has started: weeks, contents and votes replace the qualification. */
const inCompetition = (e: ImpactEdition) => e.status === 'COMPETITION' || e.status === 'FINAL' || e.status === 'FINISHED';

// ---------- Pieces ----------

function Hero({ edition }: { edition: ImpactEdition }) {
  return (
    <motion.section variants={sectionRise} className="bg-primary text-white rounded-card p-4 flex flex-col gap-3 relative overflow-hidden">
      <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-pill bg-white/10" />
      <span className="self-start text-[11px] font-semibold uppercase tracking-wide bg-white/15 rounded-pill px-2.5 py-1">
        {edition.status === 'QUALIFICATION' ? 'Qualification en cours'
          : edition.stage ? `${STAGE_INFO[edition.stage].week} : ${STAGE_INFO[edition.stage].title}` : 'SBC Impact Challenge'}
      </span>
      <div className="relative">
        <h2 className="text-xl font-bold leading-tight">{edition.name}</h2>
        {edition.description && <p className="text-sm text-white/85 mt-1 whitespace-pre-line">{edition.description}</p>}
      </div>
    </motion.section>
  );
}

function KeyRules({ edition, onRules }: { edition: ImpactEdition; onRules: () => void }) {
  const s = edition.settings;
  const rows = [
    { icon: UserGroupIcon, label: 'Invitations à valider', value: `${s.invitationsRequired} personnes` },
    { icon: Rocket01Icon, label: 'Places de candidat officiel', value: `${edition.seats.taken}/${edition.seats.max} prises` },
    { icon: Calendar03Icon, label: 'Fin de la qualification', value: day(edition.schedule.qualificationClosesAt) },
  ];
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="impact-rules">
      <h2 id="impact-rules" className="text-lg font-bold text-ink">Comment se qualifier ?</h2>
      <p className="text-sm text-ink-2">
        Créez votre profil de candidat, puis faites venir {s.invitationsRequired} personnes qui rejoignent SBC <strong>et paient leur pack</strong>{' '}
        pendant la qualification. Les {s.maxCandidates} premiers à y arriver deviennent candidats officiels
        {s.waitlistSize > 0 ? `, les ${s.waitlistSize} suivants passent sur une liste d’attente` : ''}.
      </p>
      <ul className="grid grid-cols-1 gap-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 bg-surface-2 rounded-tile px-3 py-2.5">
            <HugeiconsIcon icon={r.icon} size={18} className="text-primary shrink-0" />
            <span className="text-sm text-ink-2 flex-1">{r.label}</span>
            <span className="text-sm font-bold text-ink text-right">{r.value}</span>
          </li>
        ))}
      </ul>
      {edition.rulesText && (
        <button type="button" onClick={onRules} className="self-start flex items-center gap-1.5 text-sm font-semibold text-primary py-1">
          <HugeiconsIcon icon={Book02Icon} size={16} />
          Lire le règlement
        </button>
      )}
    </motion.section>
  );
}

const STATUS_TONE: Partial<Record<ImpactCandidateStatus, string>> = {
  OFFICIAL: 'bg-success-soft text-success',
  STAGE_2: 'bg-success-soft text-success',
  STAGE_3: 'bg-success-soft text-success',
  FINALIST: 'bg-accent-soft text-accent',
  ELIMINATED: 'bg-surface-2 text-ink-2',
  WAITLIST: 'bg-accent-soft text-accent',
  QUALIFYING: 'bg-primary-soft text-primary',
  NOT_SELECTED: 'bg-surface-2 text-ink-2',
  WITHDRAWN: 'bg-surface-2 text-ink-2',
  SUSPENDED: 'bg-danger-soft text-danger',
  DISQUALIFIED: 'bg-danger-soft text-danger',
};

function statusSentence(c: Candidate, e: ImpactEdition): string {
  const req = c.invitations.required;
  switch (c.status) {
    case 'QUALIFYING':
      return `Faites venir ${req} personnes qui rejoignent SBC et paient leur pack avant le ${day(e.schedule.qualificationClosesAt)}. Les ${e.settings.maxCandidates} premiers deviennent candidats officiels.`;
    case 'WAITLIST':
      return c.waitlistRank
        ? `Vous avez vos ${req} invitations, mais toutes les places sont prises : vous êtes n° ${c.waitlistRank} sur la liste d’attente. Si une place se libère, elle vous revient.`
        : `Vous avez vos ${req} invitations, mais toutes les places sont prises : vous êtes sur la liste d’attente.`;
    case 'OFFICIAL':
      if (inCompetition(e)) {
        return `Vous êtes candidat officiel${c.seatNumber ? ` (place n° ${c.seatNumber})` : ''}. Envoyez votre vidéo « Ma vision de SBC » : une fois validée, elle vous qualifie pour le vote gratuit de la semaine 2.`;
      }
      return c.seatNumber
        ? `Félicitations ! Vous êtes candidat officiel, place n° ${c.seatNumber}. La suite du Challenge commence le ${day(e.schedule.competitionStartsAt) || 'jour annoncé par SBC'}.`
        : 'Félicitations ! Vous êtes candidat officiel.';
    case 'STAGE_2':
      return 'Vous êtes à l’étape 2 : votre vidéo « Ma vision de SBC » est en lice pour le vote gratuit. Préparez déjà la présentation de votre projet pour la semaine 3.';
    case 'STAGE_3':
      return 'Vous êtes à l’étape 3 : votre projet est en lice pour les votes de la semaine 3, qui désignent le TOP 3.';
    case 'FINALIST':
      return c.rank ? `Félicitations ! Vous êtes finaliste, ${c.rank === 1 ? '1er' : `${c.rank}e`} du classement.` : 'Félicitations ! Vous êtes finaliste.';
    case 'WINNER':
      return 'Bravo ! Vous avez remporté le SBC Impact Challenge. L’équipe SBC vous contacte pour la suite.';
    case 'ELIMINATED':
      return 'Vous n’êtes pas dans le TOP 3 cette fois. Merci pour votre parcours dans le Challenge !';
    case 'NOT_SELECTED':
      return 'Les inscriptions ont fermé avant que vous atteigniez le nombre d’invitations demandé. Merci pour votre participation !';
    case 'SUSPENDED':
      return 'Votre candidature est suspendue le temps d’une vérification par l’équipe SBC. Vous gardez votre place ; vous serez prévenu de la décision.';
    case 'DISQUALIFIED':
      return 'Votre candidature a été disqualifiée par l’équipe SBC. Pour en savoir plus, contactez le support depuis « Aide ».';
    case 'WITHDRAWN':
      return 'Vous vous êtes retiré du Challenge.';
    default:
      return 'La compétition est en cours. Suivez les prochaines étapes ci-dessous.';
  }
}

function StatusCard({ c, e }: { c: Candidate; e: ImpactEdition }) {
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-labelledby="impact-status">
      <div className="flex items-center justify-between gap-2">
        <h2 id="impact-status" className="text-sm font-semibold text-ink-2">Ma candidature</h2>
        {c.status === 'OFFICIAL' && c.seatNumber && (
          <span className="text-xs font-bold text-white bg-success rounded-pill px-2.5 py-1">Place n° {c.seatNumber}</span>
        )}
        {c.status === 'WAITLIST' && c.waitlistRank && (
          <span className="text-xs font-bold text-white bg-accent rounded-pill px-2.5 py-1">Liste d’attente n° {c.waitlistRank}</span>
        )}
      </div>
      <p className={cn('self-start text-sm font-bold rounded-pill px-3 py-1', STATUS_TONE[c.status] ?? 'bg-primary-soft text-primary')}>
        {c.statusLabel}
      </p>
      <p className="text-sm text-ink-2">{statusSentence(c, e)}</p>
    </motion.section>
  );
}

function InvitationsCard({ c, e, refreshing, refreshNote, onRefresh }: {
  c: Candidate; e: ImpactEdition; refreshing: boolean; refreshNote: string; onRefresh: () => void;
}) {
  const { valid, pending, required, checkedAt } = c.invitations;
  const pct = required > 0 ? Math.min(100, (valid / required) * 100) : 0;
  const reached = valid >= required;
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="impact-invites">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="impact-invites" className="text-sm font-semibold text-ink-2">Mes invitations</h2>
          <p className="text-2xl font-bold text-ink leading-tight" data-testid="impact-counter">
            {`${valid}/${required} invitations validées`}
          </p>
        </div>
        {e.status === 'QUALIFICATION' && (
          <motion.button
            type="button"
            whileTap={refreshing ? undefined : { scale: 0.95 }}
            onClick={onRefresh}
            disabled={refreshing}
            className="shrink-0 flex items-center gap-1.5 text-sm font-semibold text-primary bg-primary-soft rounded-pill px-3 py-2 disabled:opacity-60"
          >
            <HugeiconsIcon icon={RefreshIcon} size={16} className={cn(refreshing && 'animate-spin')} />
            {refreshing ? 'Vérification…' : 'Actualiser'}
          </motion.button>
        )}
      </div>
      <div className="h-3 bg-surface-2 rounded-pill overflow-hidden" role="progressbar" aria-label="Invitations validées"
        aria-valuemin={0} aria-valuemax={required} aria-valuenow={Math.min(valid, required)}>
        <motion.div
          className={cn('h-full rounded-pill', reached ? 'bg-success' : 'bg-primary')}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
      {pending > 0 && (
        <p className="text-sm text-accent font-semibold flex items-center gap-1.5">
          <HugeiconsIcon icon={Clock01Icon} size={16} />
          {plural(pending, 'inscrit en attente de paiement', 'inscrits en attente de paiement')}
        </p>
      )}
      {refreshNote && <p role="status" className="text-sm text-ink-2 bg-surface-2 rounded-tile px-3 py-2">{refreshNote}</p>}
      {checkedAt && <p className="text-xs text-ink-3">Dernière vérification : {day(checkedAt)} à {time(checkedAt)}</p>}
      <p className="text-xs text-ink-3">
        Compte comme invitation validée : un filleul direct qui paie son pack pendant la qualification
        (du {day(e.schedule.qualificationOpensAt)} au {day(e.schedule.qualificationClosesAt)}). Un pack que vous activez pour lui
        avec votre solde d’activation compte aussi.
      </p>
    </motion.section>
  );
}

function InviteCard({ code }: { code: string }) {
  const url = `${window.location.origin}/signup?affiliationCode=${encodeURIComponent(code)}`;
  const [copy, setCopy] = useState<'copied' | 'failed' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copyLink = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(url);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
    timer.current = setTimeout(() => setCopy(null), 2500);
  };
  const share = async () => {
    const text = 'Rejoignez-moi sur Sniper Business Center';
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Sniper Business Center', text, url }); } catch { /* closed */ }
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} : ${url}`)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="impact-invite">
      <div>
        <h2 id="impact-invite" className="text-lg font-bold text-ink">Inviter</h2>
        <p className="mt-1 text-sm text-ink-2">
          Partagez votre lien de parrainage : chaque personne qui s’inscrit avec et paie son pack vous rapproche de votre place.
        </p>
      </div>
      <p className="rounded-tile bg-surface-2 px-3 py-2.5 text-sm font-medium text-ink break-all select-all" data-testid="impact-invite-link">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copyLink}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold bg-surface text-ink border border-border hover:bg-surface-2">
          <HugeiconsIcon icon={copy === 'copied' ? CheckmarkCircle02Icon : Copy01Icon} size={16} className={copy === 'copied' ? 'text-success' : undefined} />
          {copy === 'copied' ? 'Lien copié' : 'Copier le lien'}
        </button>
        <button type="button" onClick={share}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold bg-primary text-white hover:bg-primary-hover">
          <HugeiconsIcon icon={Share08Icon} size={16} />
          Partager
        </button>
      </div>
      <p role="status" className={cn('text-sm text-ink-2', copy !== 'failed' && 'sr-only')}>
        {copy === 'copied' && 'Lien copié'}
        {copy === 'failed' && 'Copie impossible : appuyez longuement sur le lien pour le copier.'}
      </p>
    </motion.section>
  );
}

function ReviewCard({ c, editable, onEdit }: { c: Candidate; editable: boolean; onEdit: () => void }) {
  const r = c.review;
  const view = r.status === 'APPROVED'
    ? { title: 'Candidature validée', text: 'L’équipe SBC a validé votre profil.', tone: 'bg-success-soft text-success' }
    : r.status === 'CHANGES_REQUESTED'
      ? { title: 'Modifications demandées', text: 'L’équipe SBC vous demande de corriger votre profil :', tone: 'bg-accent-soft text-accent' }
      : { title: 'Profil en cours de vérification', text: 'L’équipe SBC vérifie votre profil. Vous serez prévenu dès qu’il est validé.', tone: 'bg-primary-soft text-primary' };
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-2')} aria-labelledby="impact-review">
      <h2 id="impact-review" className="text-sm font-semibold text-ink-2">Mon profil</h2>
      <p className={cn('self-start text-sm font-bold rounded-pill px-3 py-1', view.tone)}>{view.title}</p>
      <p className="text-sm text-ink-2">{view.text}</p>
      {r.status === 'CHANGES_REQUESTED' && r.reason && (
        <p className="text-sm text-ink bg-surface-2 rounded-tile px-3 py-2 whitespace-pre-line" data-testid="impact-review-reason">{r.reason}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        <img
          src={sbcApiService.generateThumbnailUrl(c.profile.photoFileId, 128)}
          alt=""
          className="size-12 rounded-pill object-cover bg-surface-2 shrink-0"
        />
        <div className="min-w-0">
          <p className="font-semibold text-ink truncate">{c.profile.projectName}</p>
          <p className="text-xs text-ink-3 truncate">{c.profile.name} · {[c.profile.city, c.profile.country].filter(Boolean).join(', ')}</p>
        </div>
      </div>
      {editable && (
        <button type="button" onClick={onEdit}
          className={cn('mt-1 w-full font-semibold py-3 rounded-pill',
            r.status === 'CHANGES_REQUESTED' ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-surface-2 text-ink')}>
          Modifier mon profil
        </button>
      )}
    </motion.section>
  );
}

const STEPS = [
  'Qualification',
  'Candidat officiel',
  'Semaine 1 : Présentation',
  'Semaine 2 : Vidéo « Ma vision de SBC »',
  'Semaine 3 : Présentation du projet',
  'Finale',
];

/** Index in STEPS of each competition stage (the TOP 3 is the way to the final). */
const STAGE_STEP: Record<ImpactStage, number> = { WEEK1: 2, WEEK2: 3, WEEK3: 4, TOP3: 5, LIVE: 5, RESULT: 6 };

function Timeline({ c, stage }: { c: Candidate | null; stage?: ImpactStage | null }) {
  const official = !!c && (!!c.seatNumber || ['OFFICIAL', 'STAGE_2', 'STAGE_3', 'FINALIST', 'WINNER', 'FINISHED', 'ELIMINATED'].includes(c.status));
  const qualified = !!c && (official || !!c.invitations.reachedAt || c.status === 'WAITLIST');
  const at = stage ? STAGE_STEP[stage] : null;
  const state = (i: number): 'done' | 'current' | 'upcoming' => {
    if (i === 0) return qualified ? 'done' : c && c.status === 'QUALIFYING' ? 'current' : 'upcoming';
    if (i === 1) return official ? 'done' : qualified ? 'current' : 'upcoming';
    if (at === null) return 'upcoming';
    return i < at ? 'done' : i === at ? 'current' : 'upcoming';
  };
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="impact-steps">
      <h2 id="impact-steps" className="text-lg font-bold text-ink">Les étapes</h2>
      <ol className="flex flex-col">
        {STEPS.map((label, i) => {
          const s = state(i);
          return (
            <li key={label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={cn('size-7 shrink-0 grid place-items-center rounded-pill text-xs font-bold',
                  s === 'done' ? 'bg-success text-white' : s === 'current' ? 'bg-primary text-white' : 'bg-surface-2 text-ink-3')}>
                  {s === 'done' ? <HugeiconsIcon icon={Tick02Icon} size={16} /> : i + 1}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden className="w-0.5 flex-1 min-h-4 bg-border" />}
              </div>
              <div className="pb-3 min-w-0">
                <p className={cn('text-sm font-semibold', s === 'upcoming' ? 'text-ink-3' : 'text-ink')}>{label}</p>
                <p className="text-xs text-ink-3" data-testid={`impact-step-${i}`}>{s === 'done' ? 'Terminé' : s === 'current' ? 'En cours' : 'À venir'}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
}

function VotesCard({ c, stage }: { c: Candidate; stage?: ImpactStage | null }) {
  const v = c.votes ?? { free: 0, paid: 0, paidAmount: 0 };
  const decided = (!!stage && FINAL_STAGES.includes(stage)) || ['FINALIST', 'WINNER', 'ELIMINATED'].includes(c.status);
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="impact-votes">
      <h2 id="impact-votes" className="text-sm font-semibold text-ink-2">Mes votes</h2>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-2 rounded-tile px-3 py-2">
          <p className="text-xs text-ink-2">Vote gratuit (semaine 2)</p>
          <p className="text-lg font-bold text-ink" data-testid="impact-my-free-votes">{countOf(v.free, 'vote', 'votes')}</p>
        </div>
        <div className="bg-surface-2 rounded-tile px-3 py-2">
          <p className="text-xs text-ink-2">Votes payants (semaine 3)</p>
          <p className="text-lg font-bold text-ink" data-testid="impact-my-paid-votes">{countOf(v.paid, 'vote', 'votes')}</p>
        </div>
      </div>
      {decided && (
        <p className={cn('self-start text-sm font-bold rounded-pill px-3 py-1',
          c.status === 'FINALIST' || c.status === 'WINNER' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-ink-2')} data-testid="impact-my-result">
          {c.rank ? `${MEDALS[c.rank] ? `${MEDALS[c.rank]} ` : ''}${c.rank === 1 ? '1er' : `${c.rank}e`} · ` : ''}
          {c.status === 'WINNER' ? 'Gagnant' : c.status === 'FINALIST' ? 'Finaliste' : c.status === 'ELIMINATED' ? 'Éliminé' : c.statusLabel}
        </p>
      )}
      {stage !== 'RESULT' && <p className="text-xs text-ink-3">Seuls les votes payants de la semaine 3 désignent le TOP 3.</p>}
    </motion.section>
  );
}

/** « La finale » for a finalist: the live screen, then their score and rank once the result is published. */
function FinalCard({ c, stage }: { c: Candidate; stage?: ImpactStage | null }) {
  const final = useImpactFinal();
  const row = final.data?.result?.rows.find((r) => r.candidateId === c._id) ?? null;
  const live = (final.data?.stage ?? stage) === 'LIVE';
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3 border-accent')} aria-labelledby="impact-final">
      <h2 id="impact-final" className="text-lg font-bold text-ink">La finale</h2>
      {row ? (
        <div className="grid grid-cols-2 gap-2" data-testid="impact-my-final">
          <div className="bg-surface-2 rounded-tile px-3 py-2">
            <p className="text-xs text-ink-2">Score final</p>
            <p className="text-lg font-bold text-ink">{formatScore(row.score)}/100</p>
          </div>
          <div className="bg-surface-2 rounded-tile px-3 py-2">
            <p className="text-xs text-ink-2">Classement</p>
            <p className="text-lg font-bold text-ink">{MEDALS[row.rank] ? `${MEDALS[row.rank]} ` : ''}{rankLabel(row.rank)}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-2">
          {live
            ? 'La finale est en direct : présentez votre projet au jury, puis le public vote.'
            : 'Vous présenterez votre projet en direct devant le jury, puis le public votera. Le résultat combine les votes de la semaine 3, le vote du public et la note du jury.'}
        </p>
      )}
      <Link to="/impact-challenge/finale" className="w-full text-center bg-accent text-white font-semibold py-3 rounded-pill">
        {row ? 'Voir le résultat' : live ? 'Suivre la finale en direct' : 'Voir la finale'}
      </Link>
    </motion.section>
  );
}

function PublicPageCard({ c }: { c: Candidate }) {
  return (
    <motion.section variants={sectionRise} className={cn(card, 'flex flex-col gap-3')} aria-labelledby="impact-public-page">
      <div>
        <h2 id="impact-public-page" className="text-lg font-bold text-ink">Ma page de candidat</h2>
        <p className="text-sm text-ink-2 mt-1">Partagez-la : votre communauté y découvre votre projet et vote pour vous.</p>
      </div>
      <Link to={`/impact-challenge/candidats/${encodeURIComponent(c._id)}`} className="self-start text-sm font-semibold text-primary py-1">
        Voir ma page publique
      </Link>
      <ShareLink url={candidatePageUrl(c._id)} text={`Votez pour moi, ${c.profile.name} (${c.profile.projectName}), au SBC Impact Challenge`} />
    </motion.section>
  );
}

function EmptyState() {
  return (
    <motion.section variants={sectionRise} className={cn(card, 'p-6 flex flex-col items-center text-center gap-3')}>
      <span className="size-14 grid place-items-center rounded-pill bg-primary-soft text-primary">
        <HugeiconsIcon icon={Rocket01Icon} size={28} />
      </span>
      <h2 className="text-lg font-bold text-ink">Pas d’édition en cours</h2>
      <p className="text-sm text-ink-2">
        Les inscriptions au prochain SBC Impact Challenge ne sont pas encore ouvertes. Revenez bientôt pour devenir candidat et présenter votre projet.
      </p>
    </motion.section>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de votre espace candidat">
      <Skeleton height="h-40" rounded="rounded-card" />
      <Skeleton height="h-28" rounded="rounded-card" />
      <Skeleton height="h-48" rounded="rounded-card" />
    </div>
  );
}

// ---------- Page ----------

export default function ImpactCandidate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const me = useImpactMySpace();
  const space = me.data;
  const edition = space?.edition ?? null;
  const candidacy = space?.candidacy ?? null;

  const [form, setForm] = useState<null | 'create' | 'edit'>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState('');
  const [notice, setNotice] = useState('');

  const top = useRef<HTMLDivElement>(null);
  const toTop = () => top.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

  const putCandidate = (c: Candidate) =>
    queryClient.setQueryData<ImpactMySpace>(impactKeys.me, (cur) => withCandidate(cur, c));

  const putSubmission = (sub: ImpactSubmission) => {
    queryClient.setQueryData<ImpactMySpace>(impactKeys.me, (cur) => (cur ? {
      ...cur,
      submissions: { VIDEO: cur.submissions?.VIDEO ?? null, PROJECT: cur.submissions?.PROJECT ?? null, [sub.kind]: sub },
    } : cur));
    setNotice(sub.kind === 'VIDEO'
      ? 'Vidéo envoyée. L’équipe SBC va la vérifier avant de la publier.'
      : 'Projet envoyé. L’équipe SBC va le vérifier avant de le publier.');
    toTop();
  };

  const openForm = (mode: 'create' | 'edit') => {
    setNotice('');
    setForm(mode);
    toTop();
  };

  const submit = async (profile: ImpactProfileInput) => {
    const res = form === 'edit'
      ? await sbcApiService.impactUpdateCandidacy(profile)
      : await sbcApiService.impactApply({ ...profile, consent: true });
    if (!res.isSuccessByStatusCode) {
      const err = new ImpactApiError(res, 'L’envoi a échoué. Réessayez.');
      // Already a candidate (another tab) or locked meanwhile: show the real state.
      if (err.code === 'ALREADY_CANDIDATE' || err.code === 'PROFILE_LOCKED' || err.code === 'REGISTRATION_CLOSED') me.refetch();
      throw err;
    }
    putCandidate(res.body.data as Candidate);
    setNotice(form === 'edit'
      ? 'Profil enregistré. L’équipe SBC va le vérifier à nouveau.'
      : 'Votre candidature est enregistrée ! Invitez maintenant vos proches à rejoindre SBC.');
    setForm(null);
    toTop();
  };

  const refresh = async () => {
    setRefreshing(true);
    setRefreshNote('');
    try {
      const res = await sbcApiService.impactRefreshCandidacy();
      if (res.statusCode === 429) {
        const wait = Number(res.body?.details?.retryAfterSeconds);
        setRefreshNote(wait > 0
          ? `Patientez ${wait} secondes avant d’actualiser à nouveau.`
          : 'Patientez quelques secondes avant d’actualiser à nouveau.');
        return;
      }
      putCandidate(impactData<Candidate>(res, 'Le compteur ne peut pas être mis à jour pour le moment.'));
    } catch (err) {
      setRefreshNote((err as Error).message || 'Le compteur ne peut pas être mis à jour pour le moment.');
    } finally {
      setRefreshing(false);
    }
  };

  const withdraw = async () => {
    setWithdrawBusy(true);
    setWithdrawError('');
    try {
      putCandidate(impactData<Candidate>(await sbcApiService.impactWithdraw(), 'Le retrait a échoué. Réessayez.'));
      setWithdrawOpen(false);
      setNotice('');
    } catch (err) {
      setWithdrawError((err as Error).message);
    } finally {
      setWithdrawBusy(false);
    }
  };

  const initialProfile: Partial<ImpactProfileInput> = candidacy
    ? candidacy.profile
    : { name: user?.name ?? '', country: countryName(user?.country), city: user?.city ?? '' };

  // The server says what the member may do (GET /tickets/impact/me).
  const editable = !!(candidacy && space?.canEdit);
  const canWithdraw = !!(candidacy && space?.canWithdraw);
  const inviteCode = user?.referralCode || candidacy?.sbcId || '';
  const showInvite = !!candidacy && !!inviteCode && isCounting(space);

  let body;
  if (me.isLoading) {
    body = <LoadingState />;
  } else if (me.isError) {
    body = (
      <div className="bg-danger-soft text-danger rounded-card p-4 flex flex-col gap-3" role="alert">
        <p className="text-sm">{(me.error as Error)?.message || 'Impossible de charger votre espace candidat.'}</p>
        <button type="button" onClick={() => me.refetch()} className="self-start bg-surface text-ink font-semibold text-sm rounded-pill px-4 py-2 border border-border">
          Réessayer
        </button>
      </div>
    );
  } else if (!edition) {
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        <EmptyState />
      </motion.div>
    );
  } else if (form) {
    body = (
      <CandidateProfileForm
        key={form}
        edition={edition}
        mode={form}
        initial={initialProfile}
        onSubmit={submit}
        onCancel={() => { setForm(null); toTop(); }}
      />
    );
  } else if (!candidacy) {
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        <Hero edition={edition} />
        <KeyRules edition={edition} onRules={() => setRulesOpen(true)} />
        {space?.canApply ? (
          <motion.div variants={sectionRise}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => openForm('create')}
              className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 rounded-pill"
            >
              Devenir candidat
            </motion.button>
          </motion.div>
        ) : space?.blocker ? (
          <motion.p variants={sectionRise} role="status" className="text-sm font-semibold text-ink bg-surface-2 rounded-card px-4 py-3 text-center">
            {space.blocker.message}
          </motion.p>
        ) : null}
        <Timeline c={null} />
      </motion.div>
    );
  } else if (inCompetition(edition)) {
    // Phase 2: the weeks, the contents to send, the votes received.
    const st = candidacy.status;
    const rounds = edition.rounds;
    const running = edition.status === 'COMPETITION';
    const videoOpen = running && ['OFFICIAL', 'STAGE_2'].includes(st) && rounds?.FREE?.status !== 'CLOSED';
    const projectOpen = running && ['OFFICIAL', 'STAGE_2', 'STAGE_3'].includes(st) && rounds?.PAID?.status !== 'CLOSED';
    const competing = ['OFFICIAL', 'STAGE_2', 'STAGE_3', 'FINALIST', 'WINNER', 'ELIMINATED', 'FINISHED', 'SUSPENDED'].includes(st);
    const subs = space?.submissions;
    const reload = () => { me.refetch(); };
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        {notice && (
          <motion.p variants={sectionRise} role="status" className="text-sm text-success bg-success-soft rounded-card px-4 py-3">{notice}</motion.p>
        )}
        <Hero edition={edition} />
        <StatusCard c={candidacy} e={edition} />
        <JuryEntryCard active={isFinalEdition(edition)} />
        {(st === 'FINALIST' || st === 'WINNER') && isFinalEdition(edition) && <FinalCard c={candidacy} stage={edition.stage} />}
        <MyShowcaseCard enabled={(st === 'FINALIST' || st === 'WINNER') && edition.stage === 'RESULT'} />
        {competing && <VotesCard c={candidacy} stage={edition.stage} />}
        {competing && candidacy.publishedAt && <PublicPageCard c={candidacy} />}
        {competing && (videoOpen || subs?.VIDEO) && (
          <VideoSubmissionCard
            key={`video-${subs?.VIDEO?._id ?? 'new'}-${subs?.VIDEO?.updatedAt ?? ''}`}
            submission={subs?.VIDEO ?? null}
            canSubmit={videoOpen}
            onSubmitted={putSubmission}
            onReload={reload}
          />
        )}
        {competing && (projectOpen || subs?.PROJECT) && (
          <ProjectSubmissionCard
            key={`project-${subs?.PROJECT?._id ?? 'new'}-${subs?.PROJECT?.updatedAt ?? ''}`}
            submission={subs?.PROJECT ?? null}
            canSubmit={projectOpen}
            onSubmitted={putSubmission}
            onReload={reload}
          />
        )}
        <motion.div variants={sectionRise}>
          <Link to="/impact-challenge/candidats" className={cn(card, 'flex items-center justify-between gap-2 py-3 text-sm font-semibold text-primary')}>
            Voir tous les candidats
            <HugeiconsIcon icon={UserGroupIcon} size={16} />
          </Link>
        </motion.div>
        <Timeline c={candidacy} stage={edition.stage} />
        {edition.rulesText && (
          <motion.div variants={sectionRise} className="flex justify-center">
            <button type="button" onClick={() => setRulesOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-primary py-2">
              <HugeiconsIcon icon={Book02Icon} size={16} />
              Lire le règlement
            </button>
          </motion.div>
        )}
      </motion.div>
    );
  } else {
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-4">
        {notice && (
          <motion.p variants={sectionRise} role="status" className="text-sm text-success bg-success-soft rounded-card px-4 py-3">{notice}</motion.p>
        )}
        <Hero edition={edition} />
        <StatusCard c={candidacy} e={edition} />
        {candidacy.status !== 'WITHDRAWN' && candidacy.status !== 'DISQUALIFIED' && (
          <InvitationsCard c={candidacy} e={edition} refreshing={refreshing} refreshNote={refreshNote} onRefresh={refresh} />
        )}
        {showInvite && <InviteCard code={inviteCode} />}
        {candidacy.status !== 'WITHDRAWN' && candidacy.status !== 'DISQUALIFIED' && (
          <ReviewCard c={candidacy} editable={editable} onEdit={() => openForm('edit')} />
        )}
        <Timeline c={candidacy} />
        <motion.div variants={sectionRise} className="flex flex-col items-center gap-1">
          {edition.rulesText && (
            <button type="button" onClick={() => setRulesOpen(true)} className="flex items-center gap-1.5 text-sm font-semibold text-primary py-2">
              <HugeiconsIcon icon={Book02Icon} size={16} />
              Lire le règlement
            </button>
          )}
          {canWithdraw && (
            <button type="button" onClick={() => { setWithdrawError(''); setWithdrawOpen(true); }} className="text-sm font-semibold text-danger py-2">
              Me retirer du Challenge
            </button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div ref={top} className="px-4 pt-3 pb-2 flex items-center gap-3">
        <BackButton onClick={() => (form ? setForm(null) : navigate(-1))} />
        <h1 className="text-xl font-bold text-ink">SBC Impact Challenge</h1>
      </div>

      <div className="px-4 pb-10 max-w-2xl mx-auto">{body}</div>

      <Sheet open={rulesOpen} onClose={() => setRulesOpen(false)} title="Règlement">
        <p className="text-sm text-ink-2 whitespace-pre-line" data-testid="impact-rules-text">{edition?.rulesText}</p>
      </Sheet>

      <ConfirmSheet
        open={withdrawOpen}
        title="Me retirer du Challenge"
        message={candidacy?.seatNumber
          ? 'Votre place de candidat officiel ira au premier de la liste d’attente. Vous ne pourrez pas vous réinscrire à cette édition.'
          : 'Votre candidature sera retirée et vous ne pourrez pas vous réinscrire à cette édition.'}
        confirmLabel="Me retirer"
        danger
        busy={withdrawBusy}
        onConfirm={withdraw}
        onCancel={() => setWithdrawOpen(false)}
      >
        {withdrawError && <p role="alert" className="mt-3 text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{withdrawError}</p>}
      </ConfirmSheet>
    </div>
  );
}
