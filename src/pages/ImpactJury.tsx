import { useCallback, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, JusticeScale01Icon, MinusSignIcon, PlusSignIcon } from '@hugeicons/core-free-icons';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { Sheet } from '../components/relance/ui/Sheet';
import AuthenticatorCodeField, { codeLooksComplete } from '../components/security/AuthenticatorCodeField';
import AuthenticatorRequiredNotice from '../components/security/AuthenticatorRequiredNotice';
import { IMPACT_PROJECT_FIELDS, type ImpactJuryEdition, type ImpactJuryScore } from '../types/impact';
import { MEDALS, dateTime, rankLabel, score as fmt } from '../components/impact/stages';
import { sbcApiService } from '../services/SBCApiService';
import { useBlockRemoteControl } from '../services/remoteAssist';
import { ImpactApiError, impactData, impactKeys, useImpactJury } from '../hooks/useImpactCandidate';
import { sectionRise, sequence } from '../utils/motion';
import { cn } from '../lib/utils';

type Finalist = ImpactJuryEdition['finalists'][number];
type Payload = { scores: Record<string, number>; comment?: string };
type Outcome =
  | { kind: 'saved'; score: ImpactJuryScore }
  | { kind: 'error'; message: string; field?: string }
  | { kind: 'cancelled' };

const card = 'bg-surface border border-border rounded-card p-4';
const RELOAD = ['JURY_LOCKED', 'WRONG_STAGE', 'STALE', 'NOT_A_JUROR', 'NOT_A_FINALIST'];

/** Half points, within 0..max. */
const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v * 2) / 2));

