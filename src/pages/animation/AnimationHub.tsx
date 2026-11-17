import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';
import { animationApi, downloadWithAuth } from '../../services/animationApi';
import type { ApiResponse } from '../../services/ApiResponse';
import { TONE_CLASS, xaf, type Tone } from '../../lib/eventStatus';
import {
    CHALLENGE_STATUS, REWARD_STATUS, REWARD_TYPES, WINNER_STATUS, errorMessage, fmtDateTime, info,
} from '../../lib/animation';

// ---------- shared bits (kept local: one file per page) ----------

const inputClass = 'w-full bg-surface border border-border rounded-tile px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-primary';
const btnPrimary = 'bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-tile transition-colors disabled:opacity-60';
const btnSecondary = 'bg-surface border border-primary text-primary font-semibold py-2 px-3 rounded-tile text-sm disabled:opacity-60';
const btnGhost = 'bg-surface border border-border text-ink-2 font-medium py-2 px-3 rounded-tile text-sm disabled:opacity-60';
const btnDanger = 'bg-surface border border-danger text-danger font-semibold py-2 px-3 rounded-tile text-sm disabled:opacity-60';

const errText = (res: ApiResponse) => (res.statusCode === 401 ? 'Session expirée : reconnectez-vous.' : errorMessage(res));

const ROLE_LABEL: Record<string, string> = { OWNER: 'Organisateur', MANAGER: 'Gestionnaire', MODERATOR: 'Modérateur', STAFF: 'Staff' };

/** Audit actions in plain French; unknown ones fall back to the code. */
const ACTION_LABEL: Record<string, string> = {
    'challenge.create': 'Défi créé',
    'challenge.update': 'Défi modifié',
    'challenge.transition': 'Changement d’étape du défi',
    'challenge.cancel': 'Défi annulé',
    'challenge.deadline_extended': 'Clôture des votes repoussée',
    'challenge.suspend': 'Défi suspendu par SBC',
    'challenge.resume': 'Défi réactivé par SBC',
    'change_request.create': 'Demande de modification envoyée',
    'change_request.reject': 'Demande de modification refusée',
    'lock.override': 'Modification validée par SBC',
    'package.create': 'Pack de votes créé',
    'package.update': 'Pack de votes modifié',
    'package.archive': 'Pack de votes archivé',
    'candidate.register': 'Inscription d’un candidat',
    'candidate.add': 'Candidat ajouté',
    'candidate.approved': 'Candidature validée',
    'candidate.rejected': 'Candidature refusée',
    'candidate.disqualified': 'Candidat disqualifié',
    'candidate.withdrawn': 'Candidature retirée',
    'jury.add': 'Juré ajouté',
    'jury.remove': 'Juré retiré',
    'jury.invite': 'Juré invité',
    'jury.score': 'Note du jury validée',
    'team.add': 'Membre ajouté à l’équipe',
    'team.revoke': 'Membre retiré de l’équipe',
    'team.invite': 'Invitation d’équipe envoyée',
    'team.invite_accepted': 'Invitation acceptée',
    'result.compute': 'Résultat calculé',
    'result.tie_resolved': 'Égalité départagée',
    'result.second_round': 'Second tour lancé',
    'result.freeze': 'Résultat figé',
    'result.publish': 'Résultat publié',
    'reward.create': 'Récompense créée',
    'reward.update': 'Récompense modifiée',
    'reward.cancel': 'Récompense annulée',
    'reward.award': 'Récompense attribuée',
    'reward.draw': 'Tirage au sort effectué',
    'reward.deliver': 'Récompense remise',
    'reward.forfeit': 'Récompense non réclamée',
    'reward.revoke': 'Attribution annulée',
    'rule.create': 'Règle créée',
    'rule.activate': 'Règle activée',
    'vote.refund': 'Achat de votes remboursé',
    'fraud.clear': 'Signalement classé sans suite',
    'fraud.confirm': 'Fraude confirmée',
    'team.invite_revoked': 'Invitation d’équipe annulée',
    'jury.invite_revoked': 'Invitation de juré annulée',
    'vote.free': 'Vote gratuit',
    'vote.paid': 'Votes payants',
};
const actionLabel = (a?: string) => (a && ACTION_LABEL[a]) || a || '—';

