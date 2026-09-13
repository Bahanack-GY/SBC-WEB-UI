import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, ImageAdd02Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { handleApiResponse } from '../../utils/apiHelpers';
import { INTENTION_LABELS, type LoveProfile, type LoveStatus } from '../../hooks/useSbcLove';
import LovePhoto from './LovePhoto';

// Mirrors the server-side limits (sbclove-service config). Kept as constants so
// the counters can show a limit before the server rejects the text. The photo
// counts come from /sbclove/status instead — they are the ones an admin tunes.
const MAX_DESCRIPTION = 300;
const MAX_OTHER_INTENTION = 80;
const MAX_DISPLAY_NAME = 50;

// The two photos a profile must carry, in order. The server can only count
// them; which is which is a promise this UI makes and moderation checks.
const REQUIRED_SLOTS = [
    { label: 'Portrait', hint: 'Visage bien visible' },
    { label: 'Photo en pied', hint: 'Corps entier' },
];

const STATUS_BADGE: Record<LoveProfile['status'], { label: string; className: string; hint: string }> = {
  pending: {
    label: 'En validation',
    className: 'bg-accent-soft text-accent',
    hint: "Votre profil est en cours de validation. Il sera visible dès qu'il sera approuvé.",
  },
  approved: {
    label: 'Approuvé',
    className: 'bg-success-soft text-success',
    hint: 'Votre profil est visible pendant les sessions et vous pouvez manifester un intérêt.',
  },
  rejected: {
    label: 'Refusé',
    className: 'bg-danger-soft text-danger',
    hint: "Votre profil a été refusé. Modifiez-le pour le soumettre à nouveau.",
  },
  suspended: {
    label: 'Suspendu',
    className: 'bg-danger-soft text-danger',
    hint: 'Votre profil est suspendu suite à des signalements. Contactez le support.',
  },
};

/**
 * "Mon profil" — create/edit + photos.
 *
 * Not window-gated (spec §2): members prepare their profile any day, the weekly
 * session only gates browsing and interests. Every edit sends the profile back
 * to the validation queue, which is why the status badge is next to the form.
 */
