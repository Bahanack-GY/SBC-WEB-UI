import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { animationApi } from '../../services/animationApi';
import { sbcApiService } from '../../services/SBCApiService';
import type { ApiResponse } from '../../services/ApiResponse';
import { TONE_CLASS, xaf, type Tone } from '../../lib/eventStatus';
import {
    CANDIDATE_STATUS, CHALLENGE_STATUS, PARTICIPATION_MODES, TIE_RULES, VOTER_SCOPES, VOTE_TX_STATUS, VOTING_MODES,
    challengePath, errorMessage, fmtDateTime, fromLocalInput, info, toLocalInput,
} from '../../lib/animation';

// ---------- shared bits ----------

const inputClass = 'w-full bg-surface border border-border rounded-tile px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-primary disabled:bg-surface-2 disabled:text-ink-3';
const btnPrimary = 'bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-tile transition-colors disabled:opacity-60';
const btnSecondary = 'bg-surface border border-primary text-primary font-semibold py-2 px-3 rounded-tile text-sm disabled:opacity-60';
const btnGhost = 'bg-surface border border-border text-ink-2 font-medium py-2 px-3 rounded-tile text-sm disabled:opacity-60';
const btnDanger = 'bg-surface border border-danger text-danger font-semibold py-2 px-3 rounded-tile text-sm disabled:opacity-60';
const btnDangerFill = 'bg-danger text-white font-semibold py-2 px-3 rounded-tile text-sm disabled:opacity-60';

const errText = (res: ApiResponse) => (res.statusCode === 401 ? 'Session expirée : reconnectez-vous.' : errorMessage(res));

function Badge({ label, tone }: { label: string; tone: Tone }) {
    return <span className={`inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${TONE_CLASS[tone]}`}>{label}</span>;
}
function Notice({ kind, children }: { kind: 'error' | 'success' | 'info' | 'warn'; children: ReactNode }) {
    const cls = kind === 'error' ? 'bg-danger-soft text-danger' : kind === 'success' ? 'bg-success-soft text-success' : kind === 'warn' ? 'bg-accent-soft text-ink' : 'bg-surface-2 text-ink-2';
    return <div className={`${cls} border border-border rounded-tile p-3 text-sm`}>{children}</div>;
}
function Field({ label, children, hint, locked }: { label: string; children: ReactNode; hint?: string; locked?: boolean }) {
    return (
        <label className="block text-xs text-ink-2">
            <span className="flex items-center gap-1">{label}{locked && <span title="Verrouillé : modification sur demande validée par SBC">🔒</span>}</span>
            <div className="mt-1">{children}</div>
            {hint && <div className="text-[11px] text-ink-3 mt-0.5">{hint}</div>}
        </label>
    );
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}
function Section({ title, badge, defaultOpen, children }: { title: string; badge?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
    const [open, setOpen] = useState(Boolean(defaultOpen));
    return (
        <div className="bg-surface border border-border rounded-card">
            <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 p-3 text-left">
                <span className="font-semibold text-ink">{title}</span>
                <span className="flex items-center gap-1 shrink-0">{badge}<span className="text-ink-3 text-sm">{open ? '▴' : '▾'}</span></span>
            </button>
            {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
        </div>
    );
}
function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between pt-1">
            <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className={btnGhost}>←</button>
            <span className="text-xs text-ink-2">Page {page} / {totalPages}</span>
            <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className={btnGhost}>→</button>
        </div>
    );
}

// ---------- rules mirrored from the backend (lib/rules.ts) ----------

const FLOW = ['DRAFT', 'PROGRAMMED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ACTIVE', 'VOTING_OPEN', 'VOTING_CLOSED', 'RESULTS_PENDING', 'COMPLETED'];
const sIdx = (s?: string) => FLOW.indexOf(s ?? '');
const LOCK_POLICY: { prefix: string; from: string }[] = [
    { prefix: 'participation', from: 'REGISTRATION_OPEN' },
    { prefix: 'voting', from: 'ACTIVE' },
    { prefix: 'scoring', from: 'ACTIVE' },
    { prefix: 'tieRule', from: 'ACTIVE' },
    { prefix: 'rankRewards', from: 'ACTIVE' },
    { prefix: 'schedule', from: 'ACTIVE' },
    { prefix: 'rulesText', from: 'REGISTRATION_OPEN' },
];
const isTerminal = (s: string) => s === 'COMPLETED' || s === 'CANCELLED';
const isLockedPath = (status: string, path: string) => {
    if (status === 'DRAFT' || status === 'PROGRAMMED') return false;
    const terminal = isTerminal(status);
    if (['description', 'imageFileId', 'name'].includes(path.split('.')[0])) return terminal;
    if (terminal) return true;
    if (path === 'schedule.votingClosesAt' && sIdx(status) < sIdx('VOTING_CLOSED')) return false;
    return LOCK_POLICY.some((r) => (path === r.prefix || path.startsWith(`${r.prefix}.`)) && sIdx(status) >= sIdx(r.from));
};
const allowsFree = (m: string) => m === 'FREE' || m === 'FREE_AND_PAID' || m === 'PUBLIC_AND_JURY';
const allowsPaid = (m: string) => m === 'PAID' || m === 'FREE_AND_PAID' || m === 'PUBLIC_AND_JURY';
const usesJury = (m: string) => m === 'JURY' || m === 'PUBLIC_AND_JURY';

const NEXT: Record<string, { to: string; label: string; hint?: string }[]> = {
    DRAFT: [{ to: 'PROGRAMMED', label: 'Programmer le défi', hint: 'La configuration est vérifiée, puis le calendrier fait avancer le défi automatiquement.' }],
    PROGRAMMED: [
        { to: 'REGISTRATION_OPEN', label: 'Ouvrir les inscriptions' },
        { to: 'ACTIVE', label: 'Démarrer sans phase d’inscription' },
        { to: 'DRAFT', label: 'Repasser en brouillon' },
    ],
    REGISTRATION_OPEN: [{ to: 'REGISTRATION_CLOSED', label: 'Clore les inscriptions' }],
    REGISTRATION_CLOSED: [{ to: 'ACTIVE', label: 'Démarrer le défi' }],
    ACTIVE: [{ to: 'VOTING_OPEN', label: 'Ouvrir les votes' }, { to: 'VOTING_CLOSED', label: 'Terminer (sans phase de vote)' }],
    VOTING_OPEN: [{ to: 'VOTING_CLOSED', label: 'Clore les votes' }],
    VOTING_CLOSED: [{ to: 'RESULTS_PENDING', label: 'Préparer le résultat', hint: 'Le résultat est calculé à partir du registre des votes.' }],
};

const SCORING_METHODS = [
    { value: 'VOTES', label: 'Nombre de votes' },
    { value: 'JURY', label: 'Note du jury' },
    { value: 'HYBRID', label: 'Mixte : public + jury' },
];
const RESULT_STATUS: Record<string, { label: string; tone: Tone }> = {
    COMPUTED: { label: 'Calculé', tone: 'primary' },
    AWAITING_TIE_DECISION: { label: 'Égalité à départager', tone: 'accent' },
    AWAITING_SECOND_ROUND: { label: 'Second tour requis', tone: 'accent' },
    FROZEN: { label: 'Figé', tone: 'success' },
};

// ---------- the editable draft ----------

type Criterion = { key: string; label: string; weight: string; maxScore: string };
type Draft = {
    name: string; description: string; imageFileId: string; rulesText: string;
    registrationOpensAt: string; registrationClosesAt: string; startsAt: string; votingOpensAt: string; votingClosesAt: string; endsAt: string; settlementGraceMin: string;
    pMode: string; pTicketTypeIds: string[]; requiresApproval: boolean; maxCandidates: string; categories: string; photoRequired: boolean; videoAllowed: boolean;
    vMode: string; voterScope: string; voterTicketTypeIds: string[]; perPeriod: string; period: string; perCandidatePerPeriod: string; totalPerChallenge: string;
    selfVoteAllowed: boolean; showVoteCounts: boolean;
    method: string; publicWeight: string; juryWeight: string; criteria: Criterion[];
    tieRule: string; rankRewards: { rank: string; rewardId: string }[];
};
type K = keyof Draft;

/** Draft key → API path, label and how to serialise it. */
const FIELDS: Record<K, { path: string; label: string; kind?: 'date' | 'num' }> = {
    name: { path: 'name', label: 'Nom' },
    description: { path: 'description', label: 'Description' },
    imageFileId: { path: 'imageFileId', label: 'Image' },
    rulesText: { path: 'rulesText', label: 'Règlement' },
    registrationOpensAt: { path: 'schedule.registrationOpensAt', label: 'Ouverture des inscriptions', kind: 'date' },
    registrationClosesAt: { path: 'schedule.registrationClosesAt', label: 'Clôture des inscriptions', kind: 'date' },
    startsAt: { path: 'schedule.startsAt', label: 'Début du défi', kind: 'date' },
    votingOpensAt: { path: 'schedule.votingOpensAt', label: 'Ouverture des votes', kind: 'date' },
    votingClosesAt: { path: 'schedule.votingClosesAt', label: 'Clôture des votes', kind: 'date' },
    endsAt: { path: 'schedule.endsAt', label: 'Fin du défi', kind: 'date' },
    settlementGraceMin: { path: 'schedule.settlementGraceMin', label: 'Délai de grâce des paiements', kind: 'num' },
    pMode: { path: 'participation.mode', label: 'Qui peut participer' },
    pTicketTypeIds: { path: 'participation.ticketTypeIds', label: 'Billets autorisés à participer' },
    requiresApproval: { path: 'participation.requiresApproval', label: 'Validation des candidatures' },
    maxCandidates: { path: 'participation.maxCandidates', label: 'Nombre maximum de candidats', kind: 'num' },
    categories: { path: 'participation.categories', label: 'Catégories' },
    photoRequired: { path: 'participation.photoRequired', label: 'Photo obligatoire' },
    videoAllowed: { path: 'participation.videoAllowed', label: 'Vidéo autorisée' },
    vMode: { path: 'voting.mode', label: 'Mode de vote' },
    voterScope: { path: 'voting.voterScope', label: 'Qui peut voter' },
    voterTicketTypeIds: { path: 'voting.voterTicketTypeIds', label: 'Billets autorisés à voter' },
    perPeriod: { path: 'voting.free.perPeriod', label: 'Votes gratuits par période', kind: 'num' },
    period: { path: 'voting.free.period', label: 'Période des votes gratuits' },
    perCandidatePerPeriod: { path: 'voting.free.perCandidatePerPeriod', label: 'Votes par candidat et par période', kind: 'num' },
    totalPerChallenge: { path: 'voting.free.totalPerChallenge', label: 'Votes gratuits au total', kind: 'num' },
    selfVoteAllowed: { path: 'voting.selfVoteAllowed', label: 'Vote pour soi-même' },
    showVoteCounts: { path: 'voting.showVoteCounts', label: 'Affichage des votes' },
    method: { path: 'scoring.method', label: 'Méthode de classement' },
    publicWeight: { path: 'scoring.publicWeight', label: 'Poids du public', kind: 'num' },
    juryWeight: { path: 'scoring.juryWeight', label: 'Poids du jury', kind: 'num' },
    criteria: { path: 'scoring.criteria', label: 'Critères du jury' },
    tieRule: { path: 'tieRule', label: 'Règle d’égalité' },
    rankRewards: { path: 'rankRewards', label: 'Récompenses de classement' },
};
const PATH_LABEL: Record<string, string> = Object.fromEntries(Object.values(FIELDS).map((f) => [f.path, f.label]));
const pathLabel = (p: string) => PATH_LABEL[p] ?? (p === 'packages' ? 'Packs de votes' : p);

