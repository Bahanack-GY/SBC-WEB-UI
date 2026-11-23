import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Camera01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { shrinkPhoto } from '../../pages/help/identity';
import { inputCls } from '../../pages/help/styles';
import { allCountries } from '../../utils/countriesData';
import { cn } from '../../lib/utils';
import { ImpactApiError } from '../../hooks/useImpactCandidate';
import { IMPACT_PROFILE_LIMITS as LIMITS, type ImpactEdition, type ImpactProfileInput } from '../../types/impact';
import { CONSENT_TEXT, LABELS, fieldFromServer, validateProfile, type Errors, type ProfileValues as Values, type TextKey } from './profile';

const fieldCls = (bad?: string) => cn(inputCls, bad && 'border-danger');

function Field({ id, label, error, hint, count, children }: {
  id: string; label: string; error?: string; hint?: ReactNode; count?: ReactNode; children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink mb-1">{label}</label>
      {hint && <p id={`${id}-hint`} className="text-xs text-ink-3 mb-1.5">{hint}</p>}
      {children}
      <div className="flex items-start justify-between gap-2">
        {error ? <p id={`${id}-error`} className="mt-1 text-xs text-danger">{error}</p> : <span />}
        {count && <span className="mt-1 text-xs text-ink-3 tabular-nums shrink-0">{count}</span>}
      </div>
    </div>
  );
}

/**
 * The candidate profile, for the first application and for later edits. Lengths
 * are checked here with the server's own limits; a field the server still refuses
 * (400 INVALID_PROFILE) gets its message next to it.
 */
