import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { animationApi } from '../../services/animationApi';
import { sbcApiService } from '../../services/SBCApiService';
import type { ApiResponse } from '../../services/ApiResponse';
import { TONE_CLASS, xaf, type Tone } from '../../lib/eventStatus';
import {
    ELIGIBILITY_SCOPES, REWARD_STATUS, REWARD_TYPES, RULE_KINDS, RULE_TRIGGERS, WINNER_STATUS,
    describeRule, errorMessage, fmtDateTime, fromLocalInput, info, toLocalInput,
} from '../../lib/animation';

// ---------- shared bits ----------

const inputClass = 'w-full bg-surface border border-border rounded-tile px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-primary disabled:bg-surface-2 disabled:text-ink-3';
const btnPrimary = 'bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-tile transition-colors disabled:opacity-60';
const btnSecondary = 'bg-surface border border-primary text-primary font-semibold py-2 px-3 rounded-tile text-sm disabled:opacity-60';
const btnGhost = 'bg-surface border border-border text-ink-2 font-medium py-2 px-3 rounded-tile text-sm disabled:opacity-60';
const btnDanger = 'bg-surface border border-danger text-danger font-semibold py-2 px-3 rounded-tile text-sm disabled:opacity-60';

const errText = (res: ApiResponse) => (res.statusCode === 401 ? 'Session expirée : reconnectez-vous.' : errorMessage(res));
const shortId = (id?: string) => (id ? `…${String(id).slice(-6)}` : '—');