const toDraft = (c: any): Draft => ({
    name: c.name ?? '', description: c.description ?? '', imageFileId: c.imageFileId ?? '', rulesText: c.rulesText ?? '',
    registrationOpensAt: toLocalInput(c.schedule?.registrationOpensAt), registrationClosesAt: toLocalInput(c.schedule?.registrationClosesAt),
    startsAt: toLocalInput(c.schedule?.startsAt), votingOpensAt: toLocalInput(c.schedule?.votingOpensAt),
    votingClosesAt: toLocalInput(c.schedule?.votingClosesAt), endsAt: toLocalInput(c.schedule?.endsAt),
    settlementGraceMin: String(c.schedule?.settlementGraceMin ?? 10),
    pMode: c.participation?.mode ?? 'OPEN', pTicketTypeIds: (c.participation?.ticketTypeIds ?? []).map(String),
    requiresApproval: c.participation?.requiresApproval ?? true, maxCandidates: String(c.participation?.maxCandidates ?? 100),
    categories: (c.participation?.categories ?? []).join(', '), photoRequired: c.participation?.photoRequired ?? true,
    videoAllowed: c.participation?.videoAllowed ?? false,
    vMode: c.voting?.mode ?? 'FREE', voterScope: c.voting?.voterScope ?? 'ANY_SBC_USER',
    voterTicketTypeIds: (c.voting?.voterTicketTypeIds ?? []).map(String),
    perPeriod: String(c.voting?.free?.perPeriod ?? 1), period: c.voting?.free?.period ?? 'DAY',
    perCandidatePerPeriod: c.voting?.free?.perCandidatePerPeriod != null ? String(c.voting.free.perCandidatePerPeriod) : '',
    totalPerChallenge: c.voting?.free?.totalPerChallenge != null ? String(c.voting.free.totalPerChallenge) : '',
    selfVoteAllowed: c.voting?.selfVoteAllowed ?? false, showVoteCounts: c.voting?.showVoteCounts ?? true,
    method: c.scoring?.method ?? 'VOTES', publicWeight: String(c.scoring?.publicWeight ?? 100), juryWeight: String(c.scoring?.juryWeight ?? 0),
    criteria: (c.scoring?.criteria ?? []).map((x: any) => ({ key: x.key, label: x.label, weight: String(x.weight), maxScore: String(x.maxScore) })),
    tieRule: c.tieRule ?? 'EARLIEST_TO_REACH',
    rankRewards: (c.rankRewards ?? []).map((r: any) => ({ rank: String(r.rank), rewardId: String(r.rewardId) })),
});

const apiValue = (k: K, d: Draft): unknown => {
    const f = FIELDS[k];
    const v = d[k];
    if (f.kind === 'date') return fromLocalInput(v as string) ?? null;
    if (f.kind === 'num') return v === '' ? undefined : Number(v);
    if (k === 'categories') return d.categories.split(',').map((s) => s.trim()).filter(Boolean);
    if (k === 'criteria') return d.criteria.map((c, i) => ({ key: c.key || `c${i + 1}`, label: c.label.trim(), weight: Number(c.weight), maxScore: Number(c.maxScore || 10) }));
    if (k === 'rankRewards') return d.rankRewards.filter((r) => r.rewardId && Number(r.rank) >= 1).map((r) => ({ rank: Number(r.rank), rewardId: r.rewardId }));
    return v;
};
const setPath = (o: Record<string, any>, path: string, v: unknown) => {
    const parts = path.split('.');
    let cur = o;
    for (const p of parts.slice(0, -1)) { cur[p] = cur[p] ?? {}; cur = cur[p]; }
    cur[parts[parts.length - 1]] = v;
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const buildPatch = (keys: K[], d: Draft) => {
    const patch: Record<string, any> = {};
    for (const k of keys) setPath(patch, FIELDS[k].path, apiValue(k, d));
    return patch;
};

type Me = { role: string; perms: string[]; event: any };

// ======================================================================

export default function ChallengeEditor() {
    const { id: eventId = '', cid = 'nouveau' } = useParams<{ id: string; cid: string }>();
    const navigate = useNavigate();
    const [me, setMe] = useState<Me | null>(null);
    const [denied, setDenied] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const m = await animationApi.manage.me(eventId);
            if (m.apiReportedSuccess) setMe(m.body.data);
            else setDenied(m.statusCode === 403 || m.statusCode === 404 ? 'Accès refusé : vous ne faites pas partie de l’équipe de cet événement.' : errText(m));
        })();
    }, [eventId]);

    const backToHub = () => navigate(`/events/organizer/${eventId}/animation?tab=defis`);

    if (denied) {
        return (
            <div className="min-h-screen bg-bg">
                <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                    <BackButton onClick={backToHub} />
                    <h1 className="text-lg font-semibold text-ink">Défi</h1>
                </div>
                <div className="p-4"><Notice kind="error">{denied}</Notice></div>
            </div>
        );
    }
    if (!me) return <div className="min-h-screen bg-bg p-8 text-center text-ink-2">Chargement…</div>;
    if (cid === 'nouveau') return <NewChallenge eventId={eventId} me={me} onBack={backToHub} />;
    return <ExistingChallenge key={cid} eventId={eventId} cid={cid} me={me} onBack={backToHub} />;
}

// ---------- creation ----------

