import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, CheckmarkCircle02Icon, ShieldKeyIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { CHALLENGE_STATUS, errorMessage, info } from '../../lib/animation';
import { TONE_CLASS } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const SCORING_OPEN = ['ACTIVE', 'VOTING_OPEN', 'VOTING_CLOSED'];
const ERRORS: Record<string, string> = {
    SCORING_CLOSED: 'La notation n’est pas ouverte pour ce défi.',
    INCOMPLETE_SHEET: 'Notez chaque critère avant de valider.',
    ALREADY_SUBMITTED: 'Cette note est déjà validée.',
};

interface Criterion { key: string; label: string; weight: number; maxScore: number }

/** Same formula as the server: Σ (value/max) × weight, over Σ weight, on 100. */
const weighted = (criteria: Criterion[], values: Record<string, number | undefined>) => {
    const tw = criteria.reduce((s, c) => s + c.weight, 0) || 1;
    const sum = criteria.reduce((s, c) => s + (Math.min(Math.max(values[c.key] ?? 0, 0), c.maxScore) / (c.maxScore || 1)) * c.weight, 0);
    return Math.round((sum / tw) * 100 * 100) / 100;
};

function CandidateSheet({ cid, criteria, candidate, scoringOpen, onSaved }: {
    cid: string; criteria: Criterion[]; candidate: any; scoringOpen: boolean; onSaved: (sheet: any) => void;
}) {
    const sheet = candidate.sheet;
    const submitted = sheet?.status === 'SUBMITTED';
    const [values, setValues] = useState<Record<string, number | undefined>>(
        () => Object.fromEntries((sheet?.scores ?? []).map((s: any) => [s.key, s.value])),
    );
    const [comment, setComment] = useState<string>(sheet?.comment ?? '');
    const [busy, setBusy] = useState<'save' | 'submit' | null>(null);
    const [confirm, setConfirm] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [dirty, setDirty] = useState(false);

    const readOnly = submitted || !scoringOpen;
    const complete = criteria.every((c) => typeof values[c.key] === 'number');
    const score = weighted(criteria, values);

    const set = (key: string, raw: string, max: number) => {
        if (raw === '') { setValues((v) => ({ ...v, [key]: undefined })); setDirty(true); return; }
        const n = Math.round(Number(raw) * 2) / 2;
        if (!Number.isFinite(n)) return;
        setValues((v) => ({ ...v, [key]: Math.min(Math.max(n, 0), max) }));
        setDirty(true);
        setMsg(null);
    };

    const save = async (submit: boolean) => {
        setBusy(submit ? 'submit' : 'save');
        setMsg(null);
        try {
            const scores = criteria.filter((c) => typeof values[c.key] === 'number').map((c) => ({ key: c.key, value: values[c.key] as number }));
            const res = await animationApi.saveScore(cid, String(candidate._id), { scores, comment: comment.trim() || undefined, submit });
            if (res.apiReportedSuccess) {
                onSaved(res.body.data);
                setDirty(false);
                setConfirm(false);
                setMsg({ ok: true, text: submit ? 'Note validée.' : 'Brouillon enregistré.' });
            } else {
                const code = res.body?.code as string | undefined;
                setMsg({ ok: false, text: (code && ERRORS[code]) || errText(res) });
                if (code === 'ALREADY_SUBMITTED') onSaved({ ...(sheet ?? {}), status: 'SUBMITTED' });
            }
        } catch (e: any) {
            setMsg({ ok: false, text: e?.message || 'Erreur réseau.' });
        } finally {
            setBusy(null);
        }
    };

    return (
        <li className={cn('bg-surface border rounded-card overflow-hidden', submitted ? 'border-success' : 'border-border')}>
            <div className="flex items-center gap-3 p-3">
                <span className="size-16 shrink-0 rounded-tile bg-surface-2 overflow-hidden grid place-items-center text-lg font-bold text-ink-3">
                    {candidate.photoFileId
                        ? <img src={sbcApiService.generateThumbnailUrl(candidate.photoFileId, 256)} alt="" loading="lazy" className="size-full object-cover" />
                        : candidate.displayName?.[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-primary">n°{candidate.number}</span>
                    <span className="block font-semibold text-ink truncate">{candidate.displayName}</span>
                    {candidate.category && <span className="block text-xs text-ink-2 truncate">{candidate.category}</span>}
                </span>
                {submitted ? (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-pill bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} /> Validée
                    </span>
                ) : sheet ? (
                    <span className="shrink-0 rounded-pill bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">Brouillon</span>
                ) : null}
            </div>

            {candidate.videoFileId && (
                <video src={sbcApiService.generateSettingsFileUrl(candidate.videoFileId)} className="w-full max-h-72 bg-black" controls playsInline preload="metadata" />
            )}
            {candidate.description && (
                <details className="px-3 pt-2">
                    <summary className="cursor-pointer text-xs font-semibold text-primary">Présentation du candidat</summary>
                    <p className="mt-1 text-sm text-ink-2 whitespace-pre-wrap">{candidate.description}</p>
                </details>
            )}

            <div className="p-3 flex flex-col gap-3">
                {criteria.map((c) => {
                    const v = values[c.key];
                    const inputId = `crit-${candidate._id}-${c.key}`;
                    return (
                        <div key={c.key} className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor={inputId} className="text-sm font-medium text-ink min-w-0 truncate">
                                    {c.label} <span className="text-[11px] text-ink-3">· poids {c.weight}</span>
                                </label>
                                <span className="flex items-center gap-1 shrink-0">
                                    <input
                                        id={inputId}
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        max={c.maxScore}
                                        step={0.5}
                                        value={v ?? ''}
                                        placeholder="—"
                                        disabled={readOnly}
                                        onChange={(e) => set(c.key, e.target.value, c.maxScore)}
                                        className="w-16 rounded-tile border border-border bg-surface px-2 py-1 text-right text-sm font-semibold text-ink tabular-nums focus:outline-none focus:border-primary disabled:bg-surface-2"
                                    />
                                    <span className="text-xs text-ink-2">/ {c.maxScore}</span>
                                </span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={c.maxScore}
                                step={0.5}
                                value={v ?? 0}
                                disabled={readOnly}
                                onChange={(e) => set(c.key, e.target.value, c.maxScore)}
                                aria-label={`${c.label} pour ${candidate.displayName}`}
                                className={cn('w-full accent-primary', v === undefined && 'opacity-50')}
                            />
                        </div>
                    );
                })}

                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-ink">Commentaire (facultatif)</span>
                    <textarea
                        value={comment}
                        onChange={(e) => { setComment(e.target.value); setDirty(true); }}
                        maxLength={1000}
                        rows={2}
                        disabled={readOnly}
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-primary disabled:bg-surface-2 resize-y"
                    />
                </label>

                <div className="flex items-center justify-between gap-2 bg-surface-2 rounded-tile px-3 py-2">
                    <span className="text-xs text-ink-2">Note pondérée{!complete && !submitted ? ' (provisoire)' : ''}</span>
                    <span className="text-base font-extrabold text-ink tabular-nums">{score.toLocaleString('fr-FR')} / 100</span>
                </div>

                {msg && <p role={msg.ok ? 'status' : 'alert'} className={cn('text-xs', msg.ok ? 'text-success' : 'text-danger')}>{msg.text}</p>}

                {!readOnly && (confirm ? (
                    <div className="bg-accent-soft rounded-tile p-3 flex flex-col gap-2">
                        <p className="text-sm text-ink">Valider définitivement la note de {candidate.displayName} ? Elle ne pourra plus être modifiée.</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => save(true)}
                                disabled={busy !== null}
                                className="flex-1 rounded-xl bg-success py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {busy === 'submit' ? 'Validation…' : 'Confirmer'}
                            </button>
                            <button onClick={() => setConfirm(false)} disabled={busy !== null} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-ink">
                                Annuler
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => save(false)}
                            disabled={busy !== null || !dirty}
                            className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
                        >
                            {busy === 'save' ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                        <button
                            onClick={() => { setMsg(null); setConfirm(true); }}
                            disabled={busy !== null || !complete}
                            title={complete ? undefined : 'Notez chaque critère'}
                            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                        >
                            Valider ma note
                        </button>
                    </div>
                ))}
            </div>
        </li>
    );
}