function LoveProfileForm({ profile, status }: { profile: LoveProfile | null; status?: LoveStatus }) {
  const minPhotos = status?.minPhotos ?? REQUIRED_SLOTS.length;
  const maxPhotos = status?.maxPhotos ?? 3;
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: profile?.displayName ?? '',
    intention: profile?.intention ?? 'faire_connaissance',
    otherIntentionText: profile?.otherIntentionText ?? '',
    description: profile?.description ?? '',
  });

  // The profile arrives after the first render (and again after each save), so
  // the fields have to pick up the server's version of the truth.
  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName ?? '',
        intention: profile.intention,
        otherIntentionText: profile.otherIntentionText ?? '',
        description: profile.description,
      });
    }
  }, [profile]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sbclove-my-profile'] });

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        displayName: form.displayName.trim() || undefined,
        intention: form.intention,
        otherIntentionText: form.intention === 'autre' ? form.otherIntentionText.trim() : undefined,
        description: form.description.trim(),
      };
      return handleApiResponse(
        profile
          ? await sbcApiService.updateLoveProfile(body)
          : await sbcApiService.createLoveProfile(body)
      );
    },
    onSuccess: () => {
      setError(null);
      setNotice('Profil enregistré. Il repasse en validation.');
      refresh();
    },
    onError: (e: Error) => { setNotice(null); setError(e.message); },
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => handleApiResponse(await sbcApiService.uploadLovePhotos(files)),
    onSuccess: () => { setError(null); setNotice('Photo(s) ajoutée(s).'); refresh(); },
    onError: (e: Error) => { setNotice(null); setError(e.message); },
  });

  const removePhoto = useMutation({
    mutationFn: async (fileId: string) => handleApiResponse(await sbcApiService.deleteLovePhoto(fileId)),
    onSuccess: () => { setError(null); refresh(); },
    onError: (e: Error) => { setNotice(null); setError(e.message); },
  });

  // Photos hang off an existing profile, so they can only be added after the
  // first save — the server has nowhere to attach them otherwise.
  const photos = profile?.photos ?? [];
  const missingPhotos = Math.max(0, minPhotos - photos.length);
  const badge = profile ? STATUS_BADGE[profile.status] : null;
  const busy = save.isPending || upload.isPending;

  return (
    <div className="space-y-4">
      {badge && (
        <div className="bg-surface border border-border rounded-card p-4">
          <span className={`inline-block text-xs font-semibold rounded-pill px-2 py-1 ${badge.className}`}>
            {badge.label}
          </span>
          <p className="text-sm text-ink-2 mt-2">{badge.hint}</p>
        </div>
      )}

      {error && <p className="bg-danger-soft text-danger text-sm rounded-card p-3">{error}</p>}
      {notice && <p className="bg-success-soft text-success text-sm rounded-card p-3">{notice}</p>}

      <form
        className="bg-surface border border-border rounded-card p-4 space-y-4"
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      >
        <label className="block">
          <span className="text-sm font-medium text-ink">Pseudo (optionnel)</span>
          <input
            value={form.displayName}
            maxLength={MAX_DISPLAY_NAME}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Votre prénom SBC par défaut"
            className="mt-1 w-full border border-border rounded-tile px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">Intention</span>
          <select
            value={form.intention}
            onChange={(e) => setForm({ ...form, intention: e.target.value })}
            className="mt-1 w-full border border-border rounded-tile px-3 py-2 text-sm bg-surface"
          >
            {Object.entries(INTENTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        {form.intention === 'autre' && (
          <label className="block">
            <span className="text-sm font-medium text-ink">Précisez votre intention</span>
            <input
              value={form.otherIntentionText}
              maxLength={MAX_OTHER_INTENTION}
              onChange={(e) => setForm({ ...form, otherIntentionText: e.target.value })}
              className="mt-1 w-full border border-border rounded-tile px-3 py-2 text-sm"
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium text-ink">Description</span>
          <textarea
            value={form.description}
            maxLength={MAX_DESCRIPTION}
            rows={4}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Parlez de vous, de ce que vous recherchez…"
            className="mt-1 w-full border border-border rounded-tile px-3 py-2 text-sm"
          />
          <span className="block text-xs text-ink-3 mt-1">
            {form.description.length}/{MAX_DESCRIPTION} — numéros, réseaux sociaux et liens sont interdits.
          </span>
        </label>

        <button
          type="submit"
          disabled={busy || form.description.trim().length === 0}
          className="w-full bg-primary text-white rounded-tile py-2.5 font-semibold text-sm disabled:opacity-50"
        >
          {save.isPending ? 'Enregistrement…' : profile ? 'Enregistrer les modifications' : 'Créer mon profil'}
        </button>
      </form>

      <div className="bg-surface border border-border rounded-card p-4">
        <h3 className="font-semibold text-ink text-sm">Photos ({photos.length}/{maxPhotos})</h3>
        <p className="text-xs text-ink-3 mt-1">
          {profile
            ? `${minPhotos} photos réelles minimum : un portrait et une photo en pied. Les membres sans profil approuvé ne voient qu’une version floutée.`
            : 'Créez d’abord votre profil, puis ajoutez vos photos — il ne sera validé qu’avec elles.'}
        </p>

        {profile && missingPhotos > 0 && (
          <p className="bg-accent-soft text-ink-2 text-xs rounded-tile p-2 mt-2">
            Encore {missingPhotos} photo(s) à ajouter : votre profil ne peut pas être approuvé avant.
          </p>
        )}

        {/* The first two tiles are named slots, so "un portrait et une photo en
            pied" is asked for explicitly instead of being buried in a sentence
            nobody reads. Extra photos land in the plain tiles after them. */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {Array.from({ length: maxPhotos }).map((_, i) => {
            const photo = photos[i];
            const slot = REQUIRED_SLOTS[i];

            if (photo) {
              return (
                <div key={photo.fileId} className="relative">
                  <LovePhoto url={photo.url} blurred={photo.blurred} className="aspect-square rounded-tile" />
                  {slot && (
                    <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white bg-black/55 rounded-pill px-1 py-0.5 text-center">
                      {slot.label}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label="Supprimer la photo"
                    onClick={() => removePhoto.mutate(photo.fileId)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-pill p-1"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              );
            }

            // Only the next empty slot is actionable: photos are appended in
            // order, so letting someone fill slot 3 before slot 2 would label
            // their photo wrong.
            const isNext = i === photos.length;
            return (
              <button
                key={`slot-${i}`}
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={!profile || !isNext || upload.isPending}
                className={`aspect-square rounded-tile border border-dashed grid place-items-center gap-1 p-1 text-center ${
                  isNext && profile ? 'border-primary text-primary' : 'border-border text-ink-3'
                } disabled:opacity-50`}
              >
                <HugeiconsIcon
                  icon={upload.isPending && isNext ? Loading03Icon : ImageAdd02Icon}
                  size={20}
                  className={upload.isPending && isNext ? 'animate-spin' : ''}
                />
                {slot ? (
                  <>
                    <span className="text-[10px] font-semibold leading-tight">{slot.label}</span>
                    <span className="text-[9px] leading-tight">{slot.hint}</span>
                  </>
                ) : (
                  <span className="text-[10px] leading-tight">Optionnelle</span>
                )}
              </button>
            );
          })}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, maxPhotos - photos.length);
            if (files.length) upload.mutate(files);
            e.target.value = '';
          }}
        />
      </div>

    </div>
  );
}

export default LoveProfileForm;