function Stepper({ id, label, max, value, onChange, error }: {
  id: string; label: string; max: number; value: number; onChange: (v: number) => void; error?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        <span className="text-sm font-bold text-ink tabular-nums" data-testid={`${id}-value`}>{fmt(value)} / {max}</span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <button type="button" onClick={() => onChange(clamp(value - 0.5, max))} disabled={value <= 0}
          aria-label={`${label} : un demi-point de moins`}
          className="size-11 shrink-0 grid place-items-center rounded-pill border border-border text-ink disabled:opacity-40">
          <HugeiconsIcon icon={MinusSignIcon} size={18} />
        </button>
        <input id={id} type="range" min={0} max={max} step={0.5} value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value), max))}
          aria-invalid={!!error} aria-valuetext={`${fmt(value)} sur ${max}`}
          className="flex-1 accent-primary h-11" />
        <button type="button" onClick={() => onChange(clamp(value + 0.5, max))} disabled={value >= max}
          aria-label={`${label} : un demi-point de plus`}
          className="size-11 shrink-0 grid place-items-center rounded-pill border border-border text-ink disabled:opacity-40">
          <HugeiconsIcon icon={PlusSignIcon} size={18} />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function ScoreForm({ j, f, onSave }: { j: ImpactJuryEdition; f: Finalist; onSave: (p: Payload) => Promise<Outcome> }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(j.criteria.map((c) => [c.key, clamp(f.myScore?.scores?.[c.key] ?? 0, c.max)])));
  const [comment, setComment] = useState(f.myScore?.comment ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const total = j.criteria.reduce((s, c) => s + (values[c.key] ?? 0), 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    setErrors({});
    setSaved(false);
    const out = await onSave({ scores: values, ...(comment.trim() ? { comment: comment.trim() } : {}) });
    setBusy(false);
    if (out.kind === 'saved') setSaved(true);
    else if (out.kind === 'error') {
      const key = out.field?.startsWith('scores.') ? out.field.slice(7) : null;
      if (key) setErrors({ [key]: out.message });
      else setFormError(out.message);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4" aria-label={`Noter ${f.profile.name}`}>
      {j.criteria.map((c) => (
        <Stepper key={c.key} id={`score-${f._id}-${c.key}`} label={c.label} max={c.max} value={values[c.key] ?? 0} error={errors[c.key]}
          onChange={(v) => { setValues((cur) => ({ ...cur, [c.key]: v })); setSaved(false); setErrors((cur) => ({ ...cur, [c.key]: '' })); }} />
      ))}
      <p className="flex items-center justify-between bg-surface-2 rounded-tile px-3 py-2.5">
        <span className="text-sm font-semibold text-ink">Total</span>
        <span className="text-lg font-bold text-ink tabular-nums" data-testid={`total-${f._id}`}>{fmt(total)} / {j.maxTotal}</span>
      </p>
      <div>
        <label htmlFor={`comment-${f._id}`} className="block text-sm font-medium text-ink mb-1">Commentaire (facultatif)</label>
        <textarea id={`comment-${f._id}`} rows={3} maxLength={1000} value={comment}
          onChange={(e) => { setComment(e.target.value); setSaved(false); }}
          className="w-full rounded-tile border border-border bg-surface px-3 py-2 text-[15px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
      </div>
      {formError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{formError}</p>}
      {saved && (
        <p role="status" className="text-sm text-success font-semibold flex items-center gap-1.5">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
          Note enregistrée.
        </p>
      )}
      <motion.button type="submit" whileTap={busy ? undefined : { scale: 0.98 }} disabled={busy}
        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60">
        {busy ? 'Enregistrement…' : 'Enregistrer'}
      </motion.button>
    </form>
  );
}

function ReadOnlyMarks({ j, f }: { j: ImpactJuryEdition; f: Finalist }) {
  const s = f.myScore;
  if (!s) return <p className="text-sm text-ink-3">Vous n’avez pas noté ce finaliste.</p>;
  return (
    <dl className="flex flex-col gap-1.5" data-testid={`marks-${f._id}`}>
      {j.criteria.map((c) => (
        <div key={c.key} className="flex justify-between gap-2 text-sm">
          <dt className="text-ink-2">{c.label}</dt>
          <dd className="font-semibold text-ink tabular-nums">{fmt(s.scores?.[c.key] ?? 0)} / {c.max}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-2 border-t border-border pt-1.5">
        <dt className="font-semibold text-ink">Total</dt>
        <dd className="font-bold text-ink tabular-nums">{fmt(s.total)} / {j.maxTotal}</dd>
      </div>
      {s.comment && <p className="text-sm text-ink-2 whitespace-pre-line mt-1">{s.comment}</p>}
    </dl>
  );
}

function FinalistPanel({ j, f, onStage, onSave }: { j: ImpactJuryEdition; f: Finalist; onStage: boolean; onSave: (p: Payload) => Promise<Outcome> }) {
  const p = f.profile;
  const poster = sbcApiService.generateThumbnailUrl(p.photoFileId, 768);
  const videoId = f.video?.video?.videoFileId;
  const projectVideoId = f.project?.project?.videoFileId;
  return (
    <motion.section variants={sectionRise} aria-label={p.name} className={cn(card, 'flex flex-col gap-4', onStage && 'border-danger ring-2 ring-danger/30')}>
      <div className="flex items-center gap-3">
        <img src={sbcApiService.generateThumbnailUrl(p.photoFileId, 192)} alt="" className="size-16 rounded-pill object-cover bg-surface-2 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {onStage && <span className="text-[11px] font-bold text-white bg-danger rounded-pill px-2 py-0.5">En scène</span>}
            {f.rank && <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 rounded-pill px-2 py-0.5">{MEDALS[f.rank] ?? ''} TOP 3 : {rankLabel(f.rank)}</span>}
          </div>
          <h2 className="font-bold text-ink text-lg leading-tight truncate">{p.name}</h2>
          <p className="text-sm text-primary font-semibold truncate">{p.projectName}</p>
          <p className="text-xs text-ink-3 truncate">{[p.activity, p.city, p.country].filter(Boolean).join(' · ')}</p>
        </div>
      </div>

      <details className="group">
        <summary className="text-sm font-semibold text-primary cursor-pointer select-none">Voir le projet et la vidéo</summary>
        <div className="flex flex-col gap-3 mt-3">
          {p.projectDescription && <p className="text-sm text-ink-2 whitespace-pre-line">{p.projectDescription}</p>}
          {videoId && (
            <video src={sbcApiService.generateSettingsFileUrl(videoId)} poster={poster} controls playsInline preload="none"
              aria-label={`Vidéo « Ma vision de SBC » de ${p.name}`} className="w-full max-h-[60vh] rounded-tile bg-black" />
          )}
          {projectVideoId && (
            <video src={sbcApiService.generateSettingsFileUrl(projectVideoId)} poster={poster} controls playsInline preload="none"
              aria-label={`Vidéo du projet ${p.projectName}`} className="w-full max-h-[60vh] rounded-tile bg-black" />
          )}
          {f.project?.project && (
            <dl className="flex flex-col gap-3">
              {IMPACT_PROJECT_FIELDS.map((h) => (
                <div key={h.key}>
                  <dt className="text-sm font-semibold text-ink">{h.label}</dt>
                  <dd className="text-sm text-ink-2 whitespace-pre-line mt-0.5">{f.project!.project![h.key]}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </details>

      <div className="border-t border-border pt-3 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink-2">Ma note</h3>
          {f.myScore && (
            <span className="text-xs text-ink-3" data-testid={`edits-${f._id}`}>
              {f.myScore.edits > 0 ? `Modifié ${f.myScore.edits} fois · ` : ''}enregistrée le {dateTime(f.myScore.updatedAt)}
            </span>
          )}
        </div>
        {j.canScore
          ? <ScoreForm key={`${f._id}-${f.myScore?.updatedAt ?? 'new'}`} j={j} f={f} onSave={onSave} />
          : <ReadOnlyMarks j={j} f={f} />}
      </div>
    </motion.section>
  );
}

const readOnlyNote = (j: ImpactJuryEdition) =>
  j.lockedAt ? `Les notes sont verrouillées depuis le ${dateTime(j.lockedAt)} : elles ne peuvent plus changer.`
    : j.edition.stage === 'RESULT' || j.edition.status === 'FINISHED' ? 'La finale est terminée : les notes ne changent plus.'
      : 'La notation s’ouvrira au début de la finale en direct. Vous pouvez déjà découvrir les projets.';

/** The juror's space: the finalists, their projects, and the juror's own marks (authenticator code once per 30 min). */
export default function ImpactJury() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const jury = useImpactJury();
  const list = jury.data ?? [];
  // A juror's marks must never be operated remotely.
  useBlockRemoteControl(list.some((j) => j.canScore));

  // The code sheet: the save waiting for the authenticator code, and how to finish it.
  const waiting = useRef<{ editionId: string; candidateId: string; payload: Payload; resolve: (o: Outcome) => void } | null>(null);
  const [sheet, setSheet] = useState<null | 'code' | 'setup'>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  useBlockRemoteControl(!!sheet);

  const putScore = useCallback((editionId: string, candidateId: string, s: ImpactJuryScore) => {
    queryClient.setQueryData<ImpactJuryEdition[]>(impactKeys.jury, (cur) => cur?.map((j) => j.edition._id !== editionId ? j : {
      ...j,
      codeWindowOpen: true,
      finalists: j.finalists.map((f) => (f._id === candidateId ? { ...f, myScore: s } : f)),
    }));
  }, [queryClient]);

  const send = async (editionId: string, candidateId: string, payload: Payload, authCode?: string): Promise<ImpactJuryScore> =>
    impactData<ImpactJuryScore>(
      await sbcApiService.impactJuryScore(editionId, candidateId, authCode ? { ...payload, authCode } : payload),
      'La note n’a pas pu être enregistrée. Réessayez.',
    );

  const failed = (err: unknown): Outcome => {
    const e = err as ImpactApiError;
    if (e?.code && RELOAD.includes(e.code)) jury.refetch();
    return { kind: 'error', message: e?.message || 'La note n’a pas pu être enregistrée. Réessayez.', field: typeof e?.details?.field === 'string' ? e.details.field : undefined };
  };

  const save = (editionId: string, candidateId: string) => async (payload: Payload): Promise<Outcome> => {
    try {
      const s = await send(editionId, candidateId, payload);
      putScore(editionId, candidateId, s);
      return { kind: 'saved', score: s };
    } catch (err) {
      const e = err as ImpactApiError;
      if (e?.code === 'AUTH_CODE_REQUIRED' || e?.code === 'AUTHENTICATOR_REQUIRED') {
        setCode('');
        setCodeError('');
        setSheet(e.code === 'AUTH_CODE_REQUIRED' ? 'code' : 'setup');
        return new Promise<Outcome>((resolve) => { waiting.current = { editionId, candidateId, payload, resolve }; });
      }
      return failed(err);
    }
  };

  const finish = (o: Outcome) => {
    waiting.current?.resolve(o);
    waiting.current = null;
    setSheet(null);
  };

  const confirmCode = async () => {
    const w = waiting.current;
    if (!w) return;
    setCodeBusy(true);
    setCodeError('');
    try {
      const s = await send(w.editionId, w.candidateId, w.payload, code.trim());
      putScore(w.editionId, w.candidateId, s);
      finish({ kind: 'saved', score: s });
    } catch (err) {
      const e = err as ImpactApiError;
      if (e?.code === 'AUTH_CODE_INVALID' || e?.status === 429) {
        setCodeError(e.message || 'Code incorrect.');
        setCode('');
      } else if (e?.code === 'AUTHENTICATOR_REQUIRED') {
        setSheet('setup');
      } else {
        finish(failed(err));
      }
    } finally {
      setCodeBusy(false);
    }
  };

  let body;
  if (jury.isLoading) {
    body = (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de l’espace jury">
        <Skeleton height="h-28" rounded="rounded-card" />
        <Skeleton height="h-96" rounded="rounded-card" />
      </div>
    );
  } else if (jury.isError) {
    body = (
      <div className="bg-danger-soft text-danger rounded-card p-4 flex flex-col gap-3" role="alert">
        <p className="text-sm">{(jury.error as Error)?.message || 'Impossible de charger votre espace jury.'}</p>
        <button type="button" onClick={() => jury.refetch()} className="self-start bg-surface text-ink font-semibold text-sm rounded-pill px-4 py-2 border border-border">
          Réessayer
        </button>
      </div>
    );
  } else if (list.length === 0) {
    body = (
      <section className={cn(card, 'p-6 flex flex-col items-center text-center gap-3')}>
        <span className="size-14 grid place-items-center rounded-pill bg-primary-soft text-primary">
          <HugeiconsIcon icon={JusticeScale01Icon} size={28} />
        </span>
        <h2 className="text-lg font-bold text-ink">Vous ne faites partie d’aucun jury</h2>
        <p className="text-sm text-ink-2">Les membres du jury de la finale du SBC Impact Challenge sont choisis par l’équipe SBC, qui les prévient.</p>
      </section>
    );
  } else {
    body = (
      <motion.div variants={sequence} initial="hidden" animate="show" className="flex flex-col gap-6">
        {list.map((j) => {
          const finalists = [...j.finalists].sort((a, b) =>
            (a._id === j.onStageCandidateId ? -1 : 0) - (b._id === j.onStageCandidateId ? -1 : 0) || (a.rank ?? 9) - (b.rank ?? 9));
          return (
            <div key={j.edition._id} className="flex flex-col gap-4">
              <motion.section variants={sectionRise} className="bg-primary text-white rounded-card p-4 flex flex-col gap-2">
                <span className="self-start text-[11px] font-semibold uppercase tracking-wide bg-white/15 rounded-pill px-2.5 py-1">Espace jury</span>
                <h2 className="text-xl font-bold leading-tight">{j.edition.name}</h2>
                <p className="text-sm text-white/85">
                  {j.criteria.map((c) => `${c.label} (/${c.max})`).join(' · ')} · total sur {j.maxTotal}, par demi-point.
                </p>
              </motion.section>
              {j.canScore ? (
                <motion.p variants={sectionRise} className="text-sm text-ink-2 bg-surface-2 rounded-card px-4 py-3">
                  {j.codeWindowOpen
                    ? 'La notation est ouverte. Vous pouvez enregistrer et corriger vos notes jusqu’au verrouillage.'
                    : 'La notation est ouverte. Au premier enregistrement, le code de votre application d’authentification vous sera demandé (il vaut 30 minutes).'}
                </motion.p>
              ) : (
                <motion.p variants={sectionRise} role="status" className="text-sm text-ink bg-accent-soft rounded-card px-4 py-3" data-testid="jury-read-only">
                  {readOnlyNote(j)}
                </motion.p>
              )}
              {finalists.map((f) => (
                <FinalistPanel key={f._id} j={j} f={f} onStage={f._id === j.onStageCandidateId} onSave={save(j.edition._id, f._id)} />
              ))}
            </div>
          );
        })}
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold text-ink">Espace jury</h1>
      </div>
      <div className="px-4 pb-10 max-w-2xl mx-auto">{body}</div>

      <Sheet
        open={sheet !== null}
        onClose={() => !codeBusy && finish({ kind: 'cancelled' })}
        title={sheet === 'setup' ? 'Application d’authentification' : 'Confirmez avec votre code'}
        footer={sheet === 'code' ? (
          <button type="button" onClick={confirmCode} disabled={codeBusy || !codeLooksComplete(code)}
            className="w-full h-12 rounded-pill bg-primary text-white font-semibold disabled:opacity-60">
            {codeBusy ? 'Vérification…' : 'Valider et enregistrer'}
          </button>
        ) : undefined}
      >
        {sheet === 'code' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-2">Vos notes sont protégées : tapez le code de votre application d’authentification. Il reste valable 30 minutes pour les notes suivantes.</p>
            <AuthenticatorCodeField id="jury-auth-code" value={code} onChange={(v) => { setCode(v); setCodeError(''); }} />
            {codeError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{codeError}</p>}
          </div>
        )}
        {sheet === 'setup' && (
          <AuthenticatorRequiredNotice action="noter les finalistes" onReady={() => { setCode(''); setSheet('code'); }} />
        )}
      </Sheet>
    </div>
  );
}
