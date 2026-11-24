import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, Link01Icon, Video01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { inputCls } from '../../pages/help/styles';
import { ImpactApiError, impactData } from '../../hooks/useImpactCandidate';
import { cn } from '../../lib/utils';
import {
  IMPACT_CAPTION_MAX, IMPACT_PROJECT_FIELDS, IMPACT_PROJECT_LIMITS,
  type ImpactProjectContent, type ImpactProjectKey, type ImpactSubmission,
} from '../../types/impact';
import { MAX_VIDEO_BYTES, MAX_VIDEO_LABEL } from './stages';

const card = 'bg-surface border border-border rounded-card p-4';
const fieldCls = (bad?: string) => cn(inputCls, bad && 'border-danger');

/** Codes after which the space must be read again (the state changed under the member). */
const RELOAD_CODES = ['SUBMISSIONS_CLOSED', 'STALE', 'ALREADY_ACCEPTED', 'SUBMISSION_REJECTED', 'NOT_ALLOWED', 'NO_COMPETITION'];

const STATE: Record<ImpactSubmission['status'], { label: string; tone: string }> = {
  PENDING: { label: 'En attente de validation', tone: 'bg-primary-soft text-primary' },
  ACCEPTED: { label: 'Validée et publiée', tone: 'bg-success-soft text-success' },
  REJECTED: { label: 'Refusée', tone: 'bg-danger-soft text-danger' },
  RESUBMIT_REQUESTED: { label: 'Nouvelle version demandée', tone: 'bg-accent-soft text-accent' },
};

function SubmissionState({ s, what }: { s: ImpactSubmission | null; what: string }) {
  if (!s) return <p className="text-sm text-ink-3">Pas encore envoyée.</p>;
  const st = STATE[s.status];
  return (
    <div className="flex flex-col gap-2">
      <p className={cn('self-start text-sm font-bold rounded-pill px-3 py-1', st.tone)} data-testid={`impact-${s.kind.toLowerCase()}-state`}>
        {st.label}{s.version > 1 ? ` · version ${s.version}` : ''}
      </p>
      {s.status === 'PENDING' && (
        <p className="text-sm text-ink-2">L’équipe SBC va examiner {what}. Vous pouvez la remplacer tant qu’elle n’a pas été examinée.</p>
      )}
      {s.status === 'ACCEPTED' && (
        <>
          <p className="text-sm text-ink-2">Elle est publiée sur votre page de candidat. Partagez-la pour récolter des votes !</p>
          {s.externalUrl && (
            <a href={s.externalUrl} target="_blank" rel="noopener noreferrer" className="self-start flex items-center gap-1.5 text-sm font-semibold text-primary py-1">
              <HugeiconsIcon icon={Link01Icon} size={16} />
              Voir la publication
            </a>
          )}
        </>
      )}
      {(s.status === 'REJECTED' || s.status === 'RESUBMIT_REQUESTED') && s.review?.reason && (
        <p className="text-sm text-ink bg-surface-2 rounded-tile px-3 py-2 whitespace-pre-line" data-testid={`impact-${s.kind.toLowerCase()}-reason`}>
          {s.review.reason}
        </p>
      )}
      {s.status === 'REJECTED' && (
        <p className="text-sm text-ink-2">Ce contenu ne peut plus être renvoyé. Pour toute question, contactez le support depuis « Aide ».</p>
      )}
    </div>
  );
}