export default function JuryScoring() {
    const { cid = '' } = useParams<{ cid: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'todo'>('all');

    useEffect(() => {
        (async () => {
            try {
                const res = await animationApi.juryChallenge(cid);
                if (res.apiReportedSuccess) setData(res.body.data);
                else setError(errText(res));
            } catch (e: any) {
                setError(e?.message || 'Erreur réseau.');
            } finally {
                setLoading(false);
            }
        })();
    }, [cid]);

    const onSaved = (candidateId: string, sheet: any) =>
        setData((d: any) => ({ ...d, candidates: d.candidates.map((c: any) => (String(c._id) === candidateId ? { ...c, sheet } : c)) }));

    const challenge = data?.challenge;
    const candidates: any[] = data?.candidates ?? [];
    const criteria: Criterion[] = challenge?.criteria ?? [];
    const done = candidates.filter((c) => c.sheet?.status === 'SUBMITTED').length;
    const scoringOpen = SCORING_OPEN.includes(challenge?.status);
    const st = info(CHALLENGE_STATUS, challenge?.status);
    const shown = filter === 'todo' ? candidates.filter((c) => c.sheet?.status !== 'SUBMITTED') : candidates;

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate('/events/jury')} />
                <div className="min-w-0">
                    <h1 className="text-lg font-bold text-ink truncate">{challenge?.name ?? 'Notation'}</h1>
                    <p className="text-xs text-ink-2">Espace jury</p>
                </div>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-3">
                {loading ? (
                    <>
                        <Skeleton height="h-20" rounded="rounded-card" />
                        <Skeleton height="h-64" rounded="rounded-card" />
                    </>
                ) : error || !data ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                        <p className="text-sm font-semibold text-ink">{error || 'Défi introuvable.'}</p>
                    </div>
                ) : (
                    <>
                        <section className="bg-surface border border-border rounded-card p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>{st.label}</span>
                                <span className="text-sm font-bold text-ink tabular-nums">{done}/{candidates.length} notés</span>
                            </div>
                            <div className="h-1.5 rounded-pill bg-surface-2 overflow-hidden" aria-hidden>
                                <div className="h-full bg-success" style={{ width: `${candidates.length ? (100 * done) / candidates.length : 0}%` }} />
                            </div>
                            <p className="text-xs text-ink-2 flex items-start gap-1.5">
                                <HugeiconsIcon icon={ShieldKeyIcon} size={14} className="shrink-0 mt-px text-primary" />
                                Notation à l’aveugle : vous ne voyez que vos propres notes, et les autres jurés ne voient pas les vôtres. Une note validée est définitive.
                            </p>
                        </section>

                        {!scoringOpen && (
                            <p className="bg-accent-soft rounded-card p-3 text-sm text-ink">
                                {['RESULTS_PENDING', 'COMPLETED', 'CANCELLED'].includes(challenge.status)
                                    ? 'La notation est close.'
                                    : 'La notation n’est pas encore ouverte. Vous pourrez noter dès que le défi sera en cours.'}
                            </p>
                        )}

                        {criteria.length === 0 ? (
                            <p className="bg-surface border border-border rounded-card p-4 text-sm text-ink-2">L’organisateur n’a pas encore défini de critères de notation.</p>
                        ) : candidates.length === 0 ? (
                            <p className="bg-surface border border-border rounded-card p-4 text-sm text-ink-2">Aucun candidat validé à noter pour le moment.</p>
                        ) : (
                            <>
                                <div className="flex gap-1.5" role="group" aria-label="Filtrer">
                                    {([['all', 'Tous'], ['todo', 'À valider']] as const).map(([k, label]) => (
                                        <button
                                            key={k}
                                            onClick={() => setFilter(k)}
                                            aria-pressed={filter === k}
                                            className={cn('rounded-pill px-3 py-1.5 text-xs font-semibold border', filter === k ? 'bg-primary text-white border-primary' : 'bg-surface text-ink-2 border-border')}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <ul className="flex flex-col gap-3">
                                    {shown.map((c) => (
                                        <CandidateSheet
                                            key={String(c._id)}
                                            cid={cid}
                                            criteria={criteria}
                                            candidate={c}
                                            scoringOpen={scoringOpen}
                                            onSaved={(sheet) => onSaved(String(c._id), sheet)}
                                        />
                                    ))}
                                </ul>
                                {shown.length === 0 && <p className="text-sm text-success text-center">Toutes vos notes sont validées. Merci !</p>}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