function Badge({ label, tone }: { label: string; tone: Tone }) {
    return <span className={`inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[tone]}`}>{label}</span>;
}

function Notice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
    const cls = kind === 'error' ? 'bg-danger-soft text-danger' : kind === 'success' ? 'bg-success-soft text-success' : 'bg-surface-2 text-ink-2';
    return <div className={`${cls} border border-border rounded-tile p-3 text-sm`}>{children}</div>;
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'danger' }) {
    return (
        <div className="bg-surface border border-border rounded-card p-3 text-center min-w-0">
            <div className="text-xs text-ink-2 truncate">{label}</div>
            <div className={`text-lg font-bold mt-1 break-words ${tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink'}`}>{value}</div>
        </div>
    );
}

const shortId = (id?: string) => (id ? `…${String(id).slice(-6)}` : '—');

type Me = { role: string; perms: string[]; event: any };

// ---------- page ----------

const TABS: { key: string; label: string; perm: string }[] = [
    { key: 'apercu', label: 'Vue d’ensemble', perm: 'VIEW' },
    { key: 'defis', label: 'Défis', perm: 'VIEW' },
    { key: 'recompenses', label: 'Récompenses', perm: 'VIEW' },
    { key: 'equipe', label: 'Équipe', perm: 'TEAM' },
    { key: 'journal', label: 'Journal', perm: 'VIEW' },
];