function Badge({ label, tone }: { label: string; tone: Tone }) {
    return <span className={`inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[tone]}`}>{label}</span>;
}
function Notice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
    const cls = kind === 'error' ? 'bg-danger-soft text-danger' : kind === 'success' ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-2';
    return <div className={`${cls} border border-border rounded-tile p-3 text-sm`}>{children}</div>;
}
function Card({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
    return (
        <div className="bg-surface border border-border rounded-card p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {right}
            </div>
            {children}
        </div>
    );
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
    return (
        <label className="block text-xs text-ink-2">
            {label}
            <div className="mt-1">{children}</div>
            {hint && <div className="text-[11px] text-ink-3 mt-0.5">{hint}</div>}
        </label>
    );
}

const FIELD_LABEL: Record<string, string> = {
    type: 'Type', quantity: 'Quantité', estimatedValue: 'Valeur estimée', conditionsText: 'Conditions',
    startsAt: 'Début', endsAt: 'Fin', challengeId: 'Défi lié',
};
const RULE_STATUS: Record<string, { label: string; tone: Tone }> = {
    ACTIVE: { label: 'Active', tone: 'success' },
    DRAFT: { label: 'Brouillon', tone: 'accent' },
    SUPERSEDED: { label: 'Remplacée', tone: 'muted' },
};
const TRIGGERED = ['POSITION', 'PERIODIC', 'ACTION'];
const kindLabel = (k: string) => (k === 'CHALLENGE_RANK' ? 'Classement d’un défi' : RULE_KINDS.find((x) => x.value === k)?.label ?? k);

type RewardForm = {
    name: string; description: string; imageFileId: string; type: string; customTypeLabel: string;
    estimatedValue: string; quantity: string; conditionsText: string; startsAt: string; endsAt: string; challengeId: string;
};
const EMPTY: RewardForm = {
    name: '', description: '', imageFileId: '', type: 'GIFT', customTypeLabel: '', estimatedValue: '', quantity: '1',
    conditionsText: '', startsAt: '', endsAt: '', challengeId: '',
};
const toForm = (r: any): RewardForm => ({
    name: r.name ?? '', description: r.description ?? '', imageFileId: r.imageFileId ?? '', type: r.type ?? 'GIFT',
    customTypeLabel: r.customTypeLabel ?? '', estimatedValue: r.estimatedValue != null ? String(r.estimatedValue) : '',
    quantity: r.quantity != null ? String(r.quantity) : '1', conditionsText: r.conditionsText ?? '',
    startsAt: toLocalInput(r.startsAt), endsAt: toLocalInput(r.endsAt), challengeId: r.challengeId ? String(r.challengeId) : '',
});
/** Body for the API from the form; only `keys` when given (PATCH sends what changed). */
const toBody = (f: RewardForm, keys?: (keyof RewardForm)[]) => {
    const all: Record<string, unknown> = {
        name: f.name.trim(), description: f.description.trim(), imageFileId: f.imageFileId || undefined, type: f.type,
        customTypeLabel: f.type === 'CUSTOM' ? f.customTypeLabel.trim() : undefined,
        estimatedValue: f.estimatedValue === '' ? 0 : Number(f.estimatedValue), quantity: Number(f.quantity),
        conditionsText: f.conditionsText.trim(), startsAt: fromLocalInput(f.startsAt) ?? null, endsAt: fromLocalInput(f.endsAt) ?? null,
        challengeId: f.challengeId || null,
    };
    if (!keys) return all;
    return Object.fromEntries(keys.map((k) => [k, all[k]]));
};

type Me = { role: string; perms: string[]; event: any };

export default function RewardEditor() {
    const { id: eventId = '', rid = 'nouveau' } = useParams<{ id: string; rid: string }>();
    const navigate = useNavigate();
    const isNew = rid === 'nouveau';

    const [me, setMe] = useState<Me | null>(null);
    const [denied, setDenied] = useState<string | null>(null);
    const [reward, setReward] = useState<any>(null);
    const [form, setForm] = useState<RewardForm>(EMPTY);
    const [orig, setOrig] = useState<RewardForm>(EMPTY);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string; fields?: string[] } | null>(null);
    const [uploading, setUploading] = useState(false);
    // Bumped when a rule action (draw, activation) may have created winners.
    const [winnersVersion, setWinnersVersion] = useState(0);

    const can = useCallback((p: string) => Boolean(me?.perms?.includes(p)), [me]);
    const set = <K extends keyof RewardForm>(k: K, v: RewardForm[K]) => setForm((f) => ({ ...f, [k]: v }));

    /** keepForm: refresh after a rule/winner action without wiping edits in progress. */
    const loadReward = useCallback(async (keepForm = false) => {
        if (isNew) return;
        const res = await animationApi.manage.rewards(eventId);
        if (!res.apiReportedSuccess) { setMsg({ kind: 'error', text: errText(res) }); return; }
        const r = (res.body.data ?? []).find((x: any) => String(x._id) === rid);
        if (!r) { setDenied('Récompense introuvable.'); return; }
        setReward(r);
        const f = toForm(r);
        setOrig(f);
        if (!keepForm) setForm(f);
    }, [eventId, rid, isNew]);

    useEffect(() => {
        (async () => {
            const m = await animationApi.manage.me(eventId);
            if (!m.apiReportedSuccess) {
                setDenied(m.statusCode === 403 || m.statusCode === 404 ? 'Accès refusé.' : errText(m));
                setLoading(false);
                return;
            }
            setMe(m.body.data);
            const c = await animationApi.manage.challenges(eventId);
            if (c.apiReportedSuccess) setChallenges(c.body.data ?? []);
            await loadReward();
            setLoading(false);
        })();
    }, [eventId, loadReward]);

    const changed = (Object.keys(form) as (keyof RewardForm)[]).filter((k) => form[k] !== orig[k]);
    const editable = can('CONFIGURE') && (!reward || !['CANCELLED', 'CLOSED'].includes(reward.status));
    const unsaved = useUnsavedChanges({
        dirty: editable && changed.length > 0, storageKey: `sbc-anim-draft:reward:${eventId}:${rid}`,
        base: loading ? undefined : orig, draft: form,
    });

    const upload = async (file?: File | null) => {
        if (!file) return;
        setUploading(true);
        const res = await sbcApiService.uploadFile(file);
        setUploading(false);
        if (res.apiReportedSuccess && res.body?.data?.fileId) set('imageFileId', res.body.data.fileId);
        else setMsg({ kind: 'error', text: errText(res) || 'Envoi de l’image impossible.' });
    };

    const save = async () => {
        if (!form.name.trim()) { setMsg({ kind: 'error', text: 'Le nom est obligatoire.' }); return; }
        if (!(Number(form.quantity) >= 1)) { setMsg({ kind: 'error', text: 'La quantité doit être d’au moins 1.' }); return; }
        setSaving(true); setMsg(null);
        if (isNew) {
            const res = await animationApi.manage.createReward(eventId, toBody(form));
            setSaving(false);
            if (res.apiReportedSuccess) navigate(`/events/organizer/${eventId}/animation/recompenses/${res.body.data._id}`, { replace: true });
            else setMsg({ kind: 'error', text: errText(res) });
            return;
        }
        const res = await animationApi.manage.updateReward(eventId, rid, toBody(form, changed));
        setSaving(false);
        if (res.apiReportedSuccess) {
            setMsg({ kind: 'success', text: 'Récompense enregistrée.' });
            await loadReward();
        } else if (res.body?.code === 'LOCKED_FIELDS') {
            setMsg({ kind: 'error', text: 'Cette récompense est verrouillée (déjà gagnée ou événement commencé). Seule l’augmentation du stock reste possible.', fields: res.body?.details?.fields ?? [] });
        } else setMsg({ kind: 'error', text: errText(res) });
    };

    if (loading) return <div className="min-h-screen bg-bg p-8 text-center text-ink-2">Chargement…</div>;
    const backToHub = () => unsaved.guard(() => navigate(`/events/organizer/${eventId}/animation?tab=recompenses`));

    if (denied || !me) {
        return (
            <div className="min-h-screen bg-bg">
                <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                    <BackButton onClick={backToHub} />
                    <h1 className="text-lg font-semibold text-ink">Récompense</h1>
                </div>
                <div className="p-4"><Notice kind="error">{denied ?? 'Accès refusé.'}</Notice></div>
            </div>
        );
    }

    const st = reward ? info(REWARD_STATUS, reward.status) : null;
    const locked = Boolean(reward && (reward.quantityAwarded > 0 || reward.lockedAt));

    return (
        <div className="min-h-screen bg-bg pb-8">
            {unsaved.dialog}
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={backToHub} />
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-ink leading-tight truncate">{isNew ? 'Nouvelle récompense' : reward?.name}</h1>
                    <div className="text-xs text-ink-2 truncate">{me.event?.title}</div>
                </div>
            </div>

            <div className="p-4 space-y-4 max-w-3xl mx-auto">
                {unsaved.restorable && editable && (
                    <div className="bg-accent-soft border border-border rounded-card p-3 space-y-2">
                        <div className="text-sm text-ink">Vous aviez des modifications non enregistrées sur cette récompense.</div>
                        <div className="flex gap-2">
                            <button onClick={() => { const d = unsaved.takeRestorable(); if (d) setForm(d); }} className={`flex-1 ${btnPrimary}`}>Les récupérer</button>
                            <button onClick={unsaved.discardStoredDraft} className={btnGhost}>Ignorer</button>
                        </div>
                    </div>
                )}
                {reward && st && (
                    <div className="bg-surface border border-border rounded-card p-3 flex items-center justify-between gap-2">
                        <div className="text-sm text-ink-2">{reward.quantityAwarded ?? 0} / {reward.quantity} attribuée(s){reward.estimatedValue ? ` · ${xaf(reward.estimatedValue)}` : ''}</div>
                        <div className="flex gap-1 flex-wrap justify-end">
                            {locked && <Badge label="🔒 Verrouillée" tone="muted" />}
                            <Badge label={st.label} tone={st.tone} />
                        </div>
                    </div>
                )}
                {reward?.status === 'DRAFT' && (
                    <Notice kind="info">La récompense devient active quand vous activez une règle d’attribution (section « Règles » plus bas).</Notice>
                )}

                <Card title="Informations">
                    <fieldset disabled={!editable} className="space-y-3">
                        <Field label="Nom *"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. Bouteille de champagne" className={inputClass} /></Field>
                        <Field label="Description"><textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} className={inputClass} /></Field>
                        <div>
                            <div className="text-xs text-ink-2 mb-1">Image</div>
                            <div className="flex items-center gap-3">
                                {form.imageFileId ? (
                                    <img src={sbcApiService.generateThumbnailUrl(form.imageFileId, 160)} alt="" className="w-20 h-20 object-cover rounded-tile border border-border" />
                                ) : <div className="w-20 h-20 rounded-tile bg-surface-2 border border-border flex items-center justify-center text-2xl">🎁</div>}
                                <div className="space-y-1">
                                    <label className={`${btnGhost} inline-block cursor-pointer`}>
                                        {uploading ? '…' : form.imageFileId ? 'Changer' : 'Ajouter une image'}
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                                    </label>
                                    {form.imageFileId && <button type="button" onClick={() => set('imageFileId', '')} className="block text-xs text-danger">Retirer</button>}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Field label="Type *">
                                <select value={form.type} onChange={(e) => set('type', e.target.value)} className={inputClass}>
                                    {REWARD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Quantité *" hint={locked ? 'Seule l’augmentation est possible.' : undefined}>
                                <input type="number" min={1} value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className={inputClass} />
                            </Field>
                        </div>
                        {form.type === 'CUSTOM' && (
                            <Field label="Nom du type"><input value={form.customTypeLabel} onChange={(e) => set('customTypeLabel', e.target.value)} placeholder="Ex. Séance photo" className={inputClass} /></Field>
                        )}
                        <Field label="Valeur estimée (XAF)"><input type="number" min={0} value={form.estimatedValue} onChange={(e) => set('estimatedValue', e.target.value)} className={inputClass} /></Field>
                        <Field label="Conditions"><textarea value={form.conditionsText} onChange={(e) => set('conditionsText', e.target.value)} rows={2} placeholder="Ex. À retirer au stand avant 23 h, pièce d’identité exigée." className={inputClass} /></Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Field label="Début (optionnel)"><input type="datetime-local" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputClass} /></Field>
                            <Field label="Fin (optionnel)"><input type="datetime-local" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={inputClass} /></Field>
                        </div>
                        <Field label="Défi lié (optionnel)">
                            <select value={form.challengeId} onChange={(e) => set('challengeId', e.target.value)} className={inputClass}>
                                <option value="">Aucun — récompense de l’événement</option>
                                {challenges.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </fieldset>
                    {editable && (
                        <button onClick={save} disabled={saving || (!isNew && changed.length === 0)} className={`w-full ${btnPrimary}`}>
                            {saving ? '…' : isNew ? 'Créer la récompense' : changed.length ? 'Enregistrer' : 'Aucune modification'}
                        </button>
                    )}
                    {msg && (
                        <Notice kind={msg.kind}>
                            {msg.text}
                            {msg.fields && msg.fields.length > 0 && (
                                <ul className="list-disc ml-5 mt-1">{msg.fields.map((f) => <li key={f}>{FIELD_LABEL[f] ?? f}</li>)}</ul>
                            )}
                        </Notice>
                    )}
                </Card>

                {reward && (
                    <>
                        <RulesSection eventId={eventId} reward={reward} challenges={challenges} eventSlug={me.event?.slug} can={can} onChanged={() => { loadReward(true); setWinnersVersion((v) => v + 1); }} />
                        <WinnersSection key={winnersVersion} eventId={eventId} rewardId={rid} canAct={can('CONFIGURE')} onChanged={() => loadReward(true)} />
                        {can('CONFIGURE') && !['CANCELLED', 'CLOSED'].includes(reward.status) && (
                            <CancelReward eventId={eventId} reward={reward} onDone={loadReward} />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ---------- rules ----------

type RuleDraft = {
    kind: string; trigger: string; position: string; every: string; firstN: string; winners: string; drawAt: string;
    onePerUser: boolean; scope: string; ticketTypeIds: string[]; challengeId: string;
};
const EMPTY_RULE: RuleDraft = {
    kind: 'POSITION', trigger: 'TICKET_ORDER_PAID', position: '', every: '', firstN: '', winners: '1', drawAt: '',
    onePerUser: true, scope: 'ALL_PARTICIPANTS', ticketTypeIds: [], challengeId: '',
};
const ruleBody = (d: RuleDraft) => {
    const params: Record<string, unknown> = { onePerUser: d.onePerUser };
    if (d.kind === 'POSITION') params.position = Number(d.position);
    if (d.kind === 'PERIODIC') params.every = Number(d.every);
    if (d.kind === 'ACTION') params.firstN = Number(d.firstN);
    if (d.kind === 'RANDOM_DRAW') { params.winners = Number(d.winners); if (d.drawAt) params.drawAt = fromLocalInput(d.drawAt); }
    if (d.challengeId) params.challengeId = d.challengeId;
    return {
        kind: d.kind,
        trigger: TRIGGERED.includes(d.kind) ? d.trigger : undefined,
        params,
        eligibility: { scope: d.scope, ticketTypeIds: d.scope === 'TICKET_TYPES' ? d.ticketTypeIds : [], challengeId: d.challengeId || undefined },
    };
};

function RulesSection({ eventId, reward, challenges, eventSlug, can, onChanged }: {
    eventId: string; reward: any; challenges: any[]; eventSlug?: string; can: (p: string) => boolean; onChanged: () => void;
}) {
    const navigate = useNavigate();
    const [rules, setRules] = useState<any[] | null>(null);
    const [draws, setDraws] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [builderOpen, setBuilderOpen] = useState(false);
    const [d, setD] = useState<RuleDraft>(EMPTY_RULE);
    const [ticketTypes, setTicketTypes] = useState<any[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const [lockedRule, setLockedRule] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [lastDraw, setLastDraw] = useState<any>(null);

    const load = useCallback(async () => {
        const [r, dr] = await Promise.all([animationApi.manage.rules(eventId, reward._id), animationApi.manage.draws(eventId)]);
        if (r.apiReportedSuccess) setRules(r.body.data ?? []); else setError(errText(r));
        if (dr.apiReportedSuccess) setDraws(dr.body.data ?? []);
    }, [eventId, reward._id]);
    useEffect(() => { load(); }, [load]);

    // Ticket types for the eligibility picker (owner endpoint first; public listing as a fallback for team members).
    useEffect(() => {
        if (!builderOpen || ticketTypes) return;
        (async () => {
            const r = await animationApi.manage.ticketTypes(eventId);
            if (r.apiReportedSuccess) { setTicketTypes(r.body?.data ?? []); return; }
            if (eventSlug) {
                const p = await sbcApiService.getPublicEventBySlug(eventSlug);
                if (p.apiReportedSuccess) { setTicketTypes(p.body?.data?.ticketTypes ?? []); return; }
            }
            setTicketTypes([]);
        })();
    }, [builderOpen, ticketTypes, eventId, eventSlug]);

    const setR = <K extends keyof RuleDraft>(k: K, v: RuleDraft[K]) => setD((x) => ({ ...x, [k]: v }));
    const preview = useMemo(() => describeRule(ruleBody(d), `« ${reward.name} »`), [d, reward.name]);

    const create = async () => {
        setBusy('create'); setMsg(null);
        const res = await animationApi.manage.createRule(eventId, reward._id, ruleBody(d));
        setBusy(null);
        if (res.apiReportedSuccess) {
            setMsg({ kind: 'success', text: `Version ${res.body.data.version} créée en brouillon. Activez-la pour qu’elle s’applique.` });
            setBuilderOpen(false); setD(EMPTY_RULE);
            load();
        } else setMsg({ kind: 'error', text: errText(res) });
    };

    const activate = async (ruleId: string) => {
        setBusy(`act:${ruleId}`); setMsg(null); setLockedRule(null);
        const res = await animationApi.manage.activateRule(eventId, ruleId);
        setBusy(null);
        if (res.apiReportedSuccess) { setMsg({ kind: 'success', text: 'Règle activée.' }); load(); onChanged(); }
        else if (res.body?.code === 'RULE_LOCKED') { setLockedRule(ruleId); setReason(''); }
        else setMsg({ kind: 'error', text: errText(res) });
    };

    const requestChange = async () => {
        if (!lockedRule) return;
        if (!reason.trim()) { setMsg({ kind: 'error', text: 'Expliquez la raison du changement.' }); return; }
        setBusy('req'); setMsg(null);
        const res = await animationApi.manage.requestRuleChange(eventId, lockedRule, reason.trim());
        setBusy(null);
        if (res.apiReportedSuccess) { setLockedRule(null); setMsg({ kind: 'success', text: 'Demande envoyée à l’équipe SBC. Vous serez notifié de sa décision.' }); }
        else setMsg({ kind: 'error', text: errText(res) });
    };

    const drawNow = async (ruleId: string) => {
        setBusy(`draw:${ruleId}`); setMsg(null);
        const res = await animationApi.manage.drawNow(eventId, ruleId);
        setBusy(null);
        if (res.apiReportedSuccess) { setLastDraw(res.body.data); setMsg({ kind: 'success', text: 'Tirage effectué.' }); load(); onChanged(); }
        else if (res.body?.code === 'SCHEDULED_LATER') setMsg({ kind: 'error', text: 'Le tirage est programmé plus tard : il se lancera automatiquement à la date prévue.' });
        else setMsg({ kind: 'error', text: errText(res) });
    };

    const active = rules?.find((r) => r.status === 'ACTIVE');
    const drawOf = (ruleId: string) => draws.find((x) => String(x.ruleId) === String(ruleId));
    const closed = ['CANCELLED', 'CLOSED'].includes(reward.status);

    return (
        <Card title="Règles d’attribution">
            {error && <Notice kind="error">{error}</Notice>}
            {!rules && !error && <div className="text-sm text-ink-2">Chargement…</div>}
            {rules && rules.length === 0 && <div className="text-sm text-ink-2">Aucune règle : définissez qui gagne cette récompense.</div>}
            <div className="space-y-2">
                {rules?.map((r) => {
                    const rs = RULE_STATUS[r.status] ?? { label: r.status, tone: 'muted' as Tone };
                    const draw = r.kind === 'RANDOM_DRAW' ? drawOf(r._id) : null;
                    return (
                        <div key={r._id} className={`border border-border rounded-tile p-3 space-y-1 ${r.status === 'SUPERSEDED' ? 'bg-surface-2' : 'bg-surface'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="text-sm font-semibold text-ink">Version {r.version} · {kindLabel(r.kind)}</div>
                                <Badge label={rs.label} tone={rs.tone} />
                            </div>
                            <div className="text-sm text-ink-2">{describeRule(r, `« ${reward.name} »`)}</div>
                            {r.params?.challengeId && <div className="text-xs text-ink-3">Défi : {challenges.find((c) => String(c._id) === String(r.params.challengeId))?.name ?? shortId(r.params.challengeId)}</div>}
                            <div className="text-[11px] text-ink-3 font-mono">empreinte {String(r.definitionHash ?? '').slice(0, 12)}{r.activatedAt ? ` · activée le ${fmtDateTime(r.activatedAt)}` : ''}</div>

                            {r.status === 'DRAFT' && can('CONFIGURE') && !closed && (
                                <button onClick={() => activate(r._id)} disabled={busy !== null} className={btnSecondary}>{busy === `act:${r._id}` ? '…' : 'Activer'}</button>
                            )}
                            {lockedRule === r._id && (
                                <div className="bg-surface-2 rounded-tile p-3 space-y-2">
                                    <div className="text-sm text-ink">La règle active est verrouillée (gagnant existant ou événement commencé). Le remplacement doit être validé par l’équipe SBC.</div>
                                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Raison du changement (obligatoire)" className={inputClass} />
                                    <div className="flex gap-2">
                                        <button onClick={requestChange} disabled={busy !== null} className={btnSecondary}>{busy === 'req' ? '…' : 'Demander une modification'}</button>
                                        <button onClick={() => setLockedRule(null)} className={btnGhost}>Annuler</button>
                                    </div>
                                </div>
                            )}

                            {r.status === 'ACTIVE' && r.kind === 'RANDOM_DRAW' && (
                                <div className="space-y-1 pt-1">
                                    {draw && (
                                        <div className="text-xs text-ink-2">
                                            {draw.status === 'DONE' ? `Tirage effectué le ${fmtDateTime(draw.drawnAt)} (${draw.eligibleCount ?? 0} éligibles).` : draw.scheduledAt ? `Tirage programmé le ${fmtDateTime(draw.scheduledAt)}.` : 'Tirage prêt à être lancé.'}
                                            {' '}
                                            <button onClick={() => navigate(`/events/tirages/${draw._id}`)} className="text-primary font-medium">Preuve publique →</button>
                                        </div>
                                    )}
                                    {can('CONFIGURE') && draw?.status !== 'DONE' && (
                                        <button onClick={() => drawNow(r._id)} disabled={busy !== null} className={btnSecondary}>{busy === `draw:${r._id}` ? '…' : '🎲 Lancer le tirage'}</button>
                                    )}
                                </div>
                            )}
                            {r.status === 'ACTIVE' && r.kind === 'MANUAL' && can('CONFIGURE') && !closed && (
                                <ManualAward eventId={eventId} rewardId={reward._id} onDone={() => { load(); onChanged(); }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {lastDraw?._id && (
                <Notice kind="success">
                    {(lastDraw.winners ?? []).length} gagnant(s) tiré(s) parmi {lastDraw.eligibleCount ?? 0} éligible(s).{' '}
                    <button onClick={() => navigate(`/events/tirages/${lastDraw._id}`)} className="underline font-medium">Voir la preuve</button>
                </Notice>
            )}
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

            {can('CONFIGURE') && !closed && !builderOpen && (
                <button onClick={() => { setBuilderOpen(true); setMsg(null); }} className={`w-full ${btnSecondary}`}>
                    + {active ? 'Nouvelle version de règle' : 'Définir la règle'}
                </button>
            )}

            {builderOpen && (
                <div className="border border-primary rounded-tile p-3 space-y-3">
                    <div className="text-sm font-semibold text-ink">Nouvelle version de règle</div>
                    <Field label="Type de règle" hint={RULE_KINDS.find((k) => k.value === d.kind)?.hint}>
                        <select value={d.kind} onChange={(e) => setR('kind', e.target.value)} className={inputClass}>
                            {RULE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select>
                    </Field>

                    {TRIGGERED.includes(d.kind) && (
                        <Field label="Déclencheur : la personne qui…">
                            <select value={d.trigger} onChange={(e) => setR('trigger', e.target.value)} className={inputClass}>
                                {RULE_TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </Field>
                    )}
                    {d.kind === 'POSITION' && (
                        <Field label="Position (ex. 50 pour le 50e)"><input type="number" min={1} value={d.position} onChange={(e) => setR('position', e.target.value)} className={inputClass} /></Field>
                    )}
                    {d.kind === 'PERIODIC' && (
                        <Field label="Tous les combien ? (≥ 2)"><input type="number" min={2} value={d.every} onChange={(e) => setR('every', e.target.value)} className={inputClass} /></Field>
                    )}
                    {d.kind === 'ACTION' && (
                        <Field label="Nombre de premiers"><input type="number" min={1} value={d.firstN} onChange={(e) => setR('firstN', e.target.value)} className={inputClass} /></Field>
                    )}
                    {d.kind === 'RANDOM_DRAW' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Field label="Nombre de gagnants"><input type="number" min={1} value={d.winners} onChange={(e) => setR('winners', e.target.value)} className={inputClass} /></Field>
                            <Field label="Date du tirage (optionnel)" hint="Vide : vous lancez le tirage vous-même."><input type="datetime-local" value={d.drawAt} onChange={(e) => setR('drawAt', e.target.value)} className={inputClass} /></Field>
                        </div>
                    )}

                    <Field label="Qui est éligible ?">
                        <select value={d.scope} onChange={(e) => setR('scope', e.target.value)} className={inputClass}>
                            {ELIGIBILITY_SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </Field>
                    {d.scope === 'TICKET_TYPES' && (
                        <div className="space-y-1">
                            <div className="text-xs text-ink-2">Types de billets</div>
                            {ticketTypes === null && <div className="text-xs text-ink-3">Chargement…</div>}
                            {ticketTypes && ticketTypes.length === 0 && <div className="text-xs text-danger">Types de billets indisponibles.</div>}
                            {ticketTypes?.map((tt) => (
                                <label key={tt._id} className="flex items-center gap-2 text-sm text-ink">
                                    <input
                                        type="checkbox"
                                        checked={d.ticketTypeIds.includes(String(tt._id))}
                                        onChange={(e) => setR('ticketTypeIds', e.target.checked ? [...d.ticketTypeIds, String(tt._id)] : d.ticketTypeIds.filter((x) => x !== String(tt._id)))}
                                    />
                                    {tt.name}
                                </label>
                            ))}
                        </div>
                    )}
                    {(['CHALLENGE_PARTICIPANTS', 'CHALLENGE_VOTERS'].includes(d.scope) || TRIGGERED.includes(d.kind)) && (
                        <Field
                            label={['CHALLENGE_PARTICIPANTS', 'CHALLENGE_VOTERS'].includes(d.scope) ? 'Défi concerné *' : 'Limiter à un défi (optionnel)'}
                            hint={TRIGGERED.includes(d.kind) && !['CHALLENGE_PARTICIPANTS', 'CHALLENGE_VOTERS'].includes(d.scope) ? 'Le déclencheur ne compte que pour ce défi.' : undefined}
                        >
                            <select value={d.challengeId} onChange={(e) => setR('challengeId', e.target.value)} className={inputClass}>
                                <option value="">{['CHALLENGE_PARTICIPANTS', 'CHALLENGE_VOTERS'].includes(d.scope) ? 'Choisir un défi' : 'Tous les défis'}</option>
                                {challenges.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </Field>
                    )}
                    <label className="flex items-center gap-2 text-sm text-ink-2">
                        <input type="checkbox" checked={d.onePerUser} onChange={(e) => setR('onePerUser', e.target.checked)} />
                        Une seule fois par personne
                    </label>

                    <div className="bg-primary-soft rounded-tile p-3">
                        <div className="text-[11px] font-semibold text-primary uppercase">Aperçu</div>
                        <div className="text-sm text-ink mt-0.5">{preview || '—'}</div>
                        {d.onePerUser && <div className="text-xs text-ink-2 mt-0.5">Une personne ne peut la gagner qu’une fois.</div>}
                    </div>
                    <div className="text-[11px] text-ink-3">Une version de règle est immuable : pour la changer, créez une nouvelle version.</div>
                    <div className="flex gap-2">
                        <button onClick={create} disabled={busy !== null} className={`flex-1 ${btnSecondary}`}>{busy === 'create' ? '…' : 'Créer la version'}</button>
                        <button onClick={() => setBuilderOpen(false)} className={btnGhost}>Annuler</button>
                    </div>
                </div>
            )}
        </Card>
    );
}

/** MANUAL rule: pick the winner by contact (email or phone). */
function ManualAward({ eventId, rewardId, onDone }: { eventId: string; rewardId: string; onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [contact, setContact] = useState('');
    const [found, setFound] = useState<any>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

    const lookup = async () => {
        if (!contact.trim()) return;
        setBusy(true); setMsg(null); setFound(null);
        const res = await animationApi.manage.lookupMember(eventId, contact.trim());
        setBusy(false);
        if (!res.apiReportedSuccess) { setMsg({ kind: 'error', text: errText(res) }); return; }
        const d = res.body.data ?? {};
        if (d.ambiguous) setMsg({ kind: 'error', text: 'Plusieurs comptes correspondent : indiquez le numéro complet avec l’indicatif.' });
        else if (!d.found) setMsg({ kind: 'error', text: 'Aucun compte SBC avec ce contact.' });
        else setFound(d);
    };
    const award = async () => {
        if (!found?.userId) return;
        setBusy(true); setMsg(null);
        const res = await animationApi.manage.award(eventId, rewardId, { userId: found.userId, note: note.trim() || undefined });
        setBusy(false);
        if (res.apiReportedSuccess) {
            setMsg({ kind: 'success', text: `Récompense attribuée à ${found.name ?? 'ce membre'}.` });
            setFound(null); setContact(''); setNote('');
            onDone();
        } else setMsg({ kind: 'error', text: errText(res) });
    };

    if (!open) return <button onClick={() => setOpen(true)} className={btnSecondary}>Attribuer</button>;
    return (
        <div className="bg-surface-2 rounded-tile p-3 space-y-2">
            <div className="flex gap-2">
                <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email ou téléphone du gagnant" className={inputClass} />
                <button onClick={lookup} disabled={busy} className={btnGhost}>{busy && !found ? '…' : 'Chercher'}</button>
            </div>
            {found && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        {found.avatar ? <img src={sbcApiService.generateThumbnailUrl(found.avatar, 64)} alt="" className="w-8 h-8 rounded-pill object-cover" /> : <div className="w-8 h-8 rounded-pill bg-surface border border-border" />}
                        <div>
                            <div className="text-sm font-medium text-ink">{found.name ?? 'Membre SBC'}</div>
                            {found.contactHint && <div className="text-xs text-ink-3">{found.contactHint}</div>}
                        </div>
                    </div>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optionnel)" className={inputClass} />
                    <button onClick={award} disabled={busy} className={btnSecondary}>{busy ? '…' : 'Confirmer l’attribution'}</button>
                </div>
            )}
            {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
            <button onClick={() => { setOpen(false); setFound(null); setMsg(null); }} className="text-xs text-ink-2">Fermer</button>
        </div>
    );
}

// ---------- winners ----------

function WinnerRow({ w, eventId, canAct, onDone }: { w: any; eventId: string; canAct: boolean; onDone: () => void }) {
    const [action, setAction] = useState<'deliver' | 'forfeit' | 'revoke' | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const st = info(WINNER_STATUS, w.status);

    const submit = async () => {
        if (!action) return;
        if (action !== 'deliver' && !note.trim()) { setError('Indiquez le motif.'); return; }
        setBusy(true); setError(null);
        const res = await animationApi.manage.winnerAction(eventId, w._id, action, { note: note.trim() || undefined });
        setBusy(false);
        if (res.apiReportedSuccess) { setAction(null); setNote(''); onDone(); } else setError(errText(res));
    };
    const labels = { deliver: 'Confirmer la remise', forfeit: 'Confirmer : non réclamée', revoke: 'Confirmer l’annulation' };

    return (
        <div className="border border-border rounded-tile p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="text-sm text-ink">{w.userName ?? `Membre ${shortId(w.userId)}`}{w.userPhone ? <span className="text-xs text-ink-3"> · {w.userPhone}</span> : null}{w.sharePct && w.sharePct < 100 ? ` · part ${w.sharePct} %` : ''}</div>
                    <div className="text-[11px] text-ink-3">Attribuée le {fmtDateTime(w.awardedAt)} · règle v{w.ruleVersion}</div>
                    {w.deliveryNote && <div className="text-xs text-ink-2 break-words">Note : {w.deliveryNote}</div>}
                </div>
                <Badge label={st.label} tone={st.tone} />
            </div>
            {canAct && w.status === 'AWARDED' && !action && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setAction('deliver')} className={btnSecondary}>Remise</button>
                    <button onClick={() => setAction('forfeit')} className={btnGhost}>Non réclamée</button>
                    <button onClick={() => setAction('revoke')} className={btnDanger}>Annuler</button>
                </div>
            )}
            {action && (
                <div className="space-y-2">
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === 'deliver' ? 'Note (optionnel)' : 'Motif (obligatoire)'} className={inputClass} />
                    <div className="flex gap-2">
                        <button onClick={submit} disabled={busy} className={action === 'revoke' ? btnDanger : btnSecondary}>{busy ? '…' : labels[action]}</button>
                        <button onClick={() => { setAction(null); setError(null); }} className={btnGhost}>Retour</button>
                    </div>
                </div>
            )}
            {error && <Notice kind="error">{error}</Notice>}
        </div>
    );
}

function WinnersSection({ eventId, rewardId, canAct, onChanged }: { eventId: string; rewardId: string; canAct: boolean; onChanged: () => void }) {
    const [items, setItems] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => {
        const res = await animationApi.manage.winners(eventId, rewardId);
        if (res.apiReportedSuccess) setItems(res.body.data ?? []); else setError(errText(res));
    }, [eventId, rewardId]);
    useEffect(() => { load(); }, [load]);

    return (
        <Card title={`Gagnants${items ? ` (${items.length})` : ''}`}>
            {error && <Notice kind="error">{error}</Notice>}
            {items && items.length === 0 && <div className="text-sm text-ink-2">Personne n’a encore gagné cette récompense.</div>}
            <div className="space-y-2">
                {items?.map((w) => <WinnerRow key={w._id} w={w} eventId={eventId} canAct={canAct} onDone={() => { load(); onChanged(); }} />)}
            </div>
        </Card>
    );
}

// ---------- cancel ----------

function CancelReward({ eventId, reward, onDone }: { eventId: string; reward: any; onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (!reason.trim()) { setError('Indiquez le motif.'); return; }
        setBusy(true); setError(null);
        const res = await animationApi.manage.cancelReward(eventId, reward._id, reason.trim());
        setBusy(false);
        if (res.apiReportedSuccess) { setOpen(false); onDone(); } else setError(errText(res));
    };

    return (
        <div className="bg-surface border border-border rounded-card p-3 space-y-2">
            {!open ? (
                <button onClick={() => setOpen(true)} className={`w-full ${btnDanger}`}>Annuler la récompense</button>
            ) : (
                <>
                    <div className="text-sm text-ink">
                        L’annulation désactive toutes ses règles.{reward.quantityAwarded > 0 ? ' Des gagnants existent déjà : l’annulation sera refusée.' : ''}
                    </div>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motif (obligatoire)" className={inputClass} />
                    <div className="flex gap-2">
                        <button onClick={submit} disabled={busy} className={btnDanger}>{busy ? '…' : 'Confirmer l’annulation'}</button>
                        <button onClick={() => { setOpen(false); setError(null); }} className={btnGhost}>Retour</button>
                    </div>
                </>
            )}
            {error && <Notice kind="error">{error}</Notice>}
        </div>
    );
}
