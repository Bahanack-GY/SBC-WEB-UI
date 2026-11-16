import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    AlertCircleIcon, ArrowRight01Icon, Award01Icon, Calendar03Icon, ChampionIcon, Search01Icon, UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import {
    CANDIDATE_STATUS, CHALLENGE_STATUS, PARTICIPATION_MODES, TIE_RULES, VOTER_SCOPES, VOTING_MODES, challengePath, countdown,
    errorMessage, fmtDateTime, info,
} from '../../lib/animation';
import { TONE_CLASS, xaf } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

/** Server refusal in French; a lost connection gets its own wording (the client returns statusCode ≤ 0). */
const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const FREE_MODES = ['FREE', 'FREE_AND_PAID', 'PUBLIC_AND_JURY'];
const PAID_MODES = ['PAID', 'FREE_AND_PAID', 'PUBLIC_AND_JURY'];
const LIVE_STATUSES = ['ACTIVE', 'VOTING_OPEN', 'VOTING_CLOSED', 'RESULTS_PENDING', 'COMPLETED'];
const PAGE_SIZE = 24;

type Sort = 'number' | 'votes' | 'recent';

/** Re-renders every `ms` so countdowns stay current. */
const useNow = (ms = 30_000) => {
    const [, setT] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setT((x) => x + 1), ms);
        return () => clearInterval(t);
    }, [ms]);
};

const Badge = ({ table, status }: { table: Parameters<typeof info>[0]; status?: string }) => {
    const s = info(table, status);
    return <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[s.tone])}>{s.label}</span>;
};

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** The voting rules in plain French, one line each. */
const rulesSummary = (c: any): string[] => {
    const lines: string[] = [];
    const v = c.voting ?? {};
    const mode = VOTING_MODES.find((m) => m.value === v.mode);
    if (mode) lines.push(`Mode : ${mode.label.toLowerCase()}.`);
    if (FREE_MODES.includes(v.mode) && v.free) {
        const per = v.free.period === 'DAY' ? 'par jour' : 'pour toute la durée du défi';
        lines.push(`${plural(v.free.perPeriod ?? 0, 'vote')} gratuit${(v.free.perPeriod ?? 0) > 1 ? 's' : ''} ${per}.`);
        if (v.free.perCandidatePerPeriod) lines.push(`Au plus ${plural(v.free.perCandidatePerPeriod, 'vote')} gratuit${v.free.perCandidatePerPeriod > 1 ? 's' : ''} pour un même candidat${v.free.period === 'DAY' ? ' par jour' : ''}.`);
        if (v.free.totalPerChallenge) lines.push(`Au plus ${plural(v.free.totalPerChallenge, 'vote')} gratuit${v.free.totalPerChallenge > 1 ? 's' : ''} sur tout le défi.`);
    }
    if (v.mode && v.mode !== 'NONE' && v.mode !== 'JURY') {
        const who = VOTER_SCOPES.find((s) => s.value === v.voterScope)?.label;
        if (who) lines.push(`Qui peut voter : ${who.toLowerCase()}.`);
    }
    const part = PARTICIPATION_MODES.find((p) => p.value === c.participation?.mode)?.label;
    if (part) lines.push(`Qui peut participer : ${part.toLowerCase()}${c.participation?.requiresApproval ? ', après validation par l’organisateur' : ''}.`);
    if (c.scoring?.method === 'HYBRID') lines.push(`Classement : ${c.scoring.publicWeight} % vote du public, ${c.scoring.juryWeight} % note du jury.`);
    else if (c.scoring?.method === 'JURY') lines.push('Classement établi par les notes du jury.');
    if (!v.selfVoteAllowed && v.mode && v.mode !== 'NONE' && v.mode !== 'JURY') lines.push('Un candidat ne peut pas voter pour lui-même.');
    const tie = TIE_RULES.find((t) => t.value === c.tieRule);
    if (tie) lines.push(`En cas d’égalité : ${tie.label.toLowerCase()} — ${tie.hint.charAt(0).toLowerCase()}${tie.hint.slice(1)}`);
    return lines;
};