export default function AnimationHub() {
    const { id: eventId = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [me, setMe] = useState<Me | null>(null);
    const [loading, setLoading] = useState(true);
    const [denied, setDenied] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const res = await animationApi.manage.me(eventId);
            if (res.apiReportedSuccess) setMe(res.body.data);
            else if (res.statusCode === 403 || res.statusCode === 404) setDenied('Accès refusé : vous ne faites pas partie de l’équipe de cet événement.');
            else setDenied(errText(res));
            setLoading(false);
        })();
    }, [eventId]);

    const can = useCallback((p: string) => Boolean(me?.perms?.includes(p)), [me]);
    const tabs = TABS.filter((t) => can(t.perm));
    const tab = tabs.find((t) => t.key === params.get('tab'))?.key ?? tabs[0]?.key ?? 'apercu';
    const setTab = (k: string) => setParams({ tab: k }, { replace: true });

    const back = () => navigate(me?.role === 'OWNER' ? `/events/organizer/${eventId}` : '/events/equipe');

    if (loading) return <div className="min-h-screen bg-bg p-8 text-center text-ink-2">Chargement…</div>;

    if (denied || !me) {
        return (
            <div className="min-h-screen bg-bg">
                <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                    <BackButton onClick={() => navigate('/events/organizer')} />
                    <h1 className="text-lg font-semibold text-ink">Animation</h1>
                </div>
                <div className="p-4">
                    <div className="bg-danger-soft border border-border rounded-card p-6 text-center">
                        <div className="text-2xl">🔒</div>
                        <div className="font-semibold text-danger mt-2">Accès refusé</div>
                        <div className="text-sm text-ink-2 mt-1">{denied}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg">
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={back} />
                <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-ink leading-tight">Animation</h1>
                    <div className="text-xs text-ink-2 truncate">{me.event?.title} · {ROLE_LABEL[me.role] ?? me.role}</div>
                </div>
            </div>

            <div className="bg-surface border-b border-border">
                <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`shrink-0 rounded-pill px-3 py-1.5 text-sm font-medium border ${tab === t.key ? 'bg-primary text-white border-primary' : 'bg-surface text-ink-2 border-border'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-4 max-w-3xl mx-auto">
                {tab === 'apercu' && <OverviewTab eventId={eventId} can={can} onOpenChallenge={(cid) => navigate(`/events/organizer/${eventId}/animation/defis/${cid}`)} />}
                {tab === 'defis' && <ChallengesTab eventId={eventId} can={can} />}
                {tab === 'recompenses' && <RewardsTab eventId={eventId} can={can} />}
                {tab === 'equipe' && <TeamTab eventId={eventId} can={can} />}
                {tab === 'journal' && <JournalTab eventId={eventId} can={can} eventSlug={me.event?.slug} />}
            </div>
        </div>
    );
}

// ---------- Vue d’ensemble ----------

function OverviewTab({ eventId, can, onOpenChallenge }: { eventId: string; can: (p: string) => boolean; onOpenChallenge: (cid: string) => void }) {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const res = await animationApi.manage.overview(eventId);
            if (res.apiReportedSuccess) setData(res.body.data);
            else setError(errText(res));
        })();
    }, [eventId]);

    if (error) return <Notice kind="error">{error}</Notice>;
    if (!data) return <div className="text-center text-ink-2 text-sm py-6">Chargement…</div>;

    const rewards: Record<string, number> = data.rewards ?? {};
    const byStatus: Record<string, number> = data.challenges?.byStatus ?? {};
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Metric label="Défis" value={data.challenges?.total ?? 0} />
                <Metric label="Participants" value={data.participants ?? 0} />
                <Metric label="Votes gratuits" value={(data.freeVotes ?? 0).toLocaleString('fr-FR')} />
                <Metric label="Votes payants" value={(data.paidVotes ?? 0).toLocaleString('fr-FR')} />
                {can('MONEY') && (
                    <>
                        <Metric label="Revenus bruts" value={xaf(data.revenue?.gross ?? 0)} />
                        <Metric label="Net organisateur" value={xaf(data.revenue?.organizerNet ?? 0)} tone="success" />
                        <Metric label="Commission SBC" value={xaf(data.revenue?.commission ?? 0)} />
                        <Metric label={`Remboursés (${data.revenue?.refundedCount ?? 0})`} value={xaf(data.revenue?.refunded ?? 0)} tone={data.revenue?.refunded ? 'danger' : undefined} />
                    </>
                )}
            </div>

            {Object.keys(byStatus).length > 0 && (
                <div className="bg-surface border border-border rounded-card p-3">
                    <div className="text-sm font-semibold text-ink mb-2">Défis par étape</div>
                    <div className="flex flex-wrap gap-1">
                        {Object.entries(byStatus).map(([s, n]) => {
                            const st = info(CHALLENGE_STATUS, s);
                            return <Badge key={s} label={`${st.label} · ${n}`} tone={st.tone} />;
                        })}
                    </div>
                </div>
            )}

            <div className="bg-surface border border-border rounded-card p-3">
                <div className="text-sm font-semibold text-ink mb-2">Récompenses distribuées</div>
                {Object.keys(rewards).length === 0 ? (
                    <div className="text-sm text-ink-2">Aucune récompense attribuée pour l’instant.</div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(rewards).map(([s, n]) => {
                            const st = info(WINNER_STATUS, s);
                            return (
                                <div key={s} className="flex items-center justify-between bg-surface-2 rounded-tile px-3 py-2">
                                    <Badge label={st.label} tone={st.tone} />
                                    <span className="font-bold text-ink">{n}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {data.mostActive && (
                <button onClick={() => onOpenChallenge(String(data.mostActive._id))} className="w-full text-left bg-accent-soft border border-border rounded-card p-3">
                    <div className="text-xs text-ink-2">🔥 Défi le plus actif</div>
                    <div className="font-semibold text-ink">{data.mostActive.name}</div>
                    <div className="text-xs text-ink-2">{(data.mostActive.votes ?? 0).toLocaleString('fr-FR')} votes</div>
                </button>
            )}

            <div className="bg-surface border border-border rounded-card p-3">
                <div className="text-sm font-semibold text-ink mb-2">Activité récente</div>
                {(data.recentActivity ?? []).length === 0 ? (
                    <div className="text-sm text-ink-2">Aucune activité.</div>
                ) : (
                    <ul className="divide-y divide-border">
                        {data.recentActivity.map((a: any) => (
                            <li key={a._id} className="py-2 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-sm text-ink">{actionLabel(a.action)}</div>
                                    {a.reason && <div className="text-xs text-ink-3 break-words">{a.reason}</div>}
                                </div>
                                <div className="text-[11px] text-ink-3 shrink-0">{fmtDateTime(a.at)}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ---------- Défis ----------

function ChallengesTab({ eventId, can }: { eventId: string; can: (p: string) => boolean }) {
    const navigate = useNavigate();
    const [items, setItems] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const res = await animationApi.manage.challenges(eventId);
            if (res.apiReportedSuccess) setItems(res.body.data ?? []);
            else setError(errText(res));
        })();
    }, [eventId]);

    return (
        <div className="space-y-3">
            {can('CONFIGURE') && (
                <button onClick={() => navigate(`/events/organizer/${eventId}/animation/defis/nouveau`)} className={`w-full ${btnPrimary}`}>+ Nouveau défi</button>
            )}
            {error && <Notice kind="error">{error}</Notice>}
            {!items && !error && <div className="text-center text-ink-2 text-sm py-6">Chargement…</div>}
            {items && items.length === 0 && (
                <div className="bg-surface border border-dashed border-border rounded-card p-6 text-center text-sm text-ink-2">
                    Aucun défi pour cet événement. Concours de tenue, quiz, meilleure danse… lancez le premier !
                </div>
            )}
            {items?.map((c) => {
                const st = info(CHALLENGE_STATUS, c.status);
                const k = c.counters ?? {};
                return (
                    <button
                        key={c._id}
                        onClick={() => navigate(`/events/organizer/${eventId}/animation/defis/${c._id}`)}
                        className="w-full text-left bg-surface border border-border rounded-card p-3 hover:bg-surface-2 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="font-medium text-ink min-w-0 break-words">{c.name}</div>
                            <Badge label={st.label} tone={st.tone} />
                        </div>
                        {c.suspendedAt && <div className="mt-1"><Badge label="Suspendu par SBC" tone="danger" /></div>}
                        <div className="text-xs text-ink-2 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>👤 {k.candidates ?? 0} candidat(s) · {k.approved ?? 0} validé(s)</span>
                            <span>🗳️ {(k.freeVotes ?? 0).toLocaleString('fr-FR')} gratuits · {(k.paidVotes ?? 0).toLocaleString('fr-FR')} payants</span>
                            {can('MONEY') && k.paidRevenue > 0 && <span>💰 {xaf(k.paidRevenue)}</span>}
                        </div>
                        {c.schedule?.votingClosesAt && <div className="text-[11px] text-ink-3 mt-0.5">Clôture des votes : {fmtDateTime(c.schedule.votingClosesAt)}</div>}
                    </button>
                );
            })}
        </div>
    );
}

// ---------- Récompenses ----------

/** One winner row with deliver / forfeit / revoke (the last two need a reason). */
function WinnerRow({ w, rewardName, eventId, canAct, onDone }: { w: any; rewardName?: string; eventId: string; canAct: boolean; onDone: () => void }) {
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
        if (res.apiReportedSuccess) { setAction(null); setNote(''); onDone(); }
        else setError(errText(res));
    };

    const labels = { deliver: 'Confirmer la remise', forfeit: 'Confirmer : non réclamée', revoke: 'Confirmer l’annulation' };
    return (
        <div className="bg-surface border border-border rounded-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    {rewardName && <div className="font-medium text-ink break-words">{rewardName}</div>}
                    <div className="text-xs text-ink-2">
                        Gagnant : {w.userName ?? `membre ${shortId(w.userId)}`}{w.userPhone ? ` · ${w.userPhone}` : ''}{w.sharePct && w.sharePct < 100 ? ` · part ${w.sharePct} %` : ''}
                    </div>
                    <div className="text-[11px] text-ink-3">Attribuée le {fmtDateTime(w.awardedAt)} · règle v{w.ruleVersion}</div>
                    {w.deliveryNote && <div className="text-xs text-ink-2 mt-0.5 break-words">Note : {w.deliveryNote}</div>}
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
                    {action === 'revoke' && <div className="text-xs text-ink-2">L’unité retourne en stock.</div>}
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

function RewardsTab({ eventId, can }: { eventId: string; can: (p: string) => boolean }) {
    const navigate = useNavigate();
    const [rewards, setRewards] = useState<any[] | null>(null);
    const [winners, setWinners] = useState<any[]>([]);
    const [draws, setDraws] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [winnerFilter, setWinnerFilter] = useState<string>('AWARDED');

    const load = useCallback(async () => {
        const [r, w, d] = await Promise.all([
            animationApi.manage.rewards(eventId),
            animationApi.manage.winners(eventId),
            animationApi.manage.draws(eventId),
        ]);
        if (r.apiReportedSuccess) setRewards(r.body.data ?? []); else setError(errText(r));
        if (w.apiReportedSuccess) setWinners(w.body.data ?? []);
        if (d.apiReportedSuccess) setDraws(d.body.data ?? []);
    }, [eventId]);
    useEffect(() => { load(); }, [load]);

    const nameOf = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of rewards ?? []) m.set(String(r._id), r.name);
        return (id: string) => m.get(String(id)) ?? 'Récompense';
    }, [rewards]);
    const shownWinners = winners.filter((w) => !winnerFilter || w.status === winnerFilter);

    return (
        <div className="space-y-4">
            {can('CONFIGURE') && (
                <button onClick={() => navigate(`/events/organizer/${eventId}/animation/recompenses/nouveau`)} className={`w-full ${btnPrimary}`}>+ Nouvelle récompense</button>
            )}
            {error && <Notice kind="error">{error}</Notice>}
            {!rewards && !error && <div className="text-center text-ink-2 text-sm py-6">Chargement…</div>}
            {rewards && rewards.length === 0 && (
                <div className="bg-surface border border-dashed border-border rounded-card p-6 text-center text-sm text-ink-2">
                    Aucune récompense. Créez un lot (cadeau, bon d’achat, billet…) puis sa règle d’attribution.
                </div>
            )}
            <div className="space-y-2">
                {rewards?.map((r) => {
                    const st = info(REWARD_STATUS, r.status);
                    const type = r.type === 'CUSTOM' ? (r.customTypeLabel || 'Autre') : REWARD_TYPES.find((t) => t.value === r.type)?.label ?? r.type;
                    return (
                        <button
                            key={r._id}
                            onClick={() => navigate(`/events/organizer/${eventId}/animation/recompenses/${r._id}`)}
                            className="w-full text-left bg-surface border border-border rounded-card p-3 hover:bg-surface-2 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="font-medium text-ink min-w-0 break-words">{r.name}</div>
                                <Badge label={st.label} tone={st.tone} />
                            </div>
                            <div className="text-xs text-ink-2 mt-1">
                                {type}{r.estimatedValue ? ` · ${xaf(r.estimatedValue)}` : ''} · {r.quantityAwarded ?? 0}/{r.quantity} attribuée(s)
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-ink">Gagnants</h2>
                    <select value={winnerFilter} onChange={(e) => setWinnerFilter(e.target.value)} className="bg-surface border border-border rounded-tile px-2 py-1 text-sm text-ink">
                        <option value="">Tous</option>
                        {Object.entries(WINNER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
                {shownWinners.length === 0 ? (
                    <div className="text-sm text-ink-2">Aucun gagnant dans cette liste.</div>
                ) : shownWinners.map((w) => (
                    <WinnerRow key={w._id} w={w} rewardName={nameOf(w.rewardId)} eventId={eventId} canAct={can('CONFIGURE')} onDone={load} />
                ))}
            </div>

            <div className="space-y-2">
                <h2 className="text-base font-semibold text-ink">Tirages au sort</h2>
                {draws.length === 0 ? (
                    <div className="text-sm text-ink-2">Aucun tirage programmé.</div>
                ) : draws.map((d) => (
                    <div key={d._id} className="bg-surface border border-border rounded-card p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="font-medium text-ink break-words">{nameOf(d.rewardId)}</div>
                            <div className="text-xs text-ink-2">
                                {d.status === 'DONE' ? `Tiré le ${fmtDateTime(d.drawnAt)} · ${d.eligibleCount ?? 0} éligible(s) · ${(d.winners ?? []).length} gagnant(s)`
                                    : d.scheduledAt ? `Programmé le ${fmtDateTime(d.scheduledAt)}` : 'À lancer manuellement'}
                            </div>
                            <a href={`/events/tirages/${d._id}`} onClick={(e) => { e.preventDefault(); navigate(`/events/tirages/${d._id}`); }} className="text-xs text-primary font-medium">
                                Voir la preuve publique →
                            </a>
                        </div>
                        <Badge label={d.status === 'DONE' ? 'Effectué' : d.status === 'RUNNING' ? 'En cours' : 'Programmé'} tone={d.status === 'DONE' ? 'success' : 'accent'} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------- Équipe ----------

function TeamTab({ eventId, can }: { eventId: string; can: (p: string) => boolean }) {
    const [data, setData] = useState<{ members: any[]; invites: any[] } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [contact, setContact] = useState('');
    const [role, setRole] = useState<'MANAGER' | 'MODERATOR' | 'STAFF'>('MODERATOR');
    const [allEvents, setAllEvents] = useState(false);
    const [adding, setAdding] = useState(false);
    const [addMsg, setAddMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
    const [inviteLink, setInviteLink] = useState<{ url: string; expiresAt: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const [removing, setRemoving] = useState(false);

    const load = useCallback(async () => {
        const res = await animationApi.manage.team(eventId);
        if (res.apiReportedSuccess) setData(res.body.data); else setError(errText(res));
    }, [eventId]);
    useEffect(() => { load(); }, [load]);

    const add = async () => {
        if (!contact.trim()) { setAddMsg({ kind: 'error', text: 'Indiquez un email ou un numéro de téléphone.' }); return; }
        setAdding(true); setAddMsg(null); setInviteLink(null); setCopied(false);
        const res = await animationApi.manage.addTeam(eventId, { contact: contact.trim(), role, allEvents });
        setAdding(false);
        if (!res.apiReportedSuccess) { setAddMsg({ kind: 'error', text: errText(res) }); return; }
        const d = res.body.data ?? {};
        if (d.invite?.token) {
            setInviteLink({ url: `${window.location.origin}/events/invitation/${d.invite.token}`, expiresAt: d.invite.expiresAt });
            setAddMsg({ kind: 'success', text: 'Cette personne n’a pas encore de compte SBC : envoyez-lui le lien d’invitation ci-dessous.' });
        } else {
            setAddMsg({ kind: 'success', text: 'Membre ajouté à l’équipe.' });
        }
        setContact('');
        load();
    };

    const copy = async () => {
        if (!inviteLink) return;
        try { await navigator.clipboard.writeText(inviteLink.url); setCopied(true); } catch { setCopied(false); }
    };

    const remove = async (memberId: string) => {
        setRemoving(true);
        const res = await animationApi.manage.removeTeam(eventId, memberId);
        setRemoving(false);
        setConfirmRemove(null);
        if (!res.apiReportedSuccess) setError(errText(res)); else { setError(null); load(); }
    };

    return (
        <div className="space-y-4">
            {can('TEAM') && (
                <div className="bg-surface border border-border rounded-card p-3 space-y-2">
                    <div className="text-sm font-semibold text-ink">Ajouter un membre</div>
                    <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email ou téléphone (+237…)" className={inputClass} />
                    <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className={inputClass}>
                        <option value="MANAGER">Gestionnaire — configure, modère, voit l’argent</option>
                        <option value="MODERATOR">Modérateur — valide les candidatures</option>
                        <option value="STAFF">Staff — consultation et écran live</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-ink-2">
                        <input type="checkbox" checked={allEvents} onChange={(e) => setAllEvents(e.target.checked)} />
                        Tous mes événements
                    </label>
                    <button onClick={add} disabled={adding} className={`w-full ${btnPrimary}`}>{adding ? '…' : 'Ajouter'}</button>
                    {addMsg && <Notice kind={addMsg.kind}>{addMsg.text}</Notice>}
                    {inviteLink && (
                        <div className="bg-surface-2 rounded-tile p-3 space-y-2">
                            <div className="text-xs text-ink-2 break-all">{inviteLink.url}</div>
                            <div className="flex items-center gap-2">
                                <button onClick={copy} className={btnSecondary}>{copied ? 'Lien copié ✓' : 'Copier le lien'}</button>
                                <span className="text-[11px] text-ink-3">Valable jusqu’au {fmtDateTime(inviteLink.expiresAt)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && <Notice kind="error">{error}</Notice>}
            {!data && !error && <div className="text-center text-ink-2 text-sm py-6">Chargement…</div>}

            {data && (
                <>
                    <div className="space-y-2">
                        <h2 className="text-base font-semibold text-ink">Membres</h2>
                        {data.members.length === 0 && <div className="text-sm text-ink-2">Aucun membre : vous gérez l’animation seul(e).</div>}
                        {data.members.map((m) => (
                            <div key={m._id} className="bg-surface border border-border rounded-card p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-medium text-ink break-words">{m.name}</div>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            <Badge label={ROLE_LABEL[m.role] ?? m.role} tone="primary" />
                                            {!m.eventId && <Badge label="Tous les événements" tone="muted" />}
                                        </div>
                                    </div>
                                    {can('TEAM') && confirmRemove !== m._id && (
                                        <button onClick={() => setConfirmRemove(m._id)} className={btnDanger}>Retirer</button>
                                    )}
                                </div>
                                {confirmRemove === m._id && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-ink-2">
                                            Retirer {m.name}{!m.eventId ? ' de tous vos événements' : ''} ?
                                        </span>
                                        <button onClick={() => remove(m._id)} disabled={removing} className={btnDanger}>{removing ? '…' : 'Confirmer'}</button>
                                        <button onClick={() => setConfirmRemove(null)} className={btnGhost}>Annuler</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-base font-semibold text-ink">Invitations en attente</h2>
                        {data.invites.length === 0 ? (
                            <div className="text-sm text-ink-2">Aucune invitation en attente.</div>
                        ) : data.invites.map((i) => (
                            <div key={i._id} className="bg-surface border border-border rounded-card p-3">
                                <div className="text-sm text-ink break-all">{i.contact}</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    <Badge label={i.kind === 'JURY' ? 'Juré' : ROLE_LABEL[i.role] ?? i.role ?? 'Équipe'} tone="accent" />
                                    <span className="text-[11px] text-ink-3">expire le {fmtDateTime(i.expiresAt)}</span>
                                </div>
                                <button
                                    onClick={async () => {
                                        const r = await animationApi.manage.revokeInvite(eventId, i._id);
                                        if (r.apiReportedSuccess) load(); else setAddMsg({ kind: 'error', text: errText(r) });
                                    }}
                                    className="mt-2 text-xs text-danger underline"
                                >
                                    Annuler l’invitation
                                </button>
                            </div>
                        ))}
                        <div className="text-[11px] text-ink-3">Le lien d’une invitation n’est affiché qu’au moment de sa création.</div>
                    </div>
                </>
            )}
        </div>
    );
}

// ---------- Journal ----------

const EXPORT_KINDS: { kind: string; label: string; money?: boolean }[] = [
    { kind: 'candidates', label: 'Candidats' },
    { kind: 'votes', label: 'Votes', money: true },
    { kind: 'transactions', label: 'Transactions', money: true },
    { kind: 'winners', label: 'Gagnants' },
    { kind: 'audit', label: 'Journal' },
];
const FORMATS: { f: 'csv' | 'xlsx' | 'pdf'; label: string }[] = [{ f: 'csv', label: 'CSV' }, { f: 'xlsx', label: 'Excel' }, { f: 'pdf', label: 'PDF' }];

function JournalTab({ eventId, can, eventSlug }: { eventId: string; can: (p: string) => boolean; eventSlug?: string }) {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<{ items: any[]; totalPages: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [challenges, setChallenges] = useState<any[]>([]);
    const [challengeId, setChallengeId] = useState('');
    const [exporting, setExporting] = useState<string | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);

    useEffect(() => {
        animationApi.manage.challenges(eventId).then((r) => r.apiReportedSuccess && setChallenges(r.body.data ?? []));
    }, [eventId]);

    useEffect(() => {
        (async () => {
            setData(null);
            const res = await animationApi.manage.audit(eventId, { page, limit: 20, challengeId: challengeId || undefined });
            if (res.apiReportedSuccess) { setData(res.body.data); setError(null); } else setError(errText(res));
        })();
    }, [eventId, page, challengeId]);

    const doExport = async (kind: string, format: 'csv' | 'xlsx' | 'pdf') => {
        const key = `${kind}.${format}`;
        setExporting(key); setExportError(null);
        try {
            const name = `${kind}-${eventSlug || eventId}${challengeId ? `-${challengeId.slice(-6)}` : ''}.${format}`;
            await downloadWithAuth(animationApi.manage.exportUrl(eventId, kind, format, challengeId || undefined), name);
        } catch (e: any) {
            setExportError(e?.message || 'Export impossible.');
        } finally { setExporting(null); }
    };

    return (
        <div className="space-y-4">
            <select value={challengeId} onChange={(e) => { setChallengeId(e.target.value); setPage(1); }} className={inputClass}>
                <option value="">Tout l’événement</option>
                {challenges.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>

            {can('EXPORT') && (
                <div className="bg-surface border border-border rounded-card p-3 space-y-2">
                    <div className="text-sm font-semibold text-ink">Exports</div>
                    {EXPORT_KINDS.filter((k) => !k.money || can('MONEY')).map((k) => (
                        <div key={k.kind} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-ink-2">{k.label}</span>
                            <div className="flex gap-1">
                                {FORMATS.map(({ f, label }) => (
                                    <button key={f} onClick={() => doExport(k.kind, f)} disabled={exporting !== null} className="bg-surface-2 border border-border text-ink-2 text-xs font-medium px-2 py-1 rounded-tile disabled:opacity-60">
                                        {exporting === `${k.kind}.${f}` ? '…' : label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    {exportError && <Notice kind="error">{exportError}</Notice>}
                </div>
            )}

            <div className="space-y-2">
                <h2 className="text-base font-semibold text-ink">Journal des actions{data ? ` (${data.total})` : ''}</h2>
                {error && <Notice kind="error">{error}</Notice>}
                {!data && !error && <div className="text-center text-ink-2 text-sm py-6">Chargement…</div>}
                {data && data.items.length === 0 && <div className="text-sm text-ink-2">Aucune action enregistrée.</div>}
                {data?.items.map((a) => (
                    <div key={a._id} className="bg-surface border border-border rounded-card p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="text-sm text-ink min-w-0 break-words">{actionLabel(a.action)}</div>
                            <div className="text-[11px] text-ink-3 shrink-0">{fmtDateTime(a.at)}</div>
                        </div>
                        <div className="text-xs text-ink-2 mt-0.5">
                            {ROLE_LABEL[a.actorRole] ?? (a.actorRole === 'SYSTEM' ? 'Automatique' : a.actorRole === 'SBC_ADMIN' ? 'Équipe SBC' : a.actorRole === 'JURY' ? 'Juré' : a.actorRole === 'PARTICIPANT' ? 'Participant' : a.actorRole === 'VOTER' ? 'Votant' : a.actorRole)}
                        </div>
                        {a.reason && <div className="text-xs text-ink-2 mt-0.5 break-words">Motif : {a.reason}</div>}
                    </div>
                ))}
                {data && data.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={btnGhost}>← Précédent</button>
                        <span className="text-xs text-ink-2">Page {page} / {data.totalPages}</span>
                        <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className={btnGhost}>Suivant →</button>
                    </div>
                )}
            </div>
        </div>
    );
}