function NewChallenge({ eventId, me, onBack }: { eventId: string; me: Me; onBack: () => void }) {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [mode, setMode] = useState('FREE');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const create = async () => {
        if (!name.trim()) { setError('Le nom du défi est obligatoire.'); return; }
        setBusy(true); setError(null);
        const scoring = mode === 'JURY' ? { method: 'JURY', publicWeight: 0, juryWeight: 100 }
            : mode === 'PUBLIC_AND_JURY' ? { method: 'HYBRID', publicWeight: 50, juryWeight: 50 } : { method: 'VOTES' };
        const res = await animationApi.manage.createChallenge(eventId, { name: name.trim(), description: description.trim(), voting: { mode }, scoring });
        setBusy(false);
        if (res.apiReportedSuccess) navigate(`/events/organizer/${eventId}/animation/defis/${res.body.data._id}`, { replace: true });
        else setError(errText(res));
    };

    return (
        <div className="min-h-screen bg-bg">
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={onBack} />
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-ink leading-tight">Nouveau défi</h1>
                    <div className="text-xs text-ink-2 truncate">{me.event?.title}</div>
                </div>
            </div>
            <div className="p-4 space-y-3 max-w-3xl mx-auto">
                {!me.perms.includes('CONFIGURE') ? (
                    <Notice kind="error">Votre rôle ne permet pas de créer un défi.</Notice>
                ) : (
                    <>
                        <Field label="Nom du défi *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Meilleure tenue de la soirée" className={inputClass} /></Field>
                        <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Ce que les participants doivent faire" className={inputClass} /></Field>
                        <Field label="Comment désigner le gagnant ?" hint={VOTING_MODES.find((m) => m.value === mode)?.hint}>
                            <select value={mode} onChange={(e) => setMode(e.target.value)} className={inputClass}>
                                {VOTING_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </Field>
                        <div className="text-xs text-ink-3">Le défi est créé en brouillon : vous compléterez ensuite le calendrier, les règles et les récompenses.</div>
                        <button onClick={create} disabled={busy} className={`w-full ${btnPrimary}`}>{busy ? '…' : 'Créer le défi'}</button>
                        {error && <Notice kind="error">{error}</Notice>}
                    </>
                )}
            </div>
        </div>
    );
}

// ---------- editing ----------

function ExistingChallenge({ eventId, cid, me, onBack }: { eventId: string; cid: string; me: Me; onBack: () => void }) {
    const navigate = useNavigate();
    const can = useCallback((p: string) => me.perms.includes(p), [me]);
    const [data, setData] = useState<{ challenge: any; pendingChangeRequests: any[]; configErrors: string[] } | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [orig, setOrig] = useState<Draft | null>(null);
    const [rewards, setRewards] = useState<any[]>([]);
    const [ticketTypes, setTicketTypes] = useState<any[] | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState<{ kind: 'error' | 'success'; text: string; list?: string[] } | null>(null);
    const [lockedFields, setLockedFields] = useState<string[] | null>(null);
    const [lockedPatch, setLockedPatch] = useState<Record<string, any> | null>(null);
    const [uploading, setUploading] = useState(false);

    const reload = useCallback(async (keepDraft = false) => {
        const res = await animationApi.manage.challenge(eventId, cid);
        if (!res.apiReportedSuccess) { setLoadError(res.statusCode === 404 ? 'Défi introuvable.' : errText(res)); return; }
        setData(res.body.data);
        const d = toDraft(res.body.data.challenge);
        setOrig(d);
        if (!keepDraft) setDraft(d);
    }, [eventId, cid]);

    useEffect(() => { reload(); }, [reload]);
    // Counters (votes, paid revenue) move while voting is open: refresh them
    // without touching the draft being edited.
    const liveStatus = data?.challenge?.status;
    useEffect(() => {
        if (liveStatus !== 'VOTING_OPEN') return;
        const t = setInterval(() => { if (document.visibilityState === 'visible') reload(true); }, 30_000);
        return () => clearInterval(t);
    }, [liveStatus, reload]);
    useEffect(() => {
        animationApi.manage.rewards(eventId).then((r) => r.apiReportedSuccess && setRewards(r.body.data ?? []));
    }, [eventId]);
    useEffect(() => {
        (async () => {
            const r = await animationApi.manage.ticketTypes(eventId);
            if (r.apiReportedSuccess) { setTicketTypes(r.body?.data ?? []); return; }
            if (me.event?.slug) {
                const p = await sbcApiService.getPublicEventBySlug(me.event.slug);
                if (p.apiReportedSuccess) { setTicketTypes(p.body?.data?.ticketTypes ?? []); return; }
            }
            setTicketTypes([]);
        })();
    }, [eventId, me.event?.slug]);

    const c = data?.challenge;
    const status: string = c?.status ?? 'DRAFT';
    const terminal = isTerminal(status);
    const editable = can('CONFIGURE') && !terminal;
    const changed: K[] = useMemo(() => (draft && orig ? (Object.keys(FIELDS) as K[]).filter((k) => !same(draft[k], orig[k])) : []), [draft, orig]);
    const set = <T extends K>(k: T, v: Draft[T]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
    const lockedK = (k: K) => isLockedPath(status, FIELDS[k].path);
    const sectionChanged = (keys: K[]) => keys.some((k) => changed.includes(k));
    const unsaved = useUnsavedChanges({ dirty: editable && changed.length > 0, storageKey: `sbc-anim-draft:challenge:${cid}`, base: orig ?? undefined, draft });
    /** Leaves the editor, asking first if there are unsaved changes. */
    const leave = (path: string) => unsaved.guard(() => navigate(path));

    const upload = async (file?: File | null) => {
        if (!file) return;
        setUploading(true);
        const res = await sbcApiService.uploadFile(file);
        setUploading(false);
        if (res.apiReportedSuccess && res.body?.data?.fileId) set('imageFileId', res.body.data.fileId);
        else setSaveMsg({ kind: 'error', text: errText(res) || 'Envoi de l’image impossible.' });
    };

    const save = async () => {
        if (!draft || !changed.length) return;
        if (changed.includes('criteria') && usesJury(draft.vMode) && draft.criteria.length) {
            const total = draft.criteria.reduce((s, x) => s + (Number(x.weight) || 0), 0);
            if (total !== 100) { setSaveMsg({ kind: 'error', text: `Les poids des critères doivent totaliser 100 (actuellement ${total}).` }); return; }
        }
        const patch = buildPatch(changed, draft);
        setSaving(true); setSaveMsg(null); setLockedFields(null);
        const res = await animationApi.manage.updateChallenge(eventId, cid, patch);
        setSaving(false);
        if (res.apiReportedSuccess) {
            setSaveMsg({ kind: 'success', text: 'Modifications enregistrées.' });
            await reload();
        } else if (res.body?.code === 'LOCKED_FIELDS') {
            setLockedFields(res.body?.details?.fields ?? []);
            setLockedPatch(patch);
        } else if (res.body?.code === 'INVALID_CONFIG') {
            setSaveMsg({ kind: 'error', text: 'La configuration n’est pas cohérente :', list: res.body?.details?.errors ?? [] });
        } else setSaveMsg({ kind: 'error', text: errText(res) });
    };

    if (loadError) {
        return (
            <div className="min-h-screen bg-bg">
                <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                    <BackButton onClick={onBack} />
                    <h1 className="text-lg font-semibold text-ink">Défi</h1>
                </div>
                <div className="p-4"><Notice kind="error">{loadError}</Notice></div>
            </div>
        );
    }
    if (!data || !draft || !c) return <div className="min-h-screen bg-bg p-8 text-center text-ink-2">Chargement…</div>;

    const eventSlug: string | undefined = me.event?.slug;
    const idx = sIdx(status);
    const lockBadge = (keys: K[]) => (keys.some(lockedK) ? <Badge label="🔒" tone="muted" /> : null);
    const changedBadge = (keys: K[]) => (sectionChanged(keys) ? <Badge label="modifié" tone="accent" /> : null);
    const INFO_K: K[] = ['name', 'description', 'imageFileId', 'rulesText'];
    const SCHED_K: K[] = ['registrationOpensAt', 'registrationClosesAt', 'startsAt', 'votingOpensAt', 'votingClosesAt', 'endsAt', 'settlementGraceMin'];
    const PART_K: K[] = ['pMode', 'pTicketTypeIds', 'requiresApproval', 'maxCandidates', 'categories', 'photoRequired', 'videoAllowed'];
    const VOTE_K: K[] = ['vMode', 'voterScope', 'voterTicketTypeIds', 'perPeriod', 'period', 'perCandidatePerPeriod', 'totalPerChallenge', 'selfVoteAllowed', 'showVoteCounts'];
    const SCORE_K: K[] = ['method', 'publicWeight', 'juryWeight', 'criteria'];
    const TIE_K: K[] = ['tieRule', 'rankRewards'];
    const savedMode: string = c.voting?.mode ?? 'FREE';
    const deadlineOnlyLater = idx >= sIdx('ACTIVE') && idx < sIdx('VOTING_CLOSED');
    const criteriaTotal = draft.criteria.reduce((s, x) => s + (Number(x.weight) || 0), 0);

    return (
        <div className="min-h-screen bg-bg pb-40">
            {unsaved.dialog}
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={() => unsaved.guard(onBack)} />
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-ink leading-tight truncate">{c.name}</h1>
                    <div className="text-xs text-ink-2 truncate">{me.event?.title}</div>
                </div>
            </div>

            <div className="p-4 space-y-3 max-w-3xl mx-auto">
                {unsaved.restorable && editable && (
                    <div className="bg-accent-soft border border-border rounded-card p-3 space-y-2">
                        <div className="text-sm text-ink">Vous aviez des modifications non enregistrées sur ce défi.</div>
                        <div className="flex gap-2">
                            <button onClick={() => { const d = unsaved.takeRestorable(); if (d) setDraft(d); }} className={`flex-1 ${btnPrimary}`}>Les récupérer</button>
                            <button onClick={unsaved.discardStoredDraft} className={btnGhost}>Ignorer</button>
                        </div>
                    </div>
                )}
                <StatusBar eventId={eventId} challenge={c} can={can} configErrors={data.configErrors} eventSlug={eventSlug} onChanged={() => reload(true)} leave={leave} />

                {data.pendingChangeRequests.length > 0 && (
                    <div className="bg-accent-soft border border-border rounded-card p-3 space-y-2">
                        <div className="text-sm font-semibold text-ink">Demandes de modification en attente ({data.pendingChangeRequests.length})</div>
                        {data.pendingChangeRequests.map((cr) => (
                            <div key={cr._id} className="bg-surface rounded-tile p-2 text-xs text-ink-2">
                                <div className="text-ink">{(cr.diff ?? []).map((x: any) => pathLabel(x.path)).join(', ') || 'Modification'}</div>
                                <div>Motif : {cr.reason}</div>
                                <div className="text-ink-3">Envoyée le {fmtDateTime(cr.createdAt)} · en attente de l’équipe SBC</div>
                            </div>
                        ))}
                    </div>
                )}

                {!can('CONFIGURE') && <Notice kind="info">Consultation seule : votre rôle ne permet pas de modifier la configuration.</Notice>}
                {terminal && <Notice kind="info">Ce défi est {status === 'CANCELLED' ? 'annulé' : 'terminé'} : sa configuration n’est plus modifiable.</Notice>}

                {/* ---------- Infos ---------- */}
                <Section title="Infos" badge={<>{changedBadge(INFO_K)}{lockBadge(['rulesText'])}</>} defaultOpen={status === 'DRAFT'}>
                    <fieldset disabled={!editable} className="space-y-3">
                        <Field label="Nom"><input value={draft.name} onChange={(e) => set('name', e.target.value)} className={inputClass} /></Field>
                        <Field label="Description"><textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={3} className={inputClass} /></Field>
                        <div>
                            <div className="text-xs text-ink-2 mb-1">Image</div>
                            <div className="flex items-center gap-3">
                                {draft.imageFileId ? (
                                    <img src={sbcApiService.generateThumbnailUrl(draft.imageFileId, 160)} alt="" className="w-20 h-20 object-cover rounded-tile border border-border" />
                                ) : <div className="w-20 h-20 rounded-tile bg-surface-2 border border-border flex items-center justify-center text-2xl">🏆</div>}
                                {editable && (
                                    <div className="space-y-1">
                                        <label className={`${btnGhost} inline-block cursor-pointer`}>
                                            {uploading ? '…' : draft.imageFileId ? 'Changer' : 'Ajouter une image'}
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                        <Field label="Règlement" locked={lockedK('rulesText')} hint="Publié sur la page du défi. Verrouillé dès l’ouverture des inscriptions.">
                            <textarea value={draft.rulesText} onChange={(e) => set('rulesText', e.target.value)} rows={5} className={inputClass} />
                        </Field>
                    </fieldset>
                </Section>

                {/* ---------- Calendrier ---------- */}
                <Section title="Calendrier" badge={<>{changedBadge(SCHED_K)}{lockBadge(['startsAt'])}</>} defaultOpen={status === 'DRAFT'}>
                    {lockedK('startsAt') && !terminal && (
                        <Notice kind="info">🔒 Calendrier verrouillé depuis le lancement : seule la clôture des votes peut être repoussée librement. Toute autre modification passe par une demande validée par SBC.</Notice>
                    )}
                    <fieldset disabled={!editable} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="Ouverture des inscriptions" locked={lockedK('registrationOpensAt')}><input type="datetime-local" value={draft.registrationOpensAt} onChange={(e) => set('registrationOpensAt', e.target.value)} className={inputClass} /></Field>
                        <Field label="Clôture des inscriptions" locked={lockedK('registrationClosesAt')}><input type="datetime-local" value={draft.registrationClosesAt} onChange={(e) => set('registrationClosesAt', e.target.value)} className={inputClass} /></Field>
                        <Field label="Début du défi" locked={lockedK('startsAt')}><input type="datetime-local" value={draft.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputClass} /></Field>
                        <Field label="Fin du défi" locked={lockedK('endsAt')}><input type="datetime-local" value={draft.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={inputClass} /></Field>
                        <Field label="Ouverture des votes" locked={lockedK('votingOpensAt')}><input type="datetime-local" value={draft.votingOpensAt} onChange={(e) => set('votingOpensAt', e.target.value)} className={inputClass} /></Field>
                        <Field label="Clôture des votes" locked={lockedK('votingClosesAt')} hint={deadlineOnlyLater ? 'Peut seulement être repoussée (action journalisée).' : undefined}>
                            <input type="datetime-local" value={draft.votingClosesAt} onChange={(e) => set('votingClosesAt', e.target.value)} className={inputClass} />
                        </Field>
                        <Field label="Délai de grâce des paiements (min)" locked={lockedK('settlementGraceMin')} hint="Un paiement commencé avant la clôture compte s’il aboutit dans ce délai (0 à 120).">
                            <input type="number" min={0} max={120} value={draft.settlementGraceMin} onChange={(e) => set('settlementGraceMin', e.target.value)} className={inputClass} />
                        </Field>
                    </fieldset>
                    <div className="text-[11px] text-ink-3">Une date déjà enregistrée ne peut pas être effacée, seulement modifiée.</div>
                </Section>

                {/* ---------- Participation ---------- */}
                <Section title="Participation" badge={<>{changedBadge(PART_K)}{lockBadge(['pMode'])}</>}>
                    {lockedK('pMode') && !terminal && <Notice kind="info">🔒 Verrouillé depuis l’ouverture des inscriptions : toute modification passe par une demande validée par SBC.</Notice>}
                    <fieldset disabled={!editable} className="space-y-3">
                        <Field label="Qui peut participer ?">
                            <select value={draft.pMode} onChange={(e) => set('pMode', e.target.value)} className={inputClass}>
                                {PARTICIPATION_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </Field>
                        {draft.pMode === 'TICKET_TYPES' && <TicketTypePicker types={ticketTypes} value={draft.pTicketTypeIds} onChange={(v) => set('pTicketTypeIds', v)} />}
                        <Check label="Valider chaque candidature avant publication" checked={draft.requiresApproval} onChange={(v) => set('requiresApproval', v)} />
                        <Field label="Nombre maximum de candidats"><input type="number" min={1} value={draft.maxCandidates} onChange={(e) => set('maxCandidates', e.target.value)} className={inputClass} /></Field>
                        <Field label="Catégories (séparées par des virgules, optionnel)"><input value={draft.categories} onChange={(e) => set('categories', e.target.value)} placeholder="Ex. Homme, Femme, Enfant" className={inputClass} /></Field>
                        <Check label="Photo obligatoire" checked={draft.photoRequired} onChange={(v) => set('photoRequired', v)} />
                        <Check label="Vidéo autorisée" checked={draft.videoAllowed} onChange={(v) => set('videoAllowed', v)} />
                    </fieldset>
                </Section>

                {/* ---------- Votes ---------- */}
                <Section title="Votes" badge={<>{changedBadge(VOTE_K)}{lockBadge(['vMode'])}</>}>
                    {lockedK('vMode') && !terminal && <Notice kind="info">🔒 Les règles de vote sont verrouillées depuis le lancement du défi.</Notice>}
                    <fieldset disabled={!editable} className="space-y-3">
                        <Field label="Mode de vote" hint={VOTING_MODES.find((m) => m.value === draft.vMode)?.hint}>
                            <select value={draft.vMode} onChange={(e) => set('vMode', e.target.value)} className={inputClass}>
                                {VOTING_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </Field>
                        {draft.vMode !== 'NONE' && draft.vMode !== 'JURY' && (
                            <>
                                <Field label="Qui peut voter ?">
                                    <select value={draft.voterScope} onChange={(e) => set('voterScope', e.target.value)} className={inputClass}>
                                        {VOTER_SCOPES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </Field>
                                {draft.voterScope === 'TICKET_TYPES' && <TicketTypePicker types={ticketTypes} value={draft.voterTicketTypeIds} onChange={(v) => set('voterTicketTypeIds', v)} />}
                            </>
                        )}
                        {allowsFree(draft.vMode) && (
                            <div className="bg-surface-2 rounded-tile p-3 space-y-3">
                                <div className="text-sm font-semibold text-ink">Votes gratuits</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Field label="Votes par période"><input type="number" min={0} value={draft.perPeriod} onChange={(e) => set('perPeriod', e.target.value)} className={inputClass} /></Field>
                                    <Field label="Période">
                                        <select value={draft.period} onChange={(e) => set('period', e.target.value)} className={inputClass}>
                                            <option value="DAY">Par jour</option>
                                            <option value="CHALLENGE">Toute la durée</option>
                                        </select>
                                    </Field>
                                    <Field label="Max. pour un même candidat"><input type="number" min={1} value={draft.perCandidatePerPeriod} onChange={(e) => set('perCandidatePerPeriod', e.target.value)} placeholder="Illimité" className={inputClass} /></Field>
                                    <Field label="Total sur le défi"><input type="number" min={1} value={draft.totalPerChallenge} onChange={(e) => set('totalPerChallenge', e.target.value)} placeholder="Illimité" className={inputClass} /></Field>
                                </div>
                            </div>
                        )}
                        {draft.vMode !== 'NONE' && draft.vMode !== 'JURY' && (
                            <>
                                <Check label="Un candidat peut voter pour lui-même" checked={draft.selfVoteAllowed} onChange={(v) => set('selfVoteAllowed', v)} />
                                <Check label="Afficher le nombre de votes au public" checked={draft.showVoteCounts} onChange={(v) => set('showVoteCounts', v)} />
                            </>
                        )}
                    </fieldset>
                    {allowsPaid(draft.vMode) && (
                        allowsPaid(savedMode)
                            ? <PackagesCard eventId={eventId} cid={cid} status={status} canConfigure={editable} />
                            : <Notice kind="info">Enregistrez le mode de vote pour pouvoir ajouter des packs de votes payants.</Notice>
                    )}
                </Section>

                {/* ---------- Notation ---------- */}
                <Section title="Notation" badge={<>{changedBadge(SCORE_K)}{lockBadge(['method'])}</>}>
                    {lockedK('method') && !terminal && <Notice kind="info">🔒 La méthode de classement est verrouillée depuis le lancement du défi.</Notice>}
                    <fieldset disabled={!editable} className="space-y-3">
                        <Field label="Méthode de classement">
                            <select value={draft.method} onChange={(e) => set('method', e.target.value)} className={inputClass}>
                                {SCORING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </Field>
                        {draft.method === 'HYBRID' && (
                            <div className="grid grid-cols-2 gap-2">
                                <Field label="Poids du public (%)"><input type="number" min={0} max={100} value={draft.publicWeight} onChange={(e) => { set('publicWeight', e.target.value); set('juryWeight', String(Math.max(0, 100 - (Number(e.target.value) || 0)))); }} className={inputClass} /></Field>
                                <Field label="Poids du jury (%)"><input type="number" min={0} max={100} value={draft.juryWeight} onChange={(e) => { set('juryWeight', e.target.value); set('publicWeight', String(Math.max(0, 100 - (Number(e.target.value) || 0)))); }} className={inputClass} /></Field>
                            </div>
                        )}
                        {usesJury(draft.vMode) && (
                            <div className="bg-surface-2 rounded-tile p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold text-ink">Critères du jury</div>
                                    <span className={`text-xs font-semibold ${criteriaTotal === 100 ? 'text-success' : 'text-danger'}`}>Total : {criteriaTotal} / 100</span>
                                </div>
                                {draft.criteria.length === 0 && <div className="text-xs text-ink-2">Ajoutez au moins un critère (ex. Originalité, Présence scénique).</div>}
                                {draft.criteria.map((cr, i) => (
                                    <div key={cr.key || i} className="bg-surface border border-border rounded-tile p-2 space-y-2">
                                        <input value={cr.label} onChange={(e) => set('criteria', draft.criteria.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Nom du critère" className={inputClass} />
                                        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                            <Field label="Poids (%)"><input type="number" min={1} max={100} value={cr.weight} onChange={(e) => set('criteria', draft.criteria.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} className={inputClass} /></Field>
                                            <Field label="Note max."><input type="number" min={1} max={100} value={cr.maxScore} onChange={(e) => set('criteria', draft.criteria.map((x, j) => (j === i ? { ...x, maxScore: e.target.value } : x)))} className={inputClass} /></Field>
                                            <button type="button" onClick={() => set('criteria', draft.criteria.filter((_, j) => j !== i))} className={btnDanger} aria-label="Retirer le critère">✕</button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const keys = new Set(draft.criteria.map((x) => x.key));
                                        let n = draft.criteria.length + 1;
                                        while (keys.has(`c${n}`)) n++;
                                        set('criteria', [...draft.criteria, { key: `c${n}`, label: '', weight: '', maxScore: '10' }]);
                                    }}
                                    className={btnGhost}
                                >
                                    + Ajouter un critère
                                </button>
                            </div>
                        )}
                    </fieldset>
                    {usesJury(savedMode) && <JuryCard eventId={eventId} cid={cid} canConfigure={editable} approved={c.counters?.approved ?? 0} />}
                    {usesJury(draft.vMode) && !usesJury(savedMode) && <Notice kind="info">Enregistrez le mode de vote pour pouvoir composer le jury.</Notice>}
                </Section>

                {/* ---------- Égalités & récompenses ---------- */}
                <Section title="Égalités & récompenses de classement" badge={<>{changedBadge(TIE_K)}{lockBadge(['tieRule'])}</>}>
                    {lockedK('tieRule') && !terminal && <Notice kind="info">🔒 Verrouillé depuis le lancement du défi.</Notice>}
                    <fieldset disabled={!editable} className="space-y-3">
                        <div className="space-y-2">
                            <div className="text-xs text-ink-2">En cas d’égalité</div>
                            {TIE_RULES.map((t) => (
                                <label key={t.value} className={`flex items-start gap-2 border rounded-tile p-2 ${draft.tieRule === t.value ? 'border-primary bg-primary-soft' : 'border-border'}`}>
                                    <input type="radio" name="tieRule" checked={draft.tieRule === t.value} onChange={() => set('tieRule', t.value)} className="mt-1" />
                                    <span>
                                        <span className="block text-sm font-medium text-ink">{t.label}</span>
                                        <span className="block text-xs text-ink-2">{t.hint}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs text-ink-2">Récompenses remises au classement (au moment où le résultat est figé)</div>
                            {draft.rankRewards.map((r, i) => (
                                <div key={i} className="grid grid-cols-[70px_1fr_auto] gap-2 items-center">
                                    <input type="number" min={1} value={r.rank} onChange={(e) => set('rankRewards', draft.rankRewards.map((x, j) => (j === i ? { ...x, rank: e.target.value } : x)))} placeholder="Rang" className={inputClass} />
                                    <select value={r.rewardId} onChange={(e) => set('rankRewards', draft.rankRewards.map((x, j) => (j === i ? { ...x, rewardId: e.target.value } : x)))} className={inputClass}>
                                        <option value="">Choisir une récompense</option>
                                        {rewards.filter((rw) => rw.status !== 'CANCELLED').map((rw) => <option key={rw._id} value={rw._id}>{rw.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => set('rankRewards', draft.rankRewards.filter((_, j) => j !== i))} className={btnDanger} aria-label="Retirer">✕</button>
                                </div>
                            ))}
                            <button type="button" onClick={() => set('rankRewards', [...draft.rankRewards, { rank: String(draft.rankRewards.length + 1), rewardId: '' }])} className={btnGhost}>+ Ajouter un rang récompensé</button>
                            {rewards.length === 0 && (
                                <div className="text-xs text-ink-3">
                                    Aucune récompense. <button type="button" onClick={() => leave(`/events/organizer/${eventId}/animation/recompenses/nouveau`)} className="text-primary font-medium">Créer une récompense →</button>
                                </div>
                            )}
                        </div>
                    </fieldset>
                </Section>

                {/* ---------- operations ---------- */}
                <Section title="Candidats" badge={<Badge label={`${c.counters?.candidates ?? 0}`} tone="muted" />} defaultOpen={status !== 'DRAFT' && status !== 'PROGRAMMED'}>
                    <CandidatesCard eventId={eventId} cid={cid} canModerate={can('MODERATE') && !terminal && status !== 'RESULTS_PENDING'} categories={c.participation?.categories ?? []} canAdd={can('MODERATE') && idx < sIdx('VOTING_CLOSED') && status !== 'CANCELLED'} onChanged={() => reload(true)} />
                </Section>

                {can('MONEY') && allowsPaid(savedMode) && (
                    <Section title="Votes & paiements" badge={c.counters?.paidRevenue ? <Badge label={xaf(c.counters.paidRevenue)} tone="success" /> : undefined}>
                        <MoneyCard eventId={eventId} cid={cid} counters={c.counters ?? {}} />
                    </Section>
                )}

                {savedMode !== 'NONE' && idx >= sIdx('ACTIVE') && (
                    <Section title="Classement" badge={status === 'VOTING_OPEN' ? <Badge label="● En direct" tone="success" /> : undefined} defaultOpen={status === 'VOTING_OPEN'}>
                        <BoardCard eventId={eventId} cid={cid} live={status === 'VOTING_OPEN'} />
                    </Section>
                )}

                {can('RESULTS') && idx >= sIdx('VOTING_CLOSED') && (
                    <Section title="Résultat" defaultOpen>
                        <ResultCard eventId={eventId} cid={cid} challenge={c} eventSlug={eventSlug} onChanged={() => reload(true)} leave={leave} />
                    </Section>
                )}

                {can('CANCEL') && !terminal && <CancelChallenge eventId={eventId} cid={cid} paid={allowsPaid(savedMode)} onDone={() => reload(true)} />}
                {status === 'CANCELLED' && c.cancellation && (
                    <Notice kind="error">
                        Défi annulé le {fmtDateTime(c.cancellation.at)}. Motif : {c.cancellation.reason}.
                        {c.cancellation.refundedTransactions ? ` ${c.cancellation.refundedTransactions} paiement(s) remboursé(s).` : ''}
                    </Notice>
                )}

                {saveMsg && (
                    <Notice kind={saveMsg.kind}>
                        {saveMsg.text}
                        {saveMsg.list && saveMsg.list.length > 0 && <ul className="list-disc ml-5 mt-1">{saveMsg.list.map((e) => <li key={e}>{e}</li>)}</ul>}
                    </Notice>
                )}
                {lockedFields && lockedPatch && (
                    <ChangeRequestForm
                        eventId={eventId}
                        cid={cid}
                        fields={lockedFields}
                        patch={lockedPatch}
                        onCancel={() => { setLockedFields(null); setLockedPatch(null); }}
                        onSent={async () => {
                            setLockedFields(null); setLockedPatch(null);
                            setSaveMsg({ kind: 'success', text: 'Demande envoyée à l’équipe SBC. Vous serez notifié de sa décision.' });
                            await reload();
                        }}
                    />
                )}
            </div>

            {editable && changed.length > 0 && (
                // The app's bottom nav is hidden on this screen (App.tsx), so the bar docks at the bottom.
                <div className="fixed bottom-0 inset-x-0 bg-surface border-t border-primary p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 shadow-lg">
                    <div className="max-w-3xl mx-auto flex gap-2">
                        <button onClick={() => { setDraft(orig); setSaveMsg(null); setLockedFields(null); }} className={btnGhost}>Annuler</button>
                        <button onClick={save} disabled={saving} className={`flex-1 ${btnPrimary}`}>
                            {saving ? '…' : `Enregistrer (${changed.length} modification${changed.length > 1 ? 's' : ''})`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------- ticket types ----------

function TicketTypePicker({ types, value, onChange }: { types: any[] | null; value: string[]; onChange: (v: string[]) => void }) {
    if (types === null) return <div className="text-xs text-ink-3">Chargement des billets…</div>;
    if (types.length === 0) return <Notice kind="warn">Types de billets indisponibles (aucun billet, ou liste réservée à l’organisateur).</Notice>;
    return (
        <div className="bg-surface-2 rounded-tile p-3 space-y-1">
            <div className="text-xs text-ink-2">Types de billets</div>
            {types.map((tt) => (
                <Check
                    key={tt._id}
                    label={tt.name}
                    checked={value.includes(String(tt._id))}
                    onChange={(on) => onChange(on ? [...value, String(tt._id)] : value.filter((x) => x !== String(tt._id)))}
                />
            ))}
        </div>
    );
}

// ---------- status bar ----------

function StatusBar({ eventId, challenge: c, can, configErrors, eventSlug, onChanged, leave }: {
    eventId: string; challenge: any; can: (p: string) => boolean; configErrors: string[]; eventSlug?: string; onChanged: () => void; leave: (path: string) => void;
}) {
    const [confirm, setConfirm] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string; list?: string[] } | null>(null);
    const st = info(CHALLENGE_STATUS, c.status);
    const moves = NEXT[c.status] ?? [];

    const go = async (to: string) => {
        setBusy(true); setMsg(null);
        const res = await animationApi.manage.transition(eventId, c._id, to);
        setBusy(false); setConfirm(null);
        if (res.apiReportedSuccess) {
            setMsg({ kind: 'success', text: `Étape suivante : ${info(CHALLENGE_STATUS, to).label}.` });
            onChanged();
        } else {
            setMsg({ kind: 'error', text: errText(res), list: res.body?.code === 'INVALID_CONFIG' ? res.body?.details?.errors : undefined });
        }
    };

    const base = eventSlug ? challengePath(eventSlug, c.slug) : null;
    return (
        <div className="bg-surface border border-border rounded-card p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-ink-2">Étape</div>
                <Badge label={st.label} tone={st.tone} />
            </div>
            {c.suspendedAt && <Notice kind="error">Suspendu par l’équipe SBC{c.suspendedReason ? ` : ${c.suspendedReason}` : ''}. Inscriptions et votes sont refusés.</Notice>}

            {c.status === 'DRAFT' && (
                configErrors.length === 0
                    ? <div className="text-sm text-success">✓ Configuration complète : le défi peut être programmé.</div>
                    : (
                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-ink">À compléter avant de programmer</div>
                            <ul className="space-y-1">
                                {configErrors.map((e) => <li key={e} className="text-sm text-ink-2 flex gap-2"><span className="text-danger">○</span><span>{e}</span></li>)}
                            </ul>
                        </div>
                    )
            )}

            {can('TRANSITION') && moves.length > 0 && (
                <div className="space-y-2">
                    {!confirm && (
                        <div className="flex flex-wrap gap-2">
                            {moves.map((m, i) => (
                                <button key={m.to} onClick={() => { setConfirm(m.to); setMsg(null); }} disabled={busy} className={i === 0 && m.to !== 'DRAFT' ? `${btnPrimary} px-4 py-2 text-sm` : btnGhost}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {confirm && (
                        <div className="bg-surface-2 rounded-tile p-3 space-y-2">
                            <div className="text-sm text-ink">
                                {moves.find((m) => m.to === confirm)?.label} ?
                                {moves.find((m) => m.to === confirm)?.hint && <div className="text-xs text-ink-2 mt-0.5">{moves.find((m) => m.to === confirm)?.hint}</div>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => go(confirm)} disabled={busy} className={btnSecondary}>{busy ? '…' : 'Confirmer'}</button>
                                <button onClick={() => setConfirm(null)} className={btnGhost}>Annuler</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {msg && (
                <Notice kind={msg.kind}>
                    {msg.text}
                    {msg.list && msg.list.length > 0 && <ul className="list-disc ml-5 mt-1">{msg.list.map((e) => <li key={e}>{e}</li>)}</ul>}
                </Notice>
            )}

            {base && c.status !== 'DRAFT' && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
                    <button onClick={() => leave(base)} className="text-xs text-primary font-medium pt-2">Page publique →</button>
                    {can('LIVE') && (
                        <>
                            <button onClick={() => leave(`${base}/live`)} className="text-xs text-primary font-medium pt-2">Écran live →</button>
                            <button onClick={() => window.open(`${base}/live?tv=1`, '_blank', 'noopener')} className="text-xs text-primary font-medium pt-2">Mode TV ↗</button>
                        </>
                    )}
                </div>
            )}
            {!eventSlug && c.status !== 'DRAFT' && <div className="text-[11px] text-ink-3">Liens publics indisponibles (événement sans adresse publique).</div>}
        </div>
    );
}

// ---------- change request ----------

function ChangeRequestForm({ eventId, cid, fields, patch, onCancel, onSent }: {
    eventId: string; cid: string; fields: string[]; patch: Record<string, any>; onCancel: () => void; onSent: () => void;
}) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const send = async () => {
        if (!reason.trim()) { setError('Expliquez la raison de la modification.'); return; }
        setBusy(true); setError(null);
        const res = await animationApi.manage.requestChange(eventId, cid, patch, reason.trim());
        setBusy(false);
        if (res.apiReportedSuccess) onSent(); else setError(errText(res));
    };
    return (
        <div className="bg-accent-soft border border-border rounded-card p-3 space-y-2">
            <div className="text-sm font-semibold text-ink">🔒 Paramètres verrouillés</div>
            <div className="text-sm text-ink-2">Le défi est lancé : ces paramètres ne peuvent plus être modifiés directement.</div>
            <ul className="list-disc ml-5 text-sm text-ink">{fields.map((f) => <li key={f}>{pathLabel(f)}</li>)}</ul>
            <div className="text-xs text-ink-2">Vous pouvez demander la modification à l’équipe SBC, qui la validera ou la refusera.</div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Raison de la modification (obligatoire)" className={inputClass} />
            <div className="flex gap-2">
                <button onClick={send} disabled={busy} className={btnSecondary}>{busy ? '…' : 'Demander une modification'}</button>
                <button onClick={onCancel} className={btnGhost}>Fermer</button>
            </div>
            {error && <Notice kind="error">{error}</Notice>}
        </div>
    );
}

// ---------- packs ----------

function PackagesCard({ eventId, cid, status, canConfigure }: { eventId: string; cid: string; status: string; canConfigure: boolean }) {
    const [items, setItems] = useState<any[] | null>(null);
    const [label, setLabel] = useState('');
    const [votes, setVotes] = useState('');
    const [price, setPrice] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmArchive, setConfirmArchive] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const lockedForNew = sIdx(status) >= sIdx('ACTIVE') || status === 'CANCELLED';

    const load = useCallback(async () => {
        const res = await animationApi.manage.packages(eventId, cid);
        if (res.apiReportedSuccess) setItems(res.body.data ?? []); else setMsg({ kind: 'error', text: errText(res) });
    }, [eventId, cid]);
    useEffect(() => { load(); }, [load]);

    const add = async () => {
        const v = Number(votes); const p = Number(price);
        if (!label.trim()) { setMsg({ kind: 'error', text: 'Donnez un nom au pack.' }); return; }
        if (!Number.isInteger(v) || v < 1) { setMsg({ kind: 'error', text: 'Nombre de votes invalide.' }); return; }
        if (!Number.isInteger(p) || p < 100) { setMsg({ kind: 'error', text: 'Prix minimum : 100 XAF.' }); return; }
        setBusy('add'); setMsg(null);
        const res = await animationApi.manage.createPackage(eventId, cid, { label: label.trim(), votes: v, price: p });
        setBusy(null);
        if (res.apiReportedSuccess) { setLabel(''); setVotes(''); setPrice(''); setMsg({ kind: 'success', text: 'Pack ajouté.' }); load(); }
        else setMsg({ kind: 'error', text: errText(res) });
    };
    const archive = async (pid: string) => {
        setBusy(pid); setMsg(null);
        const res = await animationApi.manage.archivePackage(eventId, pid);
        setBusy(null); setConfirmArchive(null);
        if (res.apiReportedSuccess) load(); else setMsg({ kind: 'error', text: errText(res) });
    };

    return (
        <div className="border border-border rounded-tile p-3 space-y-2">
            <div className="text-sm font-semibold text-ink">Packs de votes payants</div>
            {items && items.length === 0 && <div className="text-xs text-ink-2">Aucun pack. Il en faut au moins un pour ouvrir les votes payants.</div>}
            {items?.map((p) => (
                <div key={p._id} className={`rounded-tile p-2 ${p.status === 'ARCHIVED' ? 'bg-surface-2' : 'bg-surface border border-border'}`}>
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-ink break-words">{p.label}</div>
                            <div className="text-xs text-ink-2">{p.votes} vote(s) · {xaf(p.price)}</div>
                        </div>
                        {p.status === 'ARCHIVED' ? <Badge label="Archivé" tone="muted" /> : canConfigure && confirmArchive !== p._id && (
                            <button onClick={() => setConfirmArchive(p._id)} className={btnGhost}>Archiver</button>
                        )}
                    </div>
                    {confirmArchive === p._id && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-ink-2">Le pack ne sera plus en vente (définitif).</span>
                            <button onClick={() => archive(p._id)} disabled={busy !== null} className={btnDanger}>{busy === p._id ? '…' : 'Confirmer'}</button>
                            <button onClick={() => setConfirmArchive(null)} className={btnGhost}>Annuler</button>
                        </div>
                    )}
                </div>
            ))}
            {canConfigure && (lockedForNew ? (
                <div className="text-xs text-ink-3">🔒 Les prix sont verrouillés depuis le lancement : aucun pack ne peut être ajouté, seulement archivé.</div>
            ) : (
                <div className="space-y-2 pt-1">
                    <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom du pack (ex. Pack Fan)" className={inputClass} />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" min={1} value={votes} onChange={(e) => setVotes(e.target.value)} placeholder="Votes" className={inputClass} />
                        <input type="number" min={100} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix XAF (≥ 100)" className={inputClass} />
                    </div>
                    <button onClick={add} disabled={busy !== null} className={`w-full ${btnSecondary}`}>{busy === 'add' ? '…' : 'Ajouter le pack'}</button>
                </div>
            ))}
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        </div>
    );
}

// ---------- jury ----------

function JuryCard({ eventId, cid, canConfigure, approved }: { eventId: string; cid: string; canConfigure: boolean; approved: number }) {
    const [items, setItems] = useState<any[] | null>(null);
    const [contact, setContact] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const [invite, setInvite] = useState<{ url: string; expiresAt: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        const res = await animationApi.manage.jury(eventId, cid);
        if (res.apiReportedSuccess) setItems(res.body.data ?? []); else setMsg({ kind: 'error', text: errText(res) });
    }, [eventId, cid]);
    useEffect(() => { load(); }, [load]);

    const add = async () => {
        if (!contact.trim()) { setMsg({ kind: 'error', text: 'Indiquez un email ou un numéro de téléphone.' }); return; }
        setBusy('add'); setMsg(null); setInvite(null); setCopied(false);
        const res = await animationApi.manage.addJuror(eventId, cid, { contact: contact.trim() });
        setBusy(null);
        if (!res.apiReportedSuccess) { setMsg({ kind: 'error', text: errText(res) }); return; }
        const d = res.body.data ?? {};
        if (d.invite?.token) {
            setInvite({ url: `${window.location.origin}/events/invitation/${d.invite.token}`, expiresAt: d.invite.expiresAt });
            setMsg({ kind: 'success', text: 'Pas encore de compte SBC : envoyez-lui ce lien d’invitation.' });
        } else setMsg({ kind: 'success', text: 'Juré ajouté.' });
        setContact('');
        load();
    };
    const remove = async (userId: string) => {
        setBusy(userId); setMsg(null);
        const res = await animationApi.manage.removeJuror(eventId, cid, userId);
        setBusy(null); setConfirmRemove(null);
        if (res.apiReportedSuccess) load(); else setMsg({ kind: 'error', text: errText(res) });
    };

    return (
        <div className="border border-border rounded-tile p-3 space-y-2">
            <div className="text-sm font-semibold text-ink">Jury</div>
            {items && items.length === 0 && <div className="text-xs text-ink-2">Aucun juré. Il en faut au moins un pour ouvrir les votes.</div>}
            {items?.map((j) => (
                <div key={j._id} className="bg-surface border border-border rounded-tile p-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-ink break-words">{j.name}</div>
                            <div className="text-xs text-ink-2">{j.submitted ?? 0} / {approved} candidat(s) noté(s)</div>
                        </div>
                        {canConfigure && confirmRemove !== String(j.userId) && <button onClick={() => setConfirmRemove(String(j.userId))} className={btnDanger}>Retirer</button>}
                    </div>
                    {confirmRemove === String(j.userId) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-xs text-ink-2">Ses notes cesseront de compter.</span>
                            <button onClick={() => remove(String(j.userId))} disabled={busy !== null} className={btnDanger}>{busy === String(j.userId) ? '…' : 'Confirmer'}</button>
                            <button onClick={() => setConfirmRemove(null)} className={btnGhost}>Annuler</button>
                        </div>
                    )}
                </div>
            ))}
            {canConfigure && (
                <div className="flex gap-2 pt-1">
                    <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email ou téléphone du juré" className={inputClass} />
                    <button onClick={add} disabled={busy !== null} className={btnSecondary}>{busy === 'add' ? '…' : 'Ajouter'}</button>
                </div>
            )}
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            {invite && (
                <div className="bg-surface-2 rounded-tile p-3 space-y-2">
                    <div className="text-xs text-ink-2 break-all">{invite.url}</div>
                    <div className="flex items-center gap-2">
                        <button onClick={async () => { try { await navigator.clipboard.writeText(invite.url); setCopied(true); } catch { setCopied(false); } }} className={btnSecondary}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</button>
                        <span className="text-[11px] text-ink-3">Valable jusqu’au {fmtDateTime(invite.expiresAt)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------- candidates ----------

const CAND_FILTERS: { value: string; label: string }[] = [
    { value: 'PENDING', label: 'En attente' },
    { value: 'APPROVED', label: 'Validés' },
    { value: 'REJECTED', label: 'Refusés' },
    { value: 'DISQUALIFIED', label: 'Disqualifiés' },
    { value: 'WITHDRAWN', label: 'Retirés' },
    { value: '', label: 'Tous' },
];

function CandidatesCard({ eventId, cid, canModerate, canAdd, categories, onChanged }: { eventId: string; cid: string; canModerate: boolean; canAdd: boolean; categories: string[]; onChanged: () => void }) {
    const [status, setStatus] = useState('PENDING');
    const [qInput, setQInput] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<{ items: any[]; total: number; totalPages: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [qInput]);

    const load = useCallback(async () => {
        const res = await animationApi.manage.candidates(eventId, cid, { status: status || undefined, q: q || undefined, page, limit: 20 });
        if (res.apiReportedSuccess) { setData(res.body.data); setError(null); } else setError(errText(res));
    }, [eventId, cid, status, q, page]);
    useEffect(() => { load(); }, [load]);

    return (
        <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
                {CAND_FILTERS.map((f) => (
                    <button
                        key={f.value || 'all'}
                        onClick={() => { setStatus(f.value); setPage(1); }}
                        className={`shrink-0 rounded-pill px-3 py-1 text-xs font-medium border ${status === f.value ? 'bg-primary text-white border-primary' : 'bg-surface text-ink-2 border-border'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Rechercher un nom ou un numéro" className={inputClass} />

            {canAdd && !adding && <button onClick={() => setAdding(true)} className={`w-full ${btnSecondary}`}>+ Ajouter un candidat</button>}
            {adding && <AddCandidate eventId={eventId} cid={cid} categories={categories} onClose={() => setAdding(false)} onAdded={() => { load(); onChanged(); }} />}

            {error && <Notice kind="error">{error}</Notice>}
            {!data && !error && <div className="text-sm text-ink-2">Chargement…</div>}
            {data && data.items.length === 0 && <div className="text-sm text-ink-2">Aucun candidat dans cette liste.</div>}
            <div className="space-y-2">
                {data?.items.map((cand) => <CandidateRow key={cand._id} cand={cand} eventId={eventId} canModerate={canModerate} onDone={() => { load(); onChanged(); }} />)}
            </div>
            {data && <Pager page={page} totalPages={data.totalPages} onPage={setPage} />}
        </div>
    );
}

function CandidateRow({ cand, eventId, canModerate, onDone }: { cand: any; eventId: string; canModerate: boolean; onDone: () => void }) {
    const [action, setAction] = useState<'reject' | 'disqualify' | null>(null);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const st = info(CANDIDATE_STATUS, cand.status);

    const act = async (a: 'approve' | 'reject' | 'disqualify') => {
        if (a !== 'approve' && !reason.trim()) { setError('Indiquez le motif.'); return; }
        setBusy(true); setError(null);
        const res = await animationApi.manage.moderate(eventId, cand._id, a, a === 'approve' ? undefined : reason.trim());
        setBusy(false);
        if (res.apiReportedSuccess) { setAction(null); setReason(''); onDone(); } else setError(errText(res));
    };

    const lastReason = [...(cand.statusHistory ?? [])].reverse().find((h: any) => h.reason)?.reason;
    return (
        <div className="bg-surface border border-border rounded-tile p-2 space-y-2">
            <div className="flex items-start gap-3">
                {cand.photoFileId ? (
                    <img src={sbcApiService.generateThumbnailUrl(cand.photoFileId, 96)} alt="" className="w-12 h-12 rounded-tile object-cover shrink-0 border border-border" />
                ) : <div className="w-12 h-12 rounded-tile bg-surface-2 border border-border shrink-0 flex items-center justify-center text-ink-3 text-xs">n°{cand.number}</div>}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium text-ink break-words">n°{cand.number} · {cand.displayName}</div>
                        <Badge label={st.label} tone={st.tone} />
                    </div>
                    <div className="text-xs text-ink-2">
                        {cand.category ? `${cand.category} · ` : ''}{(cand.totalVotes ?? 0).toLocaleString('fr-FR')} vote(s)
                        {cand.juryCount ? ` · jury ${cand.juryScore}/100` : ''}
                        {cand.addedByOrganizer ? ' · ajouté par l’organisateur' : ''}
                    </div>
                    {lastReason && ['REJECTED', 'DISQUALIFIED'].includes(cand.status) && <div className="text-xs text-ink-3 break-words">Motif : {lastReason}</div>}
                    {cand.description && <div className="text-xs text-ink-3 line-clamp-2 break-words">{cand.description}</div>}
                </div>
            </div>
            {canModerate && !action && (
                <div className="flex flex-wrap gap-2">
                    {['PENDING', 'REJECTED'].includes(cand.status) && <button onClick={() => act('approve')} disabled={busy} className={btnSecondary}>{busy ? '…' : 'Valider'}</button>}
                    {cand.status === 'PENDING' && <button onClick={() => setAction('reject')} className={btnGhost}>Refuser</button>}
                    {['PENDING', 'APPROVED'].includes(cand.status) && <button onClick={() => setAction('disqualify')} className={btnDanger}>Disqualifier</button>}
                </div>
            )}
            {action && (
                <div className={`rounded-tile p-2 space-y-2 ${action === 'disqualify' ? 'bg-danger-soft' : 'bg-surface-2'}`}>
                    {action === 'disqualify' && (
                        <div className="text-xs text-danger">
                            La disqualification est définitive : le candidat sort du classement et en est notifié.
                            {cand.paidVotes > 0 ? ` Ses ${cand.paidVotes.toLocaleString('fr-FR')} votes payants seront remboursés intégralement aux acheteurs et retirés de vos gains.` : ''}
                        </div>
                    )}
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif (obligatoire, communiqué au candidat)" className={inputClass} />
                    <div className="flex gap-2">
                        <button onClick={() => act(action)} disabled={busy} className={action === 'disqualify' ? btnDangerFill : btnSecondary}>
                            {busy ? '…' : action === 'disqualify' ? 'Confirmer la disqualification' : 'Confirmer le refus'}
                        </button>
                        <button onClick={() => { setAction(null); setError(null); }} className={btnGhost}>Retour</button>
                    </div>
                </div>
            )}
            {error && <Notice kind="error">{error}</Notice>}
        </div>
    );
}

function AddCandidate({ eventId, cid, categories, onClose, onAdded }: { eventId: string; cid: string; categories: string[]; onClose: () => void; onAdded: () => void }) {
    const [contact, setContact] = useState('');
    const [found, setFound] = useState<any>(null);
    const [displayName, setDisplayName] = useState('');
    const [photoFileId, setPhotoFileId] = useState('');
    const [category, setCategory] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

    const lookup = async () => {
        if (!contact.trim()) return;
        setBusy('lookup'); setMsg(null); setFound(null);
        const res = await animationApi.manage.lookupMember(eventId, contact.trim());
        setBusy(null);
        if (!res.apiReportedSuccess) { setMsg({ kind: 'error', text: errText(res) }); return; }
        const d = res.body.data ?? {};
        if (d.ambiguous) setMsg({ kind: 'error', text: 'Plusieurs comptes correspondent : indiquez le numéro complet avec l’indicatif.' });
        else if (!d.found) setMsg({ kind: 'error', text: 'Aucun compte SBC avec ce contact : la personne doit d’abord créer un compte.' });
        else { setFound(d); setDisplayName(d.name ?? ''); }
    };
    const upload = async (file?: File | null) => {
        if (!file) return;
        setBusy('upload');
        const res = await sbcApiService.uploadFile(file);
        setBusy(null);
        if (res.apiReportedSuccess && res.body?.data?.fileId) setPhotoFileId(res.body.data.fileId);
        else setMsg({ kind: 'error', text: errText(res) || 'Envoi de la photo impossible.' });
    };
    const add = async () => {
        if (!found?.userId) return;
        if (!displayName.trim()) { setMsg({ kind: 'error', text: 'Indiquez le nom affiché.' }); return; }
        setBusy('add'); setMsg(null);
        const res = await animationApi.manage.addCandidate(eventId, cid, { userId: found.userId, displayName: displayName.trim(), photoFileId: photoFileId || undefined, category: category || undefined });
        setBusy(null);
        if (res.apiReportedSuccess) {
            setMsg({ kind: 'success', text: `Candidat n°${res.body.data?.number ?? ''} ajouté et validé.` });
            setFound(null); setContact(''); setDisplayName(''); setPhotoFileId(''); setCategory('');
            onAdded();
        } else setMsg({ kind: 'error', text: errText(res) });
    };

    return (
        <div className="border border-primary rounded-tile p-3 space-y-2">
            <div className="text-sm font-semibold text-ink">Ajouter un candidat</div>
            <div className="text-xs text-ink-2">Le candidat doit avoir un compte SBC. Il est validé directement.</div>
            <div className="flex gap-2">
                <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email ou téléphone" className={inputClass} />
                <button onClick={lookup} disabled={busy !== null} className={btnGhost}>{busy === 'lookup' ? '…' : 'Chercher'}</button>
            </div>
            {found && (
                <div className="space-y-2">
                    <div className="bg-surface-2 rounded-tile p-2 text-sm text-ink">
                        ✓ {found.name ?? 'Membre SBC'}{found.contactHint ? <span className="text-xs text-ink-3"> · {found.contactHint}</span> : null}
                    </div>
                    <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nom affiché" className={inputClass} />
                    {categories.length > 0 && (
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                            <option value="">Catégorie (optionnel)</option>
                            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    )}
                    <div className="flex items-center gap-3">
                        {photoFileId && <img src={sbcApiService.generateThumbnailUrl(photoFileId, 96)} alt="" className="w-12 h-12 rounded-tile object-cover border border-border" />}
                        <label className={`${btnGhost} inline-block cursor-pointer`}>
                            {busy === 'upload' ? '…' : photoFileId ? 'Changer la photo' : 'Ajouter une photo'}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                        </label>
                    </div>
                    <button onClick={add} disabled={busy !== null} className={`w-full ${btnSecondary}`}>{busy === 'add' ? '…' : 'Ajouter le candidat'}</button>
                </div>
            )}
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <button onClick={onClose} className="text-xs text-ink-2">Fermer</button>
        </div>
    );
}

// ---------- money ----------

function MoneyCard({ eventId, cid, counters }: { eventId: string; cid: string; counters: any }) {
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<{ items: any[]; total: number; totalPages: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const res = await animationApi.manage.transactions(eventId, cid, { status: status || undefined, page, limit: 20 });
            if (res.apiReportedSuccess) { setData(res.body.data); setError(null); } else setError(errText(res));
        })();
    }, [eventId, cid, status, page]);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-2 rounded-tile p-2 text-center"><div className="text-[11px] text-ink-2">Votes payants</div><div className="font-bold text-ink">{(counters.paidVotes ?? 0).toLocaleString('fr-FR')}</div></div>
                <div className="bg-surface-2 rounded-tile p-2 text-center"><div className="text-[11px] text-ink-2">Paiements</div><div className="font-bold text-ink">{counters.paidTransactions ?? 0}</div></div>
                <div className="bg-surface-2 rounded-tile p-2 text-center"><div className="text-[11px] text-ink-2">Revenus bruts</div><div className="font-bold text-success text-sm">{xaf(counters.paidRevenue ?? 0)}</div></div>
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputClass}>
                <option value="">Tous les paiements</option>
                {Object.entries(VOTE_TX_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {error && <Notice kind="error">{error}</Notice>}
            {data && data.items.length === 0 && <div className="text-sm text-ink-2">Aucun paiement.</div>}
            <div className="space-y-2">
                {data?.items.map((tx) => {
                    const st = info(VOTE_TX_STATUS, tx.status);
                    return (
                        <div key={tx._id} className="bg-surface border border-border rounded-tile p-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-ink">{xaf(tx.amount)} · {tx.votes} vote(s)</div>
                                    <div className="text-xs text-ink-2 break-words">{tx.packageSnapshot?.label ?? 'Pack'} · net {xaf(tx.organizerNet)}</div>
                                    <div className="text-[11px] text-ink-3">{fmtDateTime(tx.createdAt)}{tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}</div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <Badge label={st.label} tone={st.tone} />
                                    {tx.fraud?.review === 'PENDING' && <Badge label="⚠️ À vérifier" tone="accent" />}
                                    {tx.fraud?.review === 'CONFIRMED' && <Badge label="Fraude confirmée" tone="danger" />}
                                    {tx.lateSettlement && <Badge label="Hors délai" tone="muted" />}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {data && <Pager page={page} totalPages={data.totalPages} onPage={setPage} />}
        </div>
    );
}

// ---------- board ----------

function BoardCard({ eventId, cid, live }: { eventId: string; cid: string; live: boolean }) {
    const [board, setBoard] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await animationApi.manage.board(eventId, cid);
        setLoading(false);
        if (res.apiReportedSuccess) { setBoard(res.body.data); setError(null); } else setError(errText(res));
    }, [eventId, cid]);
    useEffect(() => {
        load();
        if (!live) return;
        const t = setInterval(load, 5000);
        return () => clearInterval(t);
    }, [load, live]);

    const scoreOf = (e: any) => {
        if (!board) return '—';
        if (board.scoringMethod === 'VOTES') return e.totalVotes != null ? `${e.totalVotes.toLocaleString('fr-FR')} votes` : '—';
        if (board.scoringMethod === 'JURY') return `${e.juryScore ?? 0} / 100`;
        return `${((e.score ?? 0) / 1000).toFixed(2)} pts`;
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-ink-2">
                    {board ? `${board.totals?.candidates ?? 0} candidat(s)${board.showVoteCounts ? ` · ${(board.totals?.votes ?? 0).toLocaleString('fr-FR')} votes` : ''}` : ''}
                    {live && ' · actualisé toutes les 5 s'}
                </div>
                <button onClick={load} disabled={loading} className={btnGhost}>{loading ? '…' : 'Actualiser'}</button>
            </div>
            {board && !board.showVoteCounts && <div className="text-[11px] text-ink-3">Nombre de votes masqué (option « Afficher le nombre de votes » désactivée).</div>}
            {error && <Notice kind="error">{error}</Notice>}
            {board && (board.entries ?? []).length === 0 && <div className="text-sm text-ink-2">Aucun candidat validé.</div>}
            <ol className="space-y-1">
                {board?.entries?.map((e: any) => (
                    <li key={e.candidateId} className="flex items-center gap-3 bg-surface border border-border rounded-tile p-2">
                        <span className={`w-8 text-center font-bold ${e.rank <= 3 ? 'text-accent' : 'text-ink-2'}`}>{e.rank}</span>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-ink truncate">n°{e.number} · {e.displayName}</div>
                            {e.category && <div className="text-[11px] text-ink-3">{e.category}</div>}
                        </div>
                        <span className="text-sm font-semibold text-ink shrink-0">{scoreOf(e)}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

// ---------- result ----------

function ResultCard({ eventId, cid, challenge: c, eventSlug, onChanged, leave }: { eventId: string; cid: string; challenge: any; eventSlug?: string; onChanged: () => void; leave: (path: string) => void }) {
    const [result, setResult] = useState<any>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const [confirmFreeze, setConfirmFreeze] = useState(false);
    const [opens, setOpens] = useState('');
    const [closes, setCloses] = useState('');
    const [secondRoundId, setSecondRoundId] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await animationApi.manage.result(eventId, cid);
        if (res.apiReportedSuccess) { setResult(res.body.data ?? null); setError(null); } else setError(errText(res));
    }, [eventId, cid]);
    useEffect(() => { load(); }, [load]);

    const run = async (key: string, fn: () => Promise<ApiResponse>, ok: string, codes: Record<string, string> = {}) => {
        setBusy(key); setMsg(null);
        const res = await fn();
        setBusy(null);
        if (res.apiReportedSuccess) { setMsg({ kind: 'success', text: ok }); await load(); onChanged(); return res; }
        setMsg({ kind: 'error', text: codes[res.body?.code] ?? errText(res) });
        return null;
    };

    const freeze = () => run('freeze', () => animationApi.manage.freeze(eventId, cid), 'Résultat figé : les récompenses de classement ont été attribuées et le défi est terminé.', {
        FRAUD_REVIEW_PENDING: 'Des activités suspectes sont en cours de vérification par l’équipe SBC. Vous pourrez figer le résultat après leur examen.',
        TIES_PENDING: 'Des égalités doivent d’abord être départagées.',
    }).then(() => setConfirmFreeze(false));

    const launchSecondRound = async () => {
        if (!opens || !closes) { setMsg({ kind: 'error', text: 'Indiquez l’ouverture et la clôture des votes du second tour.' }); return; }
        const res = await run('second', () => animationApi.manage.secondRound(eventId, cid, { votingOpensAt: fromLocalInput(opens)!, votingClosesAt: fromLocalInput(closes)! }), 'Second tour créé (en brouillon) avec les candidats à égalité.');
        if (res) setSecondRoundId(res.body.data?._id ?? null);
    };

    if (error) return <Notice kind="error">{error}</Notice>;
    if (result === undefined) return <div className="text-sm text-ink-2">Chargement…</div>;

    const pending = c.status === 'RESULTS_PENDING';
    if (!result) {
        return (
            <div className="space-y-2">
                {pending ? (
                    <>
                        <div className="text-sm text-ink-2">Aucun résultat calculé pour l’instant.</div>
                        <button onClick={() => run('compute', () => animationApi.manage.computeResult(eventId, cid), 'Résultat calculé.')} disabled={busy !== null} className={`w-full ${btnSecondary}`}>{busy === 'compute' ? '…' : 'Calculer le résultat'}</button>
                    </>
                ) : (
                    <div className="text-sm text-ink-2">Le résultat sera calculé au passage à « Résultats en préparation » (après le délai de grâce des paiements).</div>
                )}
                {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            </div>
        );
    }

    const rs = RESULT_STATUS[result.status] ?? { label: result.status, tone: 'muted' as Tone };
    const entries: any[] = [...(result.entries ?? [])].sort((a, b) => a.rank - b.rank);
    const byId = new Map(entries.map((e) => [String(e.candidateId), e]));
    const srId = secondRoundId ?? (result.secondRoundChallengeId ? String(result.secondRoundChallengeId) : null);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-ink-2">Calculé le {fmtDateTime(result.computedAt)}</div>
                <Badge label={rs.label} tone={rs.tone} />
            </div>

            <ol className="space-y-1">
                {entries.map((e) => (
                    <li key={String(e.candidateId)} className="flex items-center gap-3 bg-surface border border-border rounded-tile p-2">
                        <span className={`w-8 text-center font-bold ${e.rank <= 3 ? 'text-accent' : 'text-ink-2'}`}>{e.rank}</span>
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-ink truncate">n°{e.number} · {e.displayName}</div>
                            <div className="text-[11px] text-ink-3">
                                {e.totalVotes} votes ({e.freeVotes} gratuits · {e.paidVotes} payants){e.juryScore ? ` · jury ${e.juryScore}/100` : ''}
                                {e.sharedRank ? ' · ex æquo' : ''}
                            </div>
                        </div>
                        <span className="text-sm font-semibold text-ink shrink-0">{((e.score ?? 0) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</span>
                    </li>
                ))}
            </ol>

            {(result.ties ?? []).length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-semibold text-ink">Égalités ({result.ties.length})</div>
                    {result.status === 'AWAITING_TIE_DECISION' && pending
                        ? result.ties.map((t: any) => <TieResolver key={t.rank} eventId={eventId} cid={cid} tie={t} byId={byId} onDone={async () => { await load(); }} />)
                        : result.ties.map((t: any) => (
                            <div key={t.rank} className="bg-surface-2 rounded-tile p-2 text-sm text-ink-2">
                                Rang {t.rank} : {t.candidateIds.map((id: string) => { const e = byId.get(String(id)); return e ? `n°${e.number} ${e.displayName}` : '?'; }).join(', ')}
                            </div>
                        ))}
                </div>
            )}

            {result.tieResolution?.note && (
                <Notice kind="info">Décision d’égalité : {result.tieResolution.note}</Notice>
            )}

            {result.status === 'AWAITING_SECOND_ROUND' && (
                srId ? (
                    <Notice kind="info">
                        Second tour en cours.{' '}
                        <button onClick={() => leave(`/events/organizer/${eventId}/animation/defis/${srId}`)} className="text-primary font-medium underline">Ouvrir le second tour →</button>
                        <div className="text-xs mt-1">Programmez-le puis ouvrez les votes ; quand son résultat sera figé, l’égalité sera tranchée ici automatiquement.</div>
                    </Notice>
                ) : pending && (
                    <div className="bg-surface-2 rounded-tile p-3 space-y-2">
                        <div className="text-sm text-ink">Lancer un second tour entre les candidats à égalité</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Field label="Ouverture des votes"><input type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} className={inputClass} /></Field>
                            <Field label="Clôture des votes"><input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} className={inputClass} /></Field>
                        </div>
                        <button onClick={launchSecondRound} disabled={busy !== null} className={`w-full ${btnSecondary}`}>{busy === 'second' ? '…' : 'Créer le second tour'}</button>
                    </div>
                )
            )}

            {pending && result.status !== 'FROZEN' && (
                <button onClick={() => run('compute', () => animationApi.manage.computeResult(eventId, cid), 'Résultat recalculé depuis le registre des votes.')} disabled={busy !== null} className={`w-full ${btnGhost}`}>
                    {busy === 'compute' ? '…' : 'Recalculer depuis le registre des votes'}
                </button>
            )}

            {result.status === 'COMPUTED' && pending && (
                !confirmFreeze ? (
                    <button onClick={() => setConfirmFreeze(true)} className={`w-full ${btnPrimary}`}>Figer le résultat</button>
                ) : (
                    <div className="bg-accent-soft border border-border rounded-tile p-3 space-y-2">
                        <div className="text-sm text-ink">Figer est définitif : le classement ne pourra plus changer, les récompenses de classement seront attribuées et le défi passera à « Terminé ».</div>
                        <div className="flex gap-2">
                            <button onClick={freeze} disabled={busy !== null} className={btnSecondary}>{busy === 'freeze' ? '…' : 'Confirmer'}</button>
                            <button onClick={() => setConfirmFreeze(false)} className={btnGhost}>Annuler</button>
                        </div>
                    </div>
                )
            )}

            {result.status === 'FROZEN' && (
                <div className="space-y-2">
                    <div className="text-xs text-ink-2">Figé le {fmtDateTime(result.frozenAt)} · empreinte <span className="font-mono">{String(result.inputsHash ?? '').slice(0, 12)}</span></div>
                    {result.publishedAt ? (
                        <Notice kind="success">
                            Publié le {fmtDateTime(result.publishedAt)}.
                            {eventSlug && <> <button onClick={() => leave(`${challengePath(eventSlug, c.slug)}/resultats`)} className="underline font-medium">Voir la page des résultats →</button></>}
                        </Notice>
                    ) : (
                        <button onClick={() => run('publish', () => animationApi.manage.publish(eventId, cid), 'Résultat publié : les candidats sont notifiés.')} disabled={busy !== null} className={`w-full ${btnPrimary}`}>
                            {busy === 'publish' ? '…' : 'Publier le résultat'}
                        </button>
                    )}
                </div>
            )}

            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
        </div>
    );
}

function TieResolver({ eventId, cid, tie, byId, onDone }: { eventId: string; cid: string; tie: any; byId: Map<string, any>; onDone: () => void }) {
    const [order, setOrder] = useState<string[]>(() => tie.candidateIds.map(String));
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const move = (i: number, dir: -1 | 1) => setOrder((o) => {
        const j = i + dir;
        if (j < 0 || j >= o.length) return o;
        const n = [...o];
        [n[i], n[j]] = [n[j], n[i]];
        return n;
    });
    const submit = async () => {
        if (!note.trim()) { setError('Expliquez la décision : elle est publiée avec le résultat.'); return; }
        setBusy(true); setError(null);
        const res = await animationApi.manage.resolveTie(eventId, cid, { rank: tie.rank, order, note: note.trim() });
        setBusy(false);
        if (res.apiReportedSuccess) onDone(); else setError(errText(res));
    };

    return (
        <div className="bg-surface-2 rounded-tile p-3 space-y-2">
            <div className="text-sm font-semibold text-ink">Égalité au rang {tie.rank}</div>
            <div className="text-xs text-ink-2">Ordonnez les candidats du meilleur au moins bon.</div>
            {order.map((id, i) => {
                const e = byId.get(id);
                return (
                    <div key={id} className="flex items-center gap-2 bg-surface border border-border rounded-tile p-2">
                        <span className="w-10 text-center font-bold text-ink-2">{tie.rank + i}</span>
                        <span className="flex-1 min-w-0 text-sm text-ink truncate">{e ? `n°${e.number} · ${e.displayName}` : id}</span>
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="px-2 py-1 border border-border rounded-tile text-sm disabled:opacity-40" aria-label="Monter">▲</button>
                        <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="px-2 py-1 border border-border rounded-tile text-sm disabled:opacity-40" aria-label="Descendre">▼</button>
                    </div>
                );
            })}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Motif de la décision (obligatoire, publié)" className={inputClass} />
            <button onClick={submit} disabled={busy} className={`w-full ${btnSecondary}`}>{busy ? '…' : 'Valider cet ordre'}</button>
            {error && <Notice kind="error">{error}</Notice>}
        </div>
    );
}

// ---------- cancel ----------

function CancelChallenge({ eventId, cid, paid, onDone }: { eventId: string; cid: string; paid: boolean; onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    const submit = async () => {
        if (!reason.trim()) { setError('Indiquez le motif de l’annulation.'); return; }
        setBusy(true); setError(null);
        const res = await animationApi.manage.cancel(eventId, cid, reason.trim());
        setBusy(false);
        if (res.apiReportedSuccess) {
            const n = res.body.data?.refundedTransactions ?? 0;
            setDone(`Défi annulé.${n ? ` ${n} paiement(s) remboursé(s).` : ''}`);
            setOpen(false);
            onDone();
        } else setError(errText(res));
    };

    return (
        <div className="bg-surface border border-border rounded-card p-3 space-y-2">
            {done && <Notice kind="success">{done}</Notice>}
            {!open ? (
                <button onClick={() => setOpen(true)} className={`w-full ${btnDanger}`}>Annuler le défi</button>
            ) : (
                <>
                    <div className="bg-danger-soft rounded-tile p-3 text-sm text-danger">
                        L’annulation est définitive. Les candidats sont prévenus.
                        {paid && <div className="mt-1 font-semibold">Tous les votes payants seront intégralement remboursés.</div>}
                    </div>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motif (obligatoire, communiqué aux participants)" className={inputClass} />
                    <div className="flex gap-2">
                        <button onClick={submit} disabled={busy} className={btnDangerFill}>{busy ? '…' : 'Confirmer l’annulation'}</button>
                        <button onClick={() => { setOpen(false); setError(null); }} className={btnGhost}>Retour</button>
                    </div>
                </>
            )}
            {error && <Notice kind="error">{error}</Notice>}
        </div>
    );
}