export default function ChallengePage() {
    const { slug = '', cslug = '' } = useParams<{ slug: string; cslug: string }>();
    const navigate = useNavigate();
    useNow();

    const [challenge, setChallenge] = useState<any>(null);
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [sort, setSort] = useState<Sort>('number');
    const [items, setItems] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [listError, setListError] = useState<string | null>(null);
    const reqId = useRef(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const r = await animationApi.resolveChallenge(slug, cslug);
                if (!r.apiReportedSuccess) { if (!cancelled) setError(errText(r)); return; }
                const id = r.body.data._id;
                const [c, m] = await Promise.all([animationApi.challenge(id), animationApi.me(id).catch(() => null)]);
                if (cancelled) return;
                if (!c.apiReportedSuccess) { setError(errText(c)); return; }
                setChallenge(c.body.data);
                if (m?.apiReportedSuccess) setMe(m.body.data);
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Erreur réseau.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug, cslug]);

    // Server-side search, debounced so typing doesn't fire a request per key.
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(q.trim()), 400);
        return () => clearTimeout(t);
    }, [q]);

    const challengeId: string | undefined = challenge?._id;

    const loadPage = async (p: number, replace: boolean) => {
        if (!challengeId) return;
        const id = ++reqId.current;
        setListLoading(true);
        setListError(null);
        try {
            const r = await animationApi.candidates(challengeId, { q: debouncedQ || undefined, page: p, limit: PAGE_SIZE, sort });
            if (id !== reqId.current) return;
            if (!r.apiReportedSuccess) { setListError(errText(r)); return; }
            const d = r.body.data;
            setItems((prev) => (replace ? d.items : [...prev, ...d.items]));
            setPage(d.page);
            setTotalPages(d.totalPages);
            setTotal(d.total);
        } catch (e: any) {
            if (id === reqId.current) setListError(e?.message || 'Erreur réseau.');
        } finally {
            if (id === reqId.current) setListLoading(false);
        }
    };

    useEffect(() => {
        loadPage(1, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challengeId, debouncedQ, sort]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-3 flex flex-col gap-3">
                <Skeleton height="h-10" rounded="rounded-card" />
                <Skeleton height="h-48" rounded="rounded-card" />
                <Skeleton height="h-32" rounded="rounded-card" />
            </div>
        );
    }
    if (error || !challenge) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-10">
                <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                    <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                    <p className="text-sm font-semibold text-ink">{error || 'Défi introuvable.'}</p>
                    <button onClick={() => navigate(`/events/${encodeURIComponent(slug)}`)} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                        Voir l’événement
                    </button>
                </div>
            </div>
        );
    }

    const c = challenge;
    const base = challengePath(slug, cslug);
    const s = c.schedule ?? {};
    const status: string = c.status;
    const showVotes = Boolean(c.voting?.showVoteCounts);
    const candidacy = me?.candidacy;
    const liveCandidacy = candidacy && ['PENDING', 'APPROVED'].includes(candidacy.status) ? candidacy : null;
    const canParticipate = me?.canParticipate;
    const placesLeft: number | undefined = c.participation?.placesLeft;
    const header = c.imageFileId || c.event?.posterFileId;
    const prizes = (c.rankRewards ?? []).filter((r: any) => r.reward).sort((a: any, b: any) => a.rank - b.rank);
    const packages: any[] = c.packages ?? [];
    const paidMode = PAID_MODES.includes(c.voting?.mode);

    const scheduleRows: { label: string; at?: string; future?: string }[] = [
        { label: 'Ouverture des inscriptions', at: s.registrationOpensAt },
        { label: 'Clôture des inscriptions', at: s.registrationClosesAt },
        { label: 'Ouverture des votes', at: s.votingOpensAt },
        { label: 'Clôture des votes', at: s.votingClosesAt },
        { label: 'Fin du défi', at: s.endsAt },
    ].filter((r) => r.at);

    const headline =
        status === 'REGISTRATION_OPEN' && s.registrationClosesAt && countdown(s.registrationClosesAt)
            ? `Inscriptions closes dans ${countdown(s.registrationClosesAt)}`
            : status === 'VOTING_OPEN' && s.votingClosesAt && countdown(s.votingClosesAt)
                ? `Votes clos dans ${countdown(s.votingClosesAt)}`
                : (status === 'PROGRAMMED' || status === 'REGISTRATION_CLOSED' || status === 'ACTIVE') && s.votingOpensAt && countdown(s.votingOpensAt)
                    ? `Votes ouverts dans ${countdown(s.votingOpensAt)}`
                    : status === 'PROGRAMMED' && s.registrationOpensAt && countdown(s.registrationOpensAt)
                        ? `Inscriptions ouvertes dans ${countdown(s.registrationOpensAt)}`
                        : '';

    return (
        <div className="min-h-screen bg-bg pb-8">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-bold text-ink truncate">{c.name}</h1>
            </div>

            {header && (
                <img src={sbcApiService.generateThumbnailUrl(header, 768)} alt="" className="w-full h-52 object-cover" />
            )}

            <div className="px-4 pt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-xl font-bold text-ink text-balance min-w-0">{c.name}</h2>
                        <Badge table={CHALLENGE_STATUS} status={status} />
                    </div>
                    {c.event && (
                        <Link to={`/events/${encodeURIComponent(c.event.slug)}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                            {c.event.title}
                            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                        </Link>
                    )}
                    {headline && <p className="text-sm font-semibold text-accent">{headline}</p>}
                </div>

                {c.suspended && (
                    <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">
                        Ce défi est temporairement suspendu par SBC. Les inscriptions et les votes sont en pause.
                    </p>
                )}
                {status === 'CANCELLED' && (
                    <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">
                        Ce défi a été annulé. Les achats de votes sont intégralement remboursés sur le solde SBC.
                    </p>
                )}

                {/* Call to action, depending on the phase and on what this member already did. */}
                <section className="flex flex-col gap-2">
                    {liveCandidacy && (
                        <button
                            onClick={() => navigate(liveCandidacy.status === 'APPROVED' ? `${base}/candidats/${liveCandidacy.number}` : '/events/mes-defis')}
                            className="w-full flex items-center justify-between gap-3 bg-surface border border-border rounded-card p-3 text-left"
                        >
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-ink">Ma candidature n°{liveCandidacy.number}</span>
                                <span className="block text-xs text-ink-2 truncate">{liveCandidacy.displayName}</span>
                            </span>
                            <Badge table={CANDIDATE_STATUS} status={liveCandidacy.status} />
                        </button>
                    )}
                    {status === 'REGISTRATION_OPEN' && !liveCandidacy && !c.suspended && (
                        <>
                            <button
                                onClick={() => navigate(`${base}/participer`)}
                                disabled={placesLeft === 0 || canParticipate?.ok === false}
                                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {placesLeft === 0 ? 'Complet' : 'Participer'}
                            </button>
                            {canParticipate?.ok === false && (
                                <p className="text-xs text-danger text-center">
                                    {canParticipate.message || 'Vous ne pouvez pas participer à ce défi.'}
                                    {(canParticipate.code === 'TICKET_REQUIRED' || canParticipate.code === 'TICKET_TYPE_REQUIRED') && c.event && (
                                        <> <Link to={`/events/${encodeURIComponent(c.event.slug)}`} className="font-semibold text-primary underline">Acheter un billet</Link></>
                                    )}
                                </p>
                            )}
                        </>
                    )}
                    {LIVE_STATUSES.includes(status) && c.voting?.mode !== 'NONE' && (
                        <button
                            onClick={() => navigate(`${base}/live`)}
                            className={cn(
                                'w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors',
                                status === 'VOTING_OPEN' && !liveCandidacy ? 'bg-primary text-white hover:bg-primary-hover' : 'border border-border bg-surface text-ink',
                            )}
                        >
                            {status === 'VOTING_OPEN' && <span className="size-2 rounded-pill bg-success-dot animate-pulse" aria-hidden />}
                            Voir le classement en direct
                        </button>
                    )}
                    {status === 'COMPLETED' && (
                        <button
                            onClick={() => navigate(`${base}/resultats`)}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-semibold text-white"
                        >
                            <HugeiconsIcon icon={ChampionIcon} size={16} />
                            Résultats
                        </button>
                    )}
                </section>

                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface border border-border rounded-card p-3">
                        <p className="text-[11px] text-ink-2">Candidats</p>
                        <p className="text-lg font-bold text-ink tabular-nums">{c.counters?.candidates ?? 0}</p>
                    </div>
                    {status === 'REGISTRATION_OPEN' || status === 'PROGRAMMED' ? (
                        <div className="bg-surface border border-border rounded-card p-3">
                            <p className="text-[11px] text-ink-2">Places restantes</p>
                            <p className="text-lg font-bold text-ink tabular-nums">{placesLeft ?? '—'}</p>
                        </div>
                    ) : showVotes && typeof c.counters?.votes === 'number' ? (
                        <div className="bg-surface border border-border rounded-card p-3">
                            <p className="text-[11px] text-ink-2">Votes</p>
                            <p className="text-lg font-bold text-ink tabular-nums">{c.counters.votes.toLocaleString('fr-FR')}</p>
                        </div>
                    ) : (
                        <div className="bg-surface border border-border rounded-card p-3">
                            <p className="text-[11px] text-ink-2">Places</p>
                            <p className="text-lg font-bold text-ink tabular-nums">{c.participation?.maxCandidates ?? '—'}</p>
                        </div>
                    )}
                </div>

                {c.description && <p className="text-sm text-ink-2 whitespace-pre-wrap leading-relaxed text-pretty">{c.description}</p>}

                {prizes.length > 0 && (
                    <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
                        <h3 className="text-base font-bold text-ink flex items-center gap-2">
                            <HugeiconsIcon icon={Award01Icon} size={17} className="text-accent" />
                            À gagner
                        </h3>
                        <ul className="flex flex-col gap-2">
                            {prizes.map((p: any) => (
                                <li key={p.rank} className="flex items-center gap-3">
                                    <span className="size-10 shrink-0 grid place-items-center rounded-tile bg-accent-soft text-sm font-bold text-ink overflow-hidden">
                                        {p.reward.imageFileId
                                            ? <img src={sbcApiService.generateThumbnailUrl(p.reward.imageFileId, 96)} alt="" className="size-full object-cover" />
                                            : `${p.rank}${p.rank === 1 ? 'er' : 'e'}`}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-ink">{p.rank === 1 ? '1er' : `${p.rank}e`} — {p.reward.name}</span>
                                        {typeof p.reward.estimatedValue === 'number' && p.reward.estimatedValue > 0 && (
                                            <span className="block text-xs text-ink-2">Valeur : {xaf(p.reward.estimatedValue)}</span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {scheduleRows.length > 0 && (
                    <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
                        <h3 className="text-base font-bold text-ink flex items-center gap-2">
                            <HugeiconsIcon icon={Calendar03Icon} size={17} className="text-primary" />
                            Calendrier
                        </h3>
                        <ul className="flex flex-col gap-1.5">
                            {scheduleRows.map((r) => {
                                const left = countdown(r.at);
                                return (
                                    <li key={r.label} className="flex items-start justify-between gap-3 text-sm">
                                        <span className="text-ink-2">{r.label}</span>
                                        <span className="text-right">
                                            <span className="block font-medium text-ink">{fmtDateTime(r.at)}</span>
                                            {left && <span className="block text-[11px] text-ink-3">dans {left}</span>}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
                    <h3 className="text-base font-bold text-ink">Règles du vote</h3>
                    <ul className="flex flex-col gap-1 list-disc pl-4">
                        {rulesSummary(c).map((l) => <li key={l} className="text-sm text-ink-2">{l}</li>)}
                    </ul>
                    {paidMode && packages.length > 0 && (
                        <div className="mt-1">
                            <p className="text-xs font-semibold text-ink mb-1.5">Packs de votes</p>
                            <ul className="flex flex-col gap-1.5">
                                {packages.map((p) => (
                                    <li key={p._id} className="flex items-center justify-between gap-3 bg-surface-2 rounded-tile px-3 py-2 text-sm">
                                        <span className="min-w-0 truncate text-ink">{p.label} · {plural(p.votes, 'vote')}</span>
                                        <span className="shrink-0 font-semibold text-primary">{xaf(p.price)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {c.rulesText && (
                        <details className="mt-1 group">
                            <summary className="cursor-pointer text-sm font-semibold text-primary list-none">
                                <span className="group-open:hidden">Lire le règlement complet</span>
                                <span className="hidden group-open:inline">Masquer le règlement</span>
                            </summary>
                            <p className="mt-2 text-sm text-ink-2 whitespace-pre-wrap leading-relaxed">{c.rulesText}</p>
                        </details>
                    )}
                </section>

                {/* Candidates */}
                <section className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-bold text-ink flex items-center gap-2">
                            <HugeiconsIcon icon={UserGroupIcon} size={17} className="text-primary" />
                            Candidats
                        </h3>
                        {total > 0 && <span className="text-xs text-ink-2">{total}</span>}
                    </div>
                    <label className="relative block">
                        <span className="sr-only">Rechercher un candidat</span>
                        <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Nom ou numéro"
                            inputMode="search"
                            className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
                        />
                    </label>
                    <div className="flex gap-1.5 overflow-x-auto" role="group" aria-label="Trier les candidats">
                        {([['number', 'Numéro'], ...(showVotes ? [['votes', 'Votes']] : []), ['recent', 'Récents']] as [Sort, string][]).map(([k, label]) => (
                            <button
                                key={k}
                                onClick={() => setSort(k)}
                                aria-pressed={sort === k}
                                className={cn(
                                    'shrink-0 rounded-pill px-3 py-1.5 text-xs font-semibold border transition-colors',
                                    sort === k ? 'bg-primary text-white border-primary' : 'bg-surface text-ink-2 border-border',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {listError && <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">{listError}</p>}

                    {items.length === 0 && listLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="h-48" rounded="rounded-card" />)}
                        </div>
                    ) : items.length === 0 && !listError ? (
                        <p className="bg-surface border border-border rounded-card p-4 text-sm text-ink-2 text-center">
                            {debouncedQ ? 'Aucun candidat ne correspond à votre recherche.' : 'Aucun candidat validé pour le moment.'}
                        </p>
                    ) : (
                        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {items.map((it) => (
                                <li key={it._id}>
                                    <Link to={`${base}/candidats/${it.number}`} className="block bg-surface border border-border rounded-card overflow-hidden">
                                        <div className="relative aspect-square bg-surface-2">
                                            {it.photoFileId ? (
                                                <img src={sbcApiService.generateThumbnailUrl(it.photoFileId, 256)} alt="" loading="lazy" className="size-full object-cover" />
                                            ) : (
                                                <span className="size-full grid place-items-center text-2xl font-bold text-ink-3">{it.displayName?.[0]?.toUpperCase()}</span>
                                            )}
                                            <span className="absolute left-2 top-2 rounded-pill bg-ink/80 px-2 py-0.5 text-[11px] font-bold text-white">n°{it.number}</span>
                                        </div>
                                        <div className="p-2.5">
                                            <p className="text-sm font-semibold text-ink truncate">{it.displayName}</p>
                                            {it.category && <p className="text-[11px] text-ink-2 truncate">{it.category}</p>}
                                            {showVotes && typeof it.totalVotes === 'number' && (
                                                <p className="text-xs font-semibold text-primary mt-0.5 tabular-nums">{plural(it.totalVotes, 'vote')}</p>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}

                    {page < totalPages && items.length > 0 && (
                        <button
                            onClick={() => loadPage(page + 1, false)}
                            disabled={listLoading}
                            className="w-full rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
                        >
                            {listLoading ? 'Chargement…' : 'Voir plus'}
                        </button>
                    )}
                </section>
            </div>
        </div>
    );
}