export default function CandidateProfileForm({
  edition, mode, initial, onSubmit, onCancel,
}: {
  edition: ImpactEdition;
  mode: 'create' | 'edit';
  initial: Partial<ImpactProfileInput>;
  /** Throws an ImpactApiError when the server refuses. */
  onSubmit: (profile: ImpactProfileInput) => Promise<void>;
  onCancel: () => void;
}) {
  const uid = useId();
  const id = (k: string) => `${uid}-${k.replace(/\W/g, '-')}`;
  const [v, setV] = useState<Values>(() => ({
    name: initial.name ?? '',
    photoFileId: initial.photoFileId ?? '',
    country: initial.country ?? '',
    city: initial.city ?? '',
    activity: initial.activity ?? '',
    category: initial.category ?? '',
    projectName: initial.projectName ?? '',
    projectDescription: initial.projectDescription ?? '',
    presentation: initial.presentation ?? '',
    link: initial.link ?? '',
    extra: { ...(initial.extra ?? {}) },
  }));
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Photo: uploaded as soon as it is chosen, so the preview and the id are ready.
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(() => (initial.photoFileId ? sbcApiService.generateThumbnailUrl(initial.photoFileId, 256) : ''));
  const [uploading, setUploading] = useState(false);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((cur) => ({ ...cur, [k]: value }));
    setErrors((cur) => ({ ...cur, [k]: undefined }));
  };
  const setExtra = (key: string, value: string) => {
    setV((cur) => ({ ...cur, extra: { ...cur.extra, [key]: value } }));
    setErrors((cur) => ({ ...cur, [`extra.${key}`]: undefined }));
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setErrors((cur) => ({ ...cur, photoFileId: undefined }));
    setUploading(true);
    try {
      const blob = await shrinkPhoto(file);
      const upload = await sbcApiService.uploadFile(
        blob instanceof File ? blob : new File([blob], 'photo-candidat.jpg', { type: blob.type || 'image/jpeg' }),
      );
      const fileId = upload.body?.data?.fileId;
      if (!upload.isSuccessByStatusCode || !fileId) throw new Error('La photo n’a pas pu être envoyée. Réessayez.');
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = URL.createObjectURL(blob);
      setPreview(objectUrl.current);
      setV((cur) => ({ ...cur, photoFileId: fileId }));
    } catch (err) {
      setErrors((cur) => ({ ...cur, photoFileId: (err as Error)?.message || 'La photo n’a pas pu être envoyée. Réessayez.' }));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const found = validateProfile(v, edition, mode === 'create', consent);
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError('Vérifiez les champs signalés en rouge.');
      return;
    }
    const extra: Record<string, string> = {};
    for (const f of edition.settings.profileFields) {
      const val = (v.extra[f.key] || '').trim();
      if (val) extra[f.key] = val;
    }
    const profile: ImpactProfileInput = {
      name: v.name.trim(),
      photoFileId: v.photoFileId,
      country: v.country.trim(),
      city: v.city.trim(),
      activity: v.activity.trim(),
      category: v.category.trim(),
      projectName: v.projectName.trim(),
      projectDescription: v.projectDescription.trim(),
      presentation: v.presentation.trim(),
      ...(v.link.trim() ? { link: v.link.trim() } : {}),
      extra,
    };
    setBusy(true);
    try {
      await onSubmit(profile);
    } catch (err) {
      const apiErr = err instanceof ImpactApiError ? err : null;
      const field = apiErr?.code === 'INVALID_PROFILE' ? fieldFromServer(apiErr.details?.field, edition) : null;
      const message = (err as Error)?.message || 'L’envoi a échoué. Réessayez.';
      if (field) {
        setErrors((cur) => ({ ...cur, [field]: message }));
        setFormError('Vérifiez les champs signalés en rouge.');
      } else {
        setFormError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const text = (k: Exclude<TextKey, 'category' | 'link' | 'projectDescription' | 'presentation'>, extra: { autoComplete?: string; list?: string; placeholder?: string } = {}) => (
    <Field id={id(k)} label={LABELS[k]} error={errors[k]}>
      <input
        id={id(k)}
        value={v[k]}
        maxLength={LIMITS[k][1]}
        onChange={(e) => set(k, e.target.value)}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `${id(k)}-error` : undefined}
        className={cn(fieldCls(errors[k]), 'h-11')}
        {...extra}
      />
    </Field>
  );

  const area = (k: 'projectDescription' | 'presentation', rows: number, hint?: string, placeholder?: string) => {
    const [min, max] = LIMITS[k];
    const len = v[k].trim().length;
    return (
      <Field id={id(k)} label={LABELS[k]} error={errors[k]} hint={hint}
        count={<span className={cn(len > 0 && len < min && 'text-danger')}>{len < min ? `${len}/${min} min.` : `${len}/${max}`}</span>}>
        <textarea
          id={id(k)}
          value={v[k]}
          rows={rows}
          maxLength={max}
          placeholder={placeholder}
          onChange={(e) => set(k, e.target.value)}
          aria-invalid={!!errors[k]}
          aria-describedby={[hint ? `${id(k)}-hint` : '', errors[k] ? `${id(k)}-error` : ''].filter(Boolean).join(' ') || undefined}
          className={cn(fieldCls(errors[k]), 'py-2')}
        />
      </Field>
    );
  };

  const cats = edition.settings.categories;

  return (
    <motion.form
      noValidate
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label={mode === 'create' ? 'Profil de candidat' : 'Modifier mon profil'}
      className="bg-surface border border-border rounded-card p-4 flex flex-col gap-4"
    >
      <div>
        <h2 className="text-lg font-bold text-ink">{mode === 'create' ? 'Mon profil de candidat' : 'Modifier mon profil'}</h2>
        <p className="text-sm text-ink-2 mt-1">
          {mode === 'create'
            ? 'Ces informations seront présentées aux membres pendant le Challenge. Soignez-les : elles donnent envie de voter pour vous.'
            : 'Après une modification, l’équipe SBC vérifie à nouveau votre profil.'}
        </p>
      </div>

      {text('name', { autoComplete: 'name' })}

      <div>
        <span className="block text-sm font-medium text-ink mb-1" id={id('photo-label')}>Photo</span>
        <div className="flex items-center gap-3">
          <span className="size-20 shrink-0 rounded-pill overflow-hidden bg-surface-2 grid place-items-center text-ink-3 border border-border">
            {preview
              ? <img src={preview} alt="Aperçu de votre photo" className="size-full object-cover" />
              : <HugeiconsIcon icon={Camera01Icon} size={28} />}
          </span>
          <div className="flex flex-col gap-1 min-w-0">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              aria-describedby={errors.photoFileId ? `${id('photo')}-error` : undefined}
              className="self-start bg-surface-2 text-ink text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60"
            >
              {uploading ? 'Envoi de la photo…' : preview ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            <span className="text-xs text-ink-3">Une photo nette de votre visage, bien éclairée.</span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-labelledby={id('photo-label')}
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
        </div>
        {errors.photoFileId && <p id={`${id('photo')}-error`} className="mt-1 text-xs text-danger">{errors.photoFileId}</p>}
      </div>

      <datalist id={id('countries')}>
        {allCountries.map((c) => <option key={c.code} value={c.value} />)}
      </datalist>
      {text('country', { autoComplete: 'country-name', list: id('countries') })}
      {text('city', { autoComplete: 'address-level2' })}
      {text('activity', { placeholder: 'Ex. : commerçante, couturier, agriculteur…' })}

      <Field id={id('category')} label={LABELS.category} error={errors.category}>
        {cats.length ? (
          <select
            id={id('category')}
            value={v.category}
            onChange={(e) => set('category', e.target.value)}
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? `${id('category')}-error` : undefined}
            className={cn(fieldCls(errors.category), 'h-11')}
          >
            <option value="">Choisir…</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <input
            id={id('category')}
            value={v.category}
            maxLength={LIMITS.category[1]}
            placeholder="Ex. : agriculture, mode, numérique…"
            onChange={(e) => set('category', e.target.value)}
            aria-invalid={!!errors.category}
            aria-describedby={errors.category ? `${id('category')}-error` : undefined}
            className={cn(fieldCls(errors.category), 'h-11')}
          />
        )}
      </Field>

      {text('projectName')}
      {area('projectDescription', 4, undefined, 'Votre projet en quelques phrases.')}
      {area('presentation', 8, 'Expliquez le problème que vous résolvez, votre solution, votre clientèle et l’impact de votre projet.')}

      <Field id={id('link')} label={`${LABELS.link} (facultatif)`} error={errors.link}>
        <input
          id={id('link')}
          type="url"
          inputMode="url"
          value={v.link}
          maxLength={LIMITS.link[1]}
          placeholder="https://…"
          onChange={(e) => set('link', e.target.value)}
          aria-invalid={!!errors.link}
          aria-describedby={errors.link ? `${id('link')}-error` : undefined}
          className={cn(fieldCls(errors.link), 'h-11')}
        />
      </Field>

      {edition.settings.profileFields.map((f) => {
        const key = `extra.${f.key}`;
        const long = f.maxLength > 160;
        const props = {
          id: id(key),
          value: v.extra[f.key] ?? '',
          maxLength: f.maxLength,
          'aria-invalid': !!errors[key],
          'aria-describedby': errors[key] ? `${id(key)}-error` : undefined,
        };
        return (
          <Field key={f.key} id={id(key)} label={f.required ? f.label : `${f.label} (facultatif)`} error={errors[key]}>
            {long ? (
              <textarea {...props} rows={3} onChange={(e) => setExtra(f.key, e.target.value)} className={cn(fieldCls(errors[key]), 'py-2')} />
            ) : (
              <input {...props} onChange={(e) => setExtra(f.key, e.target.value)} className={cn(fieldCls(errors[key]), 'h-11')} />
            )}
          </Field>
        );
      })}

      {mode === 'create' && (
        <div>
          <label className="flex items-start gap-3 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => { setConsent(e.target.checked); setErrors((cur) => ({ ...cur, consent: undefined })); }}
              aria-invalid={!!errors.consent}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>{CONSENT_TEXT}</span>
          </label>
          {errors.consent && <p className="mt-1 text-xs text-danger">{errors.consent}</p>}
        </div>
      )}

      {formError && (
        <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{formError}</p>
      )}

      <div className="flex flex-col gap-2">
        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={busy || uploading}
          className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60"
        >
          {busy ? 'Envoi…' : mode === 'create' ? 'Envoyer ma candidature' : 'Enregistrer'}
        </motion.button>
        <button type="button" onClick={onCancel} disabled={busy} className="w-full text-sm text-ink-3 py-2">
          Annuler
        </button>
      </div>
    </motion.form>
  );
}
