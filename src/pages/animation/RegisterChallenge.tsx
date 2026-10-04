import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, CheckmarkCircle02Icon, Image01Icon, Video01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { CANDIDATE_STATUS, challengePath, countdown, errorMessage, info } from '../../lib/animation';
import { TONE_CLASS } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const MAX_VIDEO_MB = 30;
const MAX_PHOTO_MB = 10;
const TICKET_CODES = ['TICKET_REQUIRED', 'TICKET_TYPE_REQUIRED'];

const ERRORS: Record<string, string> = {
    REGISTRATION_CLOSED: 'Les inscriptions ne sont pas ouvertes.',
    CHALLENGE_FULL: 'Toutes les places de ce défi sont prises.',
    ALREADY_REGISTERED: 'Vous êtes déjà inscrit à ce défi.',
    PHOTO_REQUIRED: 'Une photo est obligatoire pour ce défi.',
    DISQUALIFIED: 'Vous avez été disqualifié de ce défi.',
    JUROR_CANNOT_COMPETE: 'Un membre du jury ne peut pas concourir dans ce défi.',
};

const inputClass = 'w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary';

export default function RegisterChallenge() {
    const { slug = '', cslug = '' } = useParams<{ slug: string; cslug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const base = challengePath(slug, cslug);

    const [challenge, setChallenge] = useState<any>(null);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const defaultName = (user?.name as string | undefined) || [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    const [displayName, setDisplayName] = useState(defaultName || '');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [photo, setPhoto] = useState<{ fileId?: string; preview?: string; uploading: boolean }>({ uploading: false });
    const [video, setVideo] = useState<{ fileId?: string; name?: string; uploading: boolean }>({ uploading: false });
    const [fieldError, setFieldError] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<{ message: string; code?: string } | null>(null);
    const [done, setDone] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!displayName && defaultName) setDisplayName(defaultName);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultName]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await animationApi.resolveChallenge(slug, cslug);
                if (!r.apiReportedSuccess) { if (!cancelled) setLoadError(errText(r)); return; }
                const id = r.body.data._id;
                const [c, m] = await Promise.all([animationApi.challenge(id), animationApi.me(id).catch(() => null)]);
                if (cancelled) return;
                if (!c.apiReportedSuccess) { setLoadError(errText(c)); return; }
                setChallenge(c.body.data);
                if (m?.apiReportedSuccess) setMe(m.body.data);
            } catch (e: any) {
                if (!cancelled) setLoadError(e?.message || 'Erreur réseau.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug, cslug]);

    useEffect(() => () => { if (photo.preview) URL.revokeObjectURL(photo.preview); }, [photo.preview]);

    const onPhoto = async (file?: File) => {
        if (!file) return;
        setFieldError(null);
        if (!file.type.startsWith('image/')) { setFieldError('Choisissez une image (JPG, PNG…).'); return; }
        if (file.size > MAX_PHOTO_MB * 1024 * 1024) { setFieldError(`La photo dépasse ${MAX_PHOTO_MB} Mo.`); return; }
        const preview = URL.createObjectURL(file);
        setPhoto({ preview, uploading: true });
        try {
            const up = await sbcApiService.uploadFile(file);
            const fid = up.body?.data?.fileId;
            if (!up.isSuccessByStatusCode || !fid) {
                setPhoto({ preview, uploading: false });
                setFieldError(up.message || 'La photo n’a pas pu être envoyée. Réessayez.');
                return;
            }
            setPhoto({ preview, fileId: fid, uploading: false });
        } catch {
            setPhoto({ preview, uploading: false });
            setFieldError('La photo n’a pas pu être envoyée. Réessayez.');
        }
    };

    const onVideo = async (file?: File) => {
        if (!file) return;
        setFieldError(null);
        if (!file.type.startsWith('video/')) { setFieldError('Choisissez un fichier vidéo.'); return; }
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setFieldError(`La vidéo dépasse ${MAX_VIDEO_MB} Mo. Raccourcissez-la ou compressez-la.`); return; }
        setVideo({ name: file.name, uploading: true });
        try {
            const up = await sbcApiService.uploadFile(file);
            const fid = up.body?.data?.fileId;
            if (!up.isSuccessByStatusCode || !fid) {
                setVideo({ uploading: false });
                setFieldError(up.message || 'La vidéo n’a pas pu être envoyée. Réessayez.');
                return;
            }
            setVideo({ name: file.name, fileId: fid, uploading: false });
        } catch {
            setVideo({ uploading: false });
            setFieldError('La vidéo n’a pas pu être envoyée. Réessayez.');
        }
    };

    const submit = async () => {
        if (!challenge) return;
        const p = challenge.participation ?? {};
        setError(null);
        if (!displayName.trim()) { setError({ message: 'Indiquez votre nom ou pseudonyme.' }); return; }
        if (p.photoRequired && !photo.fileId) { setError({ message: 'Une photo est obligatoire pour ce défi.', code: 'PHOTO_REQUIRED' }); return; }
        if (p.categories?.length && !category) { setError({ message: 'Choisissez une catégorie.' }); return; }
        setSubmitting(true);
        try {
            const res = await animationApi.register(challenge._id, {
                displayName: displayName.trim(),
                photoFileId: photo.fileId,
                videoFileId: video.fileId,
                description: description.trim() || undefined,
                category: category || undefined,
            });
            if (res.apiReportedSuccess) { setDone(res.body.data); return; }
            const code = res.body?.code as string | undefined;
            setError({ message: (code && !TICKET_CODES.includes(code) && ERRORS[code]) || errText(res), code });
        } catch (e: any) {
            setError({ message: e?.message || 'Erreur réseau.' });
        } finally {
            setSubmitting(false);
        }
    };

    const shell = (content: ReactNode) => (
        <div className="min-h-screen bg-bg pb-8">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(base)} />
                <h1 className="text-lg font-bold text-ink truncate">Participer{challenge ? ` — ${challenge.name}` : ''}</h1>
            </div>
            <div className="px-4 pt-2 flex flex-col gap-4">{content}</div>
        </div>
    );

    if (loading) {
        return shell(<><Skeleton height="h-24" rounded="rounded-card" /><Skeleton height="h-64" rounded="rounded-card" /></>);
    }
    if (loadError || !challenge) {
        return shell(
            <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                <p className="text-sm font-semibold text-ink">{loadError || 'Défi introuvable.'}</p>
            </div>,
        );
    }

    const c = challenge;
    const p = c.participation ?? {};
    const eventSlug = c.event?.slug || slug;
    const eventLink = (
        <Link to={`/events/${encodeURIComponent(eventSlug)}`} className="inline-block rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
            Acheter un billet
        </Link>
    );

    // ---------- success ----------
    if (done) {
        const st = info(CANDIDATE_STATUS, done.status);
        const pageUrl = `${window.location.origin}${base}/candidats/${done.number}`;
        const share = async () => {
            try {
                if (navigator.share) { await navigator.share({ title: c.name, text: `Votez pour moi (n°${done.number}) — ${c.name}`, url: pageUrl }); return; }
                await navigator.clipboard.writeText(pageUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch { /* cancelled */ }
        };
        return shell(
            <>
                <section className="bg-success-soft rounded-card p-5 text-center flex flex-col items-center gap-2">
                    <span className="grid size-12 place-items-center rounded-pill bg-success text-white">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} />
                    </span>
                    <p className="text-base font-bold text-ink">Vous êtes le candidat n°{done.number}</p>
                    <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>{st.label}</span>
                    <p className="text-sm text-ink-2 text-pretty">
                        {done.status === 'PENDING'
                            ? 'Votre candidature est en attente de validation par l’organisateur. Vous serez notifié dès qu’elle sera validée.'
                            : 'Votre candidature est validée. Partagez votre page pour récolter des votes !'}
                    </p>
                </section>
                {done.status === 'APPROVED' && (
                    <div className="flex flex-col gap-2">
                        <button onClick={share} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
                            {copied ? 'Lien copié' : 'Partager ma page'}
                        </button>
                        <p className="text-[11px] text-ink-3 text-center break-all">{pageUrl}</p>
                    </div>
                )}
                <button onClick={() => navigate(base)} className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-ink">
                    Retour au défi
                </button>
                <button onClick={() => navigate('/events/mes-defis')} className="w-full py-2 text-sm text-ink-2">Mes candidatures</button>
            </>,
        );
    }

    // ---------- already a candidate / not open ----------
    const live = me?.candidacy && ['PENDING', 'APPROVED'].includes(me.candidacy.status) ? me.candidacy : null;
    if (live) {
        return shell(
            <div className="bg-surface border border-border rounded-card p-5 text-center flex flex-col items-center gap-2">
                <p className="text-base font-bold text-ink">Vous êtes déjà candidat n°{live.number}</p>
                <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[info(CANDIDATE_STATUS, live.status).tone])}>
                    {info(CANDIDATE_STATUS, live.status).label}
                </span>
                <button
                    onClick={() => navigate(live.status === 'APPROVED' ? `${base}/candidats/${live.number}` : '/events/mes-defis')}
                    className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                    {live.status === 'APPROVED' ? 'Voir ma page' : 'Mes candidatures'}
                </button>
            </div>,
        );
    }
    if (c.status !== 'REGISTRATION_OPEN' || c.suspended) {
        return shell(
            <div className="bg-surface border border-border rounded-card p-5 text-center flex flex-col items-center gap-2">
                <p className="text-sm font-semibold text-ink">{c.suspended ? 'Ce défi est suspendu.' : 'Les inscriptions ne sont pas ouvertes.'}</p>
                <button onClick={() => navigate(base)} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">Retour au défi</button>
            </div>,
        );
    }

    const elig = me?.canParticipate;
    const closesIn = countdown(c.schedule?.registrationClosesAt);
    const busy = submitting || photo.uploading || video.uploading;

    return shell(
        <>
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface border border-border rounded-card p-3">
                    <p className="text-[11px] text-ink-2">Places restantes</p>
                    <p className="text-lg font-bold text-ink tabular-nums">{p.placesLeft ?? '—'}<span className="text-xs font-medium text-ink-3"> / {p.maxCandidates}</span></p>
                </div>
                <div className="bg-surface border border-border rounded-card p-3">
                    <p className="text-[11px] text-ink-2">Clôture</p>
                    <p className="text-sm font-bold text-ink">{closesIn ? `dans ${closesIn}` : '—'}</p>
                </div>
            </div>

            {elig?.ok === false ? (
                <div className="bg-accent-soft rounded-card p-4 flex flex-col gap-2 items-start">
                    <p className="text-sm font-semibold text-ink">{elig.message || 'Vous ne pouvez pas participer à ce défi.'}</p>
                    {TICKET_CODES.includes(elig.code) && eventLink}
                </div>
            ) : elig?.ok ? (
                <p className="bg-success-soft rounded-card p-3 text-sm text-success flex items-center gap-2">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} /> Vous remplissez les conditions pour participer.
                </p>
            ) : null}

            {p.placesLeft === 0 && <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">Toutes les places sont prises.</p>}

            <section className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-ink">Nom affiché *</span>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} placeholder="Votre nom ou pseudonyme" className={inputClass} />
                </label>

                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-ink">Photo{p.photoRequired ? ' *' : ' (facultative)'}</span>
                    <label className={cn(
                        'relative flex items-center gap-3 rounded-card border border-dashed border-border bg-surface p-3 cursor-pointer',
                        photo.uploading && 'opacity-70',
                    )}>
                        <span className="size-20 shrink-0 grid place-items-center rounded-tile bg-surface-2 overflow-hidden text-ink-3">
                            {photo.preview ? <img src={photo.preview} alt="" className="size-full object-cover" /> : <HugeiconsIcon icon={Image01Icon} size={24} />}
                        </span>
                        <span className="min-w-0 text-sm">
                            <span className="block font-medium text-ink">{photo.uploading ? 'Envoi de la photo…' : photo.fileId ? 'Photo ajoutée — changer' : 'Choisir une photo'}</span>
                            <span className="block text-xs text-ink-2">JPG ou PNG, {MAX_PHOTO_MB} Mo max.</span>
                        </span>
                        <input type="file" accept="image/*" className="sr-only" disabled={photo.uploading} onChange={(e) => onPhoto(e.target.files?.[0])} />
                    </label>
                </div>

                {p.videoAllowed && (
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-ink">Vidéo (facultative)</span>
                        <label className={cn('flex items-center gap-3 rounded-card border border-dashed border-border bg-surface p-3 cursor-pointer', video.uploading && 'opacity-70')}>
                            <span className="size-10 shrink-0 grid place-items-center rounded-tile bg-surface-2 text-ink-3">
                                <HugeiconsIcon icon={Video01Icon} size={20} />
                            </span>
                            <span className="min-w-0 text-sm">
                                <span className="block font-medium text-ink truncate">
                                    {video.uploading ? 'Envoi de la vidéo…' : video.fileId ? `${video.name} — changer` : 'Choisir une vidéo'}
                                </span>
                                <span className="block text-xs text-ink-2">{MAX_VIDEO_MB} Mo max.</span>
                            </span>
                            <input type="file" accept="video/*" className="sr-only" disabled={video.uploading} onChange={(e) => onVideo(e.target.files?.[0])} />
                        </label>
                        {video.fileId && !video.uploading && (
                            <button onClick={() => setVideo({ uploading: false })} className="self-start text-xs font-semibold text-danger">Retirer la vidéo</button>
                        )}
                    </div>
                )}

                {fieldError && <p role="alert" className="text-xs text-danger">{fieldError}</p>}

                {p.categories?.length > 0 && (
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-ink">Catégorie *</span>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                            <option value="">Choisir…</option>
                            {p.categories.map((cat: string) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </label>
                )}

                <label className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-ink">Présentation (facultative)</span>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={2000}
                        rows={4}
                        placeholder="Parlez de vous, de votre talent…"
                        className={cn(inputClass, 'resize-y')}
                    />
                    <span className="text-[11px] text-ink-3 text-right">{description.length}/2000</span>
                </label>
            </section>

            {error && (
                <div role="alert" className="bg-danger-soft rounded-card p-3 text-sm text-danger flex flex-col gap-2 items-start">
                    <span>{error.message}</span>
                    {error.code && TICKET_CODES.includes(error.code) && eventLink}
                </div>
            )}

            {p.requiresApproval && <p className="text-xs text-ink-2">Votre candidature sera validée par l’organisateur avant d’apparaître publiquement.</p>}

            <button
                onClick={submit}
                disabled={busy || elig?.ok === false || p.placesLeft === 0}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {submitting ? 'Inscription…' : photo.uploading || video.uploading ? 'Envoi des fichiers…' : 'Valider ma candidature'}
            </button>
            <p className="text-[11px] text-ink-3 text-center">En participant, vous acceptez le règlement du défi.</p>
        </>,
    );
}
