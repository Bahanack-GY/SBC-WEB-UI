import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, GiftIcon, StarIcon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import {
    CANDIDATE_STATUS, CHALLENGE_STATUS, REWARD_TYPES, VOTE_TX_STATUS, WINNER_STATUS, challengePath, errorMessage, fmtDateTime, info,
} from '../../lib/animation';
import { TONE_CLASS, xaf } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

type Tab = 'candidacies' | 'votes' | 'rewards';
const TABS: [Tab, string][] = [['candidacies', 'Mes candidatures'], ['votes', 'Mes achats de votes'], ['rewards', 'Mes gains']];
/** Withdrawal is refused by the server from VOTING_CLOSED on. */
const TOO_LATE = ['VOTING_CLOSED', 'RESULTS_PENDING', 'COMPLETED', 'CANCELLED'];

const Badge = ({ table, status }: { table: Parameters<typeof info>[0]; status?: string }) => {
    const s = info(table, status);
    return <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[s.tone])}>{s.label}</span>;
};

const Empty = ({ icon, title, hint }: { icon: any; title: string; hint: string }) => (
    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
        <HugeiconsIcon icon={icon} size={30} className="text-ink-3" />
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-2">{hint}</p>
    </div>
);

export default function MyChallenges() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const tab = (TABS.find(([k]) => k === params.get('tab'))?.[0] ?? 'candidacies') as Tab;
    const setTab = (t: Tab) => setParams(t === 'candidacies' ? {} : { tab: t }, { replace: true });

    const [rows, setRows] = useState<any[]>([]);
    const [names, setNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [withdrawing, setWithdrawing] = useState<string | null>(null);
    const [rowError, setRowError] = useState<Record<string, string>>({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            setRows([]);
            try {
                const res = tab === 'candidacies' ? await animationApi.myCandidacies()
                    : tab === 'votes' ? await animationApi.myVoteTransactions()
                        : await animationApi.myRewards();
                if (cancelled) return;
                if (!res.apiReportedSuccess) { setError(errText(res)); return; }
                const list: any[] = res.body.data ?? [];
                setRows(list);
                // Names now come with each purchase; older responses only carried ids.
                if (tab === 'votes') {
                    setNames((n) => ({ ...n, ...Object.fromEntries(list.filter((t) => t.challengeName).map((t) => [String(t.challengeId), t.challengeName])) }));
                }
                if (tab === 'votes' && list.some((t) => !t.challengeName)) {
                    const ids = [...new Set(list.map((t) => String(t.challengeId)))].filter((id) => !names[id]).slice(0, 20);
                    const got = await Promise.all(ids.map((id) => animationApi.challenge(id).then((r) => (r.apiReportedSuccess ? [id, r.body.data.name] : null)).catch(() => null)));
                    if (!cancelled) setNames((n) => ({ ...n, ...Object.fromEntries(got.filter(Boolean) as [string, string][]) }));
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Erreur réseau.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const withdraw = async (id: string) => {
        setWithdrawing(id);
        setRowError((e) => ({ ...e, [id]: '' }));
        try {
            const res = await animationApi.withdraw(id);
            if (res.apiReportedSuccess) {
                // Paid votes were refunded to their buyers; only free votes remain.
                setRows((rs) => rs.map((r) => (String(r._id) === id ? { ...r, status: 'WITHDRAWN', paidVotes: 0, totalVotes: r.freeVotes ?? 0 } : r)));
                setConfirmId(null);
            } else {
                setRowError((e) => ({ ...e, [id]: errText(res) }));
            }
        } catch (e: any) {
            setRowError((er) => ({ ...er, [id]: e?.message || 'Erreur réseau.' }));
        } finally {
            setWithdrawing(null);
        }
    };

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Mes défis & votes</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-4">
                <div role="tablist" aria-label="Mes défis" className="flex gap-1 bg-surface-2 rounded-pill p-1">
                    {TABS.map(([key, label]) => (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={tab === key}
                            onClick={() => setTab(key)}
                            className={cn(
                                'flex-1 min-w-0 rounded-pill px-1 py-2 text-xs font-medium leading-tight transition-colors duration-150',
                                tab === key ? 'bg-surface text-ink' : 'text-ink-2',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="h-24" rounded="rounded-card" />)}
                    </div>
                ) : error ? (
                    <p className="bg-surface border border-border rounded-card p-4 text-sm text-danger">{error}</p>
                ) : tab === 'candidacies' ? (
                    rows.length === 0 ? (
                        <Empty icon={UserGroupIcon} title="Aucune candidature" hint="Participez à un défi depuis la page d’un événement." />
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {rows.map((r) => {
                                const id = String(r._id);
                                const base = r.event?.slug && r.challenge?.slug ? challengePath(r.event.slug, r.challenge.slug) : null;
                                const canWithdraw = ['PENDING', 'APPROVED'].includes(r.status) && !TOO_LATE.includes(r.challenge?.status);
                                const showVotes = r.challenge?.voting?.showVoteCounts;
                                return (
                                    <li key={id} className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-primary">Candidat n°{r.number}</p>
                                                <p className="font-semibold text-ink truncate">{r.challenge?.name ?? 'Défi'}</p>
                                                <p className="text-xs text-ink-2 truncate">{r.event?.title}</p>
                                            </div>
                                            <Badge table={CANDIDATE_STATUS} status={r.status} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
                                            {r.challenge?.status && <span>Défi : {info(CHALLENGE_STATUS, r.challenge.status).label.toLowerCase()}</span>}
                                            {showVotes && typeof r.totalVotes === 'number' && <span className="font-semibold text-ink tabular-nums">{r.totalVotes.toLocaleString('fr-FR')} vote{r.totalVotes > 1 ? 's' : ''}</span>}
                                            {r.rank && r.status === 'APPROVED' && r.challenge?.status !== 'CANCELLED' ? <span>Rang : {r.rank === 1 ? '1er' : `${r.rank}e`}</span> : null}
                                        </div>
                                        <div className="flex gap-2">
                                            {base && (
                                                <button
                                                    onClick={() => navigate(r.status === 'APPROVED' ? `${base}/candidats/${r.number}` : base)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                                                >
                                                    {r.status === 'APPROVED' ? 'Ma page' : 'Voir le défi'}
                                                    <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
                                                </button>
                                            )}
                                            {canWithdraw && confirmId !== id && (
                                                <button
                                                    onClick={() => setConfirmId(id)}
                                                    className="rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-danger"
                                                >
                                                    Me retirer
                                                </button>
                                            )}
                                        </div>
                                        {confirmId === id && (
                                            <div className="bg-danger-soft rounded-tile p-3 flex flex-col gap-2">
                                                <p className="text-sm text-ink">
                                                    Retirer votre candidature ? C’est définitif{showVotes ? ' et vos votes ne compteront plus' : ''}.
                                                    {r.paidVotes > 0 ? ' Les personnes qui ont acheté des votes pour vous seront remboursées.' : ''}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => withdraw(id)}
                                                        disabled={withdrawing === id}
                                                        className="flex-1 rounded-xl bg-danger py-2 text-sm font-semibold text-white disabled:opacity-60"
                                                    >
                                                        {withdrawing === id ? 'Retrait…' : 'Confirmer le retrait'}
                                                    </button>
                                                    <button onClick={() => setConfirmId(null)} disabled={withdrawing === id} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink">
                                                        Annuler
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {rowError[id] && <p role="alert" className="text-xs text-danger">{rowError[id]}</p>}
                                    </li>
                                );
                            })}
                        </ul>
                    )
                ) : tab === 'votes' ? (
                    rows.length === 0 ? (
                        <Empty icon={StarIcon} title="Aucun achat de votes" hint="Vos packs de votes achetés apparaîtront ici." />
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {rows.map((t) => (
                                <li key={String(t._id)}>
                                    <Link to={`/events/votes/${t._id}`} className="bg-surface border border-border rounded-card p-4 flex items-center justify-between gap-3">
                                        <span className="min-w-0">
                                            <span className="block font-semibold text-ink truncate">{names[String(t.challengeId)] ?? 'Défi'}</span>
                                            <span className="block text-xs text-ink-2 truncate">
                                                {t.packageSnapshot?.label ? `${t.packageSnapshot.label} · ` : ''}{t.votes} vote{t.votes > 1 ? 's' : ''} · {xaf(t.amount)}
                                            </span>
                                            <span className="block text-[11px] text-ink-3">{fmtDateTime(t.createdAt)}{t.lateSettlement ? ' · payé après la clôture' : ''}</span>
                                        </span>
                                        <Badge table={VOTE_TX_STATUS} status={t.status} />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )
                ) : rows.length === 0 ? (
                    <Empty icon={GiftIcon} title="Aucun gain pour l’instant" hint="Les récompenses gagnées lors des événements apparaîtront ici." />
                ) : (
                    <ul className="flex flex-col gap-2">
                        {rows.map((w) => {
                            const type = REWARD_TYPES.find((x) => x.value === w.reward?.type)?.label;
                            return (
                                <li key={String(w._id)} className="bg-surface border border-border rounded-card p-4 flex items-start gap-3">
                                    <span className="size-12 shrink-0 rounded-tile bg-accent-soft grid place-items-center overflow-hidden text-accent">
                                        {w.reward?.imageFileId
                                            ? <img src={sbcApiService.generateThumbnailUrl(w.reward.imageFileId, 128)} alt="" className="size-full object-cover" />
                                            : <HugeiconsIcon icon={GiftIcon} size={22} />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-2">
                                            <span className="font-semibold text-ink min-w-0 truncate">{w.reward?.name ?? 'Récompense'}</span>
                                            <Badge table={WINNER_STATUS} status={w.status} />
                                        </span>
                                        {w.event && (
                                            <Link to={`/events/${encodeURIComponent(w.event.slug)}`} className="block text-xs text-primary truncate">{w.event.title}</Link>
                                        )}
                                        <span className="block text-xs text-ink-2">
                                            {[type, typeof w.reward?.estimatedValue === 'number' && w.reward.estimatedValue > 0 ? xaf(w.reward.estimatedValue) : null,
                                                typeof w.sharePct === 'number' && w.sharePct < 100 ? `part de ${w.sharePct} %` : null].filter(Boolean).join(' · ')}
                                        </span>
                                        <span className="block text-[11px] text-ink-3">Gagné le {fmtDateTime(w.awardedAt || w.createdAt)}</span>
                                        {w.status === 'AWARDED' && <span className="block text-[11px] text-ink-2 mt-1">L’organisateur vous contactera pour la remise.</span>}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