/** Picks a video, checks it, uploads it at once and keeps its fileId. */
function VideoPicker({ fileId, onFileId, error, onError, optional, idBase }: {
  fileId: string; onFileId: (id: string) => void; error?: string; onError: (msg: string) => void; optional?: boolean; idBase: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    onError('');
    if (!file.type.startsWith('video/')) { onError('Choisissez un fichier vidéo.'); return; }
    if (file.size > MAX_VIDEO_BYTES) {
      onError(`La vidéo dépasse ${MAX_VIDEO_LABEL} (elle fait ${(file.size / 1_000_000).toFixed(0)} Mo). Raccourcissez-la ou compressez-la.`);
      return;
    }
    setUploading(true);
    try {
      const up = await sbcApiService.uploadFile(file);
      const id = up.body?.data?.fileId;
      if (!up.isSuccessByStatusCode || !id) throw new Error();
      setName(file.name);
      onFileId(id);
    } catch {
      onError('La vidéo n’a pas pu être envoyée. Vérifiez votre connexion et réessayez.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <span id={`${idBase}-label`} className="block text-sm font-medium text-ink mb-1">Vidéo{optional ? ' (facultatif)' : ''}</span>
      <div className="flex items-center gap-3">
        <span className={cn('size-12 shrink-0 grid place-items-center rounded-tile', fileId ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-3')}>
          <HugeiconsIcon icon={fileId ? CheckmarkCircle02Icon : Video01Icon} size={22} />
        </span>
        <div className="flex flex-col gap-1 min-w-0">
          <button type="button" onClick={() => input.current?.click()} disabled={uploading}
            aria-describedby={error ? `${idBase}-error` : undefined}
            className="self-start bg-surface-2 text-ink text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60">
            {uploading ? 'Envoi de la vidéo…' : fileId ? 'Changer la vidéo' : 'Choisir une vidéo'}
          </button>
          <span className="text-xs text-ink-3 truncate">
            {fileId ? (name ? `${name} · prête` : 'Vidéo déjà envoyée') : `MP4, MOV ou WebM · ${MAX_VIDEO_LABEL} maximum`}
          </span>
        </div>
        <input ref={input} type="file" accept="video/*" className="sr-only" tabIndex={-1} aria-labelledby={`${idBase}-label`}
          onChange={(e) => pick(e.target.files?.[0])} data-testid={`${idBase}-input`} />
      </div>
      {uploading && <p className="mt-1 text-xs text-ink-3">Gardez l’application ouverte pendant l’envoi.</p>}
      {error && <p id={`${idBase}-error`} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

function Shell({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn(card, 'flex flex-col gap-3')} aria-labelledby={id}>
      <div>
        <h2 id={id} className="text-lg font-bold text-ink">{title}</h2>
        <p className="text-sm text-ink-2 mt-1">{intro}</p>
      </div>
      {children}
    </motion.section>
  );
}

/** Whether the form is shown at once, behind a button, or not at all. */
const formMode = (s: ImpactSubmission | null, canSubmit: boolean): 'open' | 'button' | 'none' => {
  if (!canSubmit) return 'none';
  if (!s || s.status === 'RESUBMIT_REQUESTED') return 'open';
  if (s.status === 'PENDING') return 'button';
  return 'none';
};

const submitError = (err: unknown, onReload: () => void, setField: (k: string, m: string) => void, setForm: (m: string) => void) => {
  const e = err as ImpactApiError;
  const field = e?.code === 'INVALID_SUBMISSION' && typeof e.details?.field === 'string' ? e.details.field : null;
  if (field) setField(field, e.message);
  else setForm(e?.message || 'L’envoi a échoué. Réessayez.');
  if (e?.code && RELOAD_CODES.includes(e.code)) onReload();
};

// ---------- « Ma vision de SBC » ----------

export function VideoSubmissionCard({ submission, canSubmit, closedNote, onSubmitted, onReload }: {
  submission: ImpactSubmission | null;
  /** The member may send (or replace) it now: status and round allow it. */
  canSubmit: boolean;
  /** Why it can no longer be sent, when it is too late and nothing was sent. */
  closedNote?: string;
  onSubmitted: (s: ImpactSubmission) => void;
  onReload: () => void;
}) {
  const uid = useId();
  const mode = formMode(submission, canSubmit);
  const [open, setOpen] = useState(false);
  const [fileId, setFileId] = useState(submission?.video?.videoFileId ?? '');
  const [caption, setCaption] = useState(submission?.video?.caption ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!fileId) { setErrors({ videoFileId: 'Ajoutez la vidéo.' }); return; }
    if (caption.trim().length > IMPACT_CAPTION_MAX) { setErrors({ caption: `La légende fait ${IMPACT_CAPTION_MAX} caractères au maximum.` }); return; }
    setBusy(true);
    try {
      const s = impactData<ImpactSubmission>(
        await sbcApiService.impactSubmitVideo({ videoFileId: fileId, ...(caption.trim() ? { caption: caption.trim() } : {}) }),
        'L’envoi a échoué. Réessayez.',
      );
      setOpen(false);
      onSubmitted(s);
    } catch (err) {
      submitError(err, onReload, (k, m) => setErrors((cur) => ({ ...cur, [k]: m })), setFormError);
    } finally {
      setBusy(false);
    }
  };

  const showForm = mode === 'open' || (mode === 'button' && open);
  return (
    <Shell id={`${uid}-video`} title="Ma vidéo « Ma vision de SBC »"
      intro="Une courte vidéo où vous dites ce que SBC représente pour vous. Validée par l’équipe SBC, elle est publiée et compte pour le vote gratuit de la semaine 2.">
      <SubmissionState s={submission} what="votre vidéo" />
      {mode === 'none' && !submission && closedNote && <p className="text-sm text-ink-2">{closedNote}</p>}
      {mode === 'button' && !open && (
        <button type="button" onClick={() => setOpen(true)} className="w-full bg-surface-2 text-ink font-semibold py-3 rounded-pill">Remplacer ma vidéo</button>
      )}
      {showForm && (
        <form noValidate onSubmit={submit} className="flex flex-col gap-3" aria-label="Envoyer ma vidéo">
          <VideoPicker idBase={`${uid}-file`} fileId={fileId} onFileId={(id) => { setFileId(id); setErrors((c) => ({ ...c, videoFileId: '' })); }}
            error={errors.videoFileId} onError={(m) => setErrors((c) => ({ ...c, videoFileId: m }))} />
          <div>
            <label htmlFor={`${uid}-caption`} className="block text-sm font-medium text-ink mb-1">Légende (facultatif)</label>
            <textarea id={`${uid}-caption`} rows={3} maxLength={IMPACT_CAPTION_MAX} value={caption}
              onChange={(e) => { setCaption(e.target.value); setErrors((c) => ({ ...c, caption: '' })); }}
              aria-invalid={!!errors.caption} className={cn(fieldCls(errors.caption), 'py-2')} />
            <div className="flex justify-between gap-2">
              {errors.caption ? <p className="mt-1 text-xs text-danger">{errors.caption}</p> : <span />}
              <span className="mt-1 text-xs text-ink-3 tabular-nums">{caption.trim().length}/{IMPACT_CAPTION_MAX}</span>
            </div>
          </div>
          {formError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{formError}</p>}
          <button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60">
            {busy ? 'Envoi…' : submission?.status === 'RESUBMIT_REQUESTED' ? 'Envoyer la nouvelle version' : 'Envoyer ma vidéo'}
          </button>
          {mode === 'button' && <button type="button" onClick={() => setOpen(false)} disabled={busy} className="w-full text-sm text-ink-3 py-1">Annuler</button>}
        </form>
      )}
    </Shell>
  );
}

// ---------- « Mon projet » ----------

const emptyProject = (): Record<ImpactProjectKey, string> =>
  Object.fromEntries(IMPACT_PROJECT_FIELDS.map((f) => [f.key, ''])) as Record<ImpactProjectKey, string>;

export function ProjectSubmissionCard({ submission, canSubmit, closedNote, onSubmitted, onReload }: {
  submission: ImpactSubmission | null;
  canSubmit: boolean;
  closedNote?: string;
  onSubmitted: (s: ImpactSubmission) => void;
  onReload: () => void;
}) {
  const uid = useId();
  const mode = formMode(submission, canSubmit);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<ImpactProjectKey, string>>(() => {
    const v = emptyProject();
    for (const f of IMPACT_PROJECT_FIELDS) v[f.key] = submission?.project?.[f.key] ?? '';
    return v;
  });
  const [fileId, setFileId] = useState(submission?.project?.videoFileId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [min, max] = IMPACT_PROJECT_LIMITS;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const found: Record<string, string> = {};
    for (const f of IMPACT_PROJECT_FIELDS) {
      const len = values[f.key].trim().length;
      if (len < min) found[f.key] = `« ${f.label} » : au moins ${min} caractères.`;
      else if (len > max) found[f.key] = `« ${f.label} » : ${max} caractères au maximum.`;
    }
    setErrors(found);
    if (Object.keys(found).length) { setFormError('Vérifiez les rubriques signalées en rouge.'); return; }
    const body = Object.fromEntries(IMPACT_PROJECT_FIELDS.map((f) => [f.key, values[f.key].trim()])) as unknown as ImpactProjectContent;
    if (fileId) body.videoFileId = fileId;
    setBusy(true);
    try {
      const s = impactData<ImpactSubmission>(await sbcApiService.impactSubmitProject(body), 'L’envoi a échoué. Réessayez.');
      setOpen(false);
      onSubmitted(s);
    } catch (err) {
      submitError(err, onReload, (k, m) => { setErrors((cur) => ({ ...cur, [k]: m })); setFormError('Vérifiez les rubriques signalées en rouge.'); }, setFormError);
    } finally {
      setBusy(false);
    }
  };

  const showForm = mode === 'open' || (mode === 'button' && open);
  return (
    <Shell id={`${uid}-project`} title="Mon projet"
      intro="Présentez votre projet en 8 rubriques. Validé par l’équipe SBC, il est publié et compte pour les votes de la semaine 3.">
      <SubmissionState s={submission} what="votre projet" />
      {mode === 'none' && !submission && closedNote && <p className="text-sm text-ink-2">{closedNote}</p>}
      {mode === 'button' && !open && (
        <button type="button" onClick={() => setOpen(true)} className="w-full bg-surface-2 text-ink font-semibold py-3 rounded-pill">Modifier mon projet</button>
      )}
      {showForm && (
        <form noValidate onSubmit={submit} className="flex flex-col gap-4" aria-label="Envoyer mon projet">
          {IMPACT_PROJECT_FIELDS.map((f) => {
            const id = `${uid}-${f.key}`;
            const len = values[f.key].trim().length;
            return (
              <div key={f.key}>
                <label htmlFor={id} className="block text-sm font-medium text-ink mb-1">{f.label}</label>
                <textarea id={id} rows={4} maxLength={max} value={values[f.key]}
                  onChange={(e) => { const v = e.target.value; setValues((cur) => ({ ...cur, [f.key]: v })); setErrors((cur) => ({ ...cur, [f.key]: '' })); }}
                  aria-invalid={!!errors[f.key]} aria-describedby={errors[f.key] ? `${id}-error` : undefined}
                  className={cn(fieldCls(errors[f.key]), 'py-2')} />
                <div className="flex justify-between gap-2">
                  {errors[f.key] ? <p id={`${id}-error`} className="mt-1 text-xs text-danger">{errors[f.key]}</p> : <span />}
                  <span className={cn('mt-1 text-xs tabular-nums', len > 0 && len < min ? 'text-danger' : 'text-ink-3')}>
                    {len < min ? `${len}/${min} min.` : `${len}/${max}`}
                  </span>
                </div>
              </div>
            );
          })}
          <VideoPicker idBase={`${uid}-file`} optional fileId={fileId} onFileId={(id) => { setFileId(id); setErrors((c) => ({ ...c, videoFileId: '' })); }}
            error={errors.videoFileId} onError={(m) => setErrors((c) => ({ ...c, videoFileId: m }))} />
          {formError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{formError}</p>}
          <button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60">
            {busy ? 'Envoi…' : submission?.status === 'RESUBMIT_REQUESTED' ? 'Envoyer la nouvelle version' : 'Envoyer mon projet'}
          </button>
          {mode === 'button' && <button type="button" onClick={() => setOpen(false)} disabled={busy} className="w-full text-sm text-ink-3 py-1">Annuler</button>}
        </form>
      )}
    </Shell>
  );
}
