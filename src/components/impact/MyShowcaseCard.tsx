import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Camera01Icon, StarIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { shrinkPhoto } from '../../pages/help/identity';
import { inputCls } from '../../pages/help/styles';
import { ImpactApiError, impactData } from '../../hooks/useImpactCandidate';
import { showcaseKeys, useMyShowcase } from '../../hooks/useImpactShowcase';
import type { ImpactMyShowcasePage, ImpactShowcaseKind, ImpactShowcaseUpdate } from '../../types/impact';
import { SHOWCASE_KIND, day } from './stages';
import { cn } from '../../lib/utils';

const card = 'bg-surface border border-border rounded-card p-4';
const fieldCls = (bad?: string) => cn(inputCls, bad && 'border-danger');
const KINDS = Object.keys(SHOWCASE_KIND) as ImpactShowcaseKind[];
const TITLE: [number, number] = [3, 120];
const BODY: [number, number] = [20, 3000];

const STATUS: Record<NonNullable<ImpactShowcaseUpdate['status']>, { label: string; tone: string }> = {
  PENDING: { label: 'En attente de validation', tone: 'bg-primary-soft text-primary' },
  PUBLISHED: { label: 'Publiée', tone: 'bg-success-soft text-success' },
  REJECTED: { label: 'Refusée', tone: 'bg-danger-soft text-danger' },
};

const isHttps = (s: string) => {
  try { return new URL(s).protocol === 'https:'; } catch { return false; }
};

function NewsForm({ page, onDone, onCancel }: { page: ImpactMyShowcasePage; onDone: (u: ImpactShowcaseUpdate) => void; onCancel: () => void }) {
  const uid = useId();
  const [kind, setKind] = useState<ImpactShowcaseKind>('NEWS');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [imageFileId, setImageFileId] = useState('');
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const pickImage = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    setErrors((c) => ({ ...c, imageFileId: '' }));
    setUploading(true);
    try {
      const blob = await shrinkPhoto(file);
      const up = await sbcApiService.uploadFile(blob instanceof File ? blob : new File([blob], 'nouvelle.jpg', { type: blob.type || 'image/jpeg' }));
      const id = up.body?.data?.fileId;
      if (!up.isSuccessByStatusCode || !id) throw new Error('L’image n’a pas pu être envoyée. Réessayez.');
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '';
      setPreview(objectUrl.current ?? '');
      setImageFileId(id);
    } catch (err) {
      setErrors((c) => ({ ...c, imageFileId: (err as Error).message || 'L’image n’a pas pu être envoyée. Réessayez.' }));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    const found: Record<string, string> = {};
    const t = title.trim();
    const b = body.trim();
    const l = link.trim();
    if (t.length < TITLE[0] || t.length > TITLE[1]) found.title = `Titre : ${TITLE[0]} à ${TITLE[1]} caractères.`;
    if (b.length < BODY[0] || b.length > BODY[1]) found.body = `Texte : ${BODY[0]} à 3 000 caractères.`;
    if (l && !isHttps(l)) found.link = 'Le lien doit commencer par https://.';
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const u = impactData<ImpactShowcaseUpdate>(await sbcApiService.impactProposeShowcaseUpdate(page._id, {
        kind, title: t, body: b, ...(imageFileId ? { imageFileId } : {}), ...(l ? { link: l } : {}),
      }), 'La nouvelle n’a pas pu être envoyée. Réessayez.');
      onDone(u);
    } catch (err) {
      const ae = err as ImpactApiError;
      const field = (ae.code === 'INVALID_UPDATE' || ae.code === 'INVALID_URL') && typeof ae.details?.field === 'string' ? ae.details.field : null;
      if (field) setErrors({ [field]: ae.message });
      else setFormError(ae.message || 'La nouvelle n’a pas pu être envoyée. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  const id = (k: string) => `${uid}-${k}`;
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-3 border-t border-border pt-3" aria-label="Publier une nouvelle">
      <div>
        <label htmlFor={id('kind')} className="block text-sm font-medium text-ink mb-1">Type</label>
        <select id={id('kind')} value={kind} onChange={(e) => setKind(e.target.value as ImpactShowcaseKind)} className={cn(fieldCls(), 'h-11')}>
          {KINDS.map((k) => <option key={k} value={k}>{SHOWCASE_KIND[k]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={id('title')} className="block text-sm font-medium text-ink mb-1">Titre</label>
        <input id={id('title')} value={title} maxLength={TITLE[1]} onChange={(e) => { setTitle(e.target.value); setErrors((c) => ({ ...c, title: '' })); }}
          aria-invalid={!!errors.title} className={cn(fieldCls(errors.title), 'h-11')} />
        {errors.title && <p className="mt-1 text-xs text-danger">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor={id('body')} className="block text-sm font-medium text-ink mb-1">Texte</label>
        <textarea id={id('body')} rows={5} value={body} maxLength={BODY[1]} onChange={(e) => { setBody(e.target.value); setErrors((c) => ({ ...c, body: '' })); }}
          aria-invalid={!!errors.body} className={cn(fieldCls(errors.body), 'py-2')}
          placeholder="Une étape franchie, un nouveau produit, une réussite…" />
        <div className="flex justify-between gap-2">
          {errors.body ? <p className="mt-1 text-xs text-danger">{errors.body}</p> : <span />}
          <span className="mt-1 text-xs text-ink-3 tabular-nums">{body.trim().length}/{BODY[1]}</span>
        </div>
      </div>
      <div>
        <span id={id('image-label')} className="block text-sm font-medium text-ink mb-1">Image (facultatif)</span>
        <div className="flex items-center gap-3">
          <span className="size-16 shrink-0 rounded-tile overflow-hidden bg-surface-2 grid place-items-center text-ink-3 border border-border">
            {preview ? <img src={preview} alt="Aperçu de l’image" className="size-full object-cover" /> : <HugeiconsIcon icon={Camera01Icon} size={22} />}
          </span>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading}
            className="bg-surface-2 text-ink text-sm font-semibold rounded-pill px-4 py-2 disabled:opacity-60">
            {uploading ? 'Envoi de l’image…' : imageFileId ? 'Changer l’image' : 'Ajouter une image'}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-labelledby={id('image-label')}
            onChange={(e) => pickImage(e.target.files?.[0])} />
        </div>
        {errors.imageFileId && <p className="mt-1 text-xs text-danger">{errors.imageFileId}</p>}
      </div>
      <div>
        <label htmlFor={id('link')} className="block text-sm font-medium text-ink mb-1">Lien (facultatif)</label>
        <input id={id('link')} type="url" inputMode="url" placeholder="https://…" value={link}
          onChange={(e) => { setLink(e.target.value); setErrors((c) => ({ ...c, link: '' })); }}
          aria-invalid={!!errors.link} className={cn(fieldCls(errors.link), 'h-11')} />
        {errors.link && <p className="mt-1 text-xs text-danger">{errors.link}</p>}
      </div>
      {formError && <p role="alert" className="text-sm text-danger bg-danger-soft rounded-tile px-3 py-2">{formError}</p>}
      <button type="submit" disabled={busy || uploading} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-pill disabled:opacity-60">
        {busy ? 'Envoi…' : 'Envoyer la nouvelle'}
      </button>
      <button type="button" onClick={onCancel} disabled={busy} className="w-full text-sm text-ink-3 py-1">Annuler</button>
    </form>
  );
}

function MyPage({ page }: { page: ImpactMyShowcasePage }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const canPost = !page.archived && !page.hidden;
  const r = page.result;

  const done = (u: ImpactShowcaseUpdate) => {
    queryClient.setQueryData<ImpactMyShowcasePage[]>(showcaseKeys.mine, (cur) =>
      cur?.map((p) => (p._id === page._id ? { ...p, updates: [u, ...p.updates] } : p)));
    setOpen(false);
    setNotice('Nouvelle envoyée : elle sera publiée après validation par l’équipe SBC.');
  };

  return (
    <div className="flex flex-col gap-3" data-testid={`my-showcase-${page._id}`}>
      <p className="text-sm text-ink-2">
        {r.editionName} · {r.winner ? 'Gagnant' : `Finaliste · ${r.rank}e`} · visible jusqu’au {day(page.visibleUntil)}
      </p>
      {page.hidden && <p className="text-sm text-ink bg-accent-soft rounded-tile px-3 py-2">Votre page est masquée par l’équipe SBC pour le moment.</p>}
      {page.archived && <p className="text-sm text-ink-2 bg-surface-2 rounded-tile px-3 py-2">Votre page est aux archives : elle reste consultable, sans nouvelle publication.</p>}
      <div className="flex flex-wrap gap-2">
        {!page.hidden && (
          <Link to={`/impact/${encodeURIComponent(page._id)}`} className="text-sm font-semibold text-primary bg-primary-soft rounded-pill px-4 py-2">Voir ma page</Link>
        )}
        {canPost && !open && (
          <button type="button" onClick={() => { setNotice(''); setOpen(true); }} className="text-sm font-semibold text-white bg-primary rounded-pill px-4 py-2">
            Publier une nouvelle
          </button>
        )}
      </div>
      {notice && <p role="status" className="text-sm text-success bg-success-soft rounded-tile px-3 py-2">{notice}</p>}
      {open && <NewsForm page={page} onDone={done} onCancel={() => setOpen(false)} />}
      {page.updates.length > 0 && (
        <ul className="flex flex-col divide-y divide-border" aria-label="Mes nouvelles">
          {page.updates.map((u) => {
            const st = STATUS[u.status ?? 'PUBLISHED'];
            return (
              <li key={u._id} className="py-2.5 flex flex-col gap-1" data-testid="my-showcase-update">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-ink-2 bg-surface-2 rounded-pill px-2 py-0.5">{SHOWCASE_KIND[u.kind] ?? u.kind}</span>
                  <span className={cn('text-[11px] font-semibold rounded-pill px-2 py-0.5', st.tone)}>{st.label}</span>
                  {u.status === 'PUBLISHED' && u.publishedAt && <span className="text-xs text-ink-3">{day(u.publishedAt)}</span>}
                </div>
                <p className="text-sm font-semibold text-ink">{u.title}</p>
                {u.status === 'REJECTED' && u.review?.reason && (
                  <p className="text-sm text-ink bg-surface-2 rounded-tile px-3 py-2">{u.review.reason}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * « Ma page SBC Impact »: the finalist's showcase page(s), news to propose and their review.
 * Renders nothing for a member without a page.
 */
export default function MyShowcaseCard({ enabled = true, className }: { enabled?: boolean; className?: string }) {
  const mine = useMyShowcase({ enabled });
  const pages = mine.data ?? [];
  if (!enabled || !pages.length) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn(card, 'flex flex-col gap-3 border-accent', className)}
      aria-labelledby="my-showcase-title">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={StarIcon} size={20} className="text-accent" />
        <h2 id="my-showcase-title" className="text-lg font-bold text-ink">Ma page SBC Impact</h2>
      </div>
      <p className="text-sm text-ink-2">Votre projet reste à l’affiche dans l’espace SBC Impact. Racontez ses avancées : chaque nouvelle est publiée après validation.</p>
      {pages.map((p) => <MyPage key={p._id} page={p} />)}
    </motion.section>
  );
}
