import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, ChampionIcon, Tv01Icon, Wifi01Icon, WifiOff01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { CHALLENGE_STATUS, challengePath, countdown, errorMessage, info } from '../../lib/animation';
import { TONE_CLASS } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const POLL_MS = 5000;
const MAX_SSE_ERRORS = 3;

interface Entry {
    candidateId: string;
    number: number;
    displayName: string;
    photoFileId?: string;
    category?: string;
    rank: number;
    score: number;
    publicScore?: number;
    juryScore?: number;
    totalVotes?: number;
}
interface Board {
    version: number;
    status: string;
    showVoteCounts: boolean;
    scoringMethod: string;
    totals: { candidates: number; votes: number };
    entries: Entry[];
}

type Link_ = 'connecting' | 'live' | 'polling';

/** What to print next to a name — never a vote count the organizer hides. */
const scoreLabel = (b: Board, e: Entry): string | null => {
    if (b.scoringMethod === 'VOTES') {
        return b.showVoteCounts && typeof e.totalVotes === 'number' ? `${e.totalVotes.toLocaleString('fr-FR')} vote${e.totalVotes > 1 ? 's' : ''}` : null;
    }
    return `${(e.score / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pts`;
};

/** Ticks every second for the countdown. */
const useTick = (ms: number) => {
    const [, set] = useState(0);
    useEffect(() => {
        const t = setInterval(() => set((x) => x + 1), ms);
        return () => clearInterval(t);
    }, [ms]);
};

export default function LiveBoard() {
    const { slug = '', cslug = '' } = useParams<{ slug: string; cslug: string }>();
    const [params] = useSearchParams();
    const tv = params.get('tv') === '1';
    const navigate = useNavigate();
    const base = challengePath(slug, cslug);
    useTick(tv ? 1000 : 15_000);

    const [challenge, setChallenge] = useState<any>(null);
    const [board, setBoard] = useState<Board | null>(null);
    const [link, setLink] = useState<Link_>('connecting');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [moves, setMoves] = useState<Record<string, number>>({});
    const versionRef = useRef(-1);
    const ranksRef = useRef<Map<string, number>>(new Map());

    // ---------- challenge ----------
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await animationApi.resolveChallenge(slug, cslug);
                if (!r.apiReportedSuccess) { if (!cancelled) setError(errText(r)); return; }
                const c = await animationApi.challenge(r.body.data._id);
                if (cancelled) return;
                if (!c.apiReportedSuccess) { setError(errText(c)); return; }
                setChallenge(c.body.data);
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Erreur réseau.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug, cslug]);

    const apply = useCallback((b: Board | null) => {
        if (!b || typeof b.version !== 'number' || b.version < versionRef.current) return;
        versionRef.current = b.version;
        const prev = ranksRef.current;
        const delta: Record<string, number> = {};
        for (const e of b.entries) {
            const before = prev.get(e.candidateId);
            if (before !== undefined && before !== e.rank) delta[e.candidateId] = before - e.rank;
        }
        ranksRef.current = new Map(b.entries.map((e) => [e.candidateId, e.rank]));
        setBoard(b);
        if (Object.keys(delta).length) setMoves(delta);
    }, []);

    // Rank arrows fade after a few seconds.
    useEffect(() => {
        if (!Object.keys(moves).length) return;
        const t = setTimeout(() => setMoves({}), 4000);
        return () => clearTimeout(t);
    }, [moves]);

    // ---------- live link: SSE first, polling when it can't hold ----------
    const challengeId: string | undefined = challenge?._id;
    useEffect(() => {
        if (!challengeId) return;
        let stopped = false;
        let es: EventSource | null = null;
        let pollTimer: ReturnType<typeof setTimeout> | undefined;
        let errors = 0;

        const fetchOnce = async () => {
            try {
                const r = await animationApi.board(challengeId);
                if (!stopped && r.apiReportedSuccess && r.body?.data) apply(r.body.data);
            } catch { /* next tick */ }
        };
        const startPolling = () => {
            if (stopped || pollTimer !== undefined) return;
            es?.close();
            es = null;
            setLink('polling');
            const tick = async () => {
                await fetchOnce();
                if (!stopped) pollTimer = setTimeout(tick, POLL_MS);
            };
            pollTimer = setTimeout(tick, 0);
        };

        fetchOnce();
        if (typeof window.EventSource === 'undefined') {
            startPolling();
        } else {
            es = new EventSource(animationApi.streamUrl(challengeId));
            es.addEventListener('board', (ev) => {
                errors = 0;
                setLink('live');
                try { apply(JSON.parse((ev as MessageEvent).data)); } catch { /* malformed frame */ }
            });
            es.onopen = () => { errors = 0; setLink('live'); };
            es.onerror = () => {
                errors++;
                // CLOSED right away = the server refused the stream (e.g. 429 STREAM_LIMIT).
                if (es?.readyState === EventSource.CLOSED || errors >= MAX_SSE_ERRORS) startPolling();
                else setLink('connecting');
            };
        }
        return () => {
            stopped = true;
            es?.close();
            if (pollTimer !== undefined) clearTimeout(pollTimer);
        };
    }, [challengeId, apply]);

    // ---------- TV: keep the screen awake, hide an idle cursor ----------
    const [cursorHidden, setCursorHidden] = useState(false);
    useEffect(() => {
        if (!tv) return;
        let lock: any = null;
        const request = async () => {
            try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* unsupported or refused */ }
        };
        request();
        const onVisible = () => { if (document.visibilityState === 'visible') request(); };
        document.addEventListener('visibilitychange', onVisible);
        let idle: ReturnType<typeof setTimeout>;
        const onMove = () => {
            setCursorHidden(false);
            clearTimeout(idle);
            idle = setTimeout(() => setCursorHidden(true), 2500);
        };
        onMove();
        window.addEventListener('mousemove', onMove);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('mousemove', onMove);
            clearTimeout(idle);
            try { lock?.release?.(); } catch { /* already released */ }
        };
    }, [tv]);

    const status: string = board?.status || challenge?.status || '';
    const closesAt: string | undefined = challenge?.schedule?.votingClosesAt;
    const left = status === 'VOTING_OPEN' ? countdown(closesAt) : '';
    const entries = board?.entries ?? [];

    // ================= TV mode =================
    if (tv) {
        const voteUrl = `${window.location.origin}${base}`;
        const top = entries.slice(0, 10);
        return (
            <div
                className={cn('fixed inset-0 z-[100] w-full overflow-hidden text-white flex flex-col', cursorHidden && 'cursor-none')}
                style={{ background: '#0B1020' }}
            >
                <header className="flex items-center justify-between gap-6 px-[3vw] pt-[2.5vh] pb-[1.5vh]">
                    <div className="min-w-0">
                        <p className="text-[clamp(14px,1.4vw,24px)] font-semibold text-white/60 truncate">{challenge?.event?.title}</p>
                        <h1 className="text-[clamp(28px,3.6vw,64px)] font-extrabold leading-tight truncate">{challenge?.name || 'Classement'}</h1>
                    </div>
                    <div className="shrink-0 flex items-center gap-[2vw]">
                        {board?.showVoteCounts && (
                            <div className="text-right">
                                <p className="text-[clamp(12px,1.1vw,20px)] text-white/60">Votes</p>
                                <p className="text-[clamp(24px,3vw,56px)] font-extrabold tabular-nums">{board.totals.votes.toLocaleString('fr-FR')}</p>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-[clamp(12px,1.1vw,20px)] text-white/60">{status === 'VOTING_OPEN' ? 'Clôture dans' : 'Statut'}</p>
                            <p className="text-[clamp(20px,2.6vw,48px)] font-extrabold tabular-nums">{left || info(CHALLENGE_STATUS, status).label}</p>
                        </div>
                    </div>
                </header>

                <main className="flex-1 min-h-0 grid grid-cols-[1fr_auto] gap-[3vw] px-[3vw] pb-[3vh]">
                    {!board ? (
                        <div className="grid place-items-center text-[2vw] text-white/60">{error || 'Connexion au classement…'}</div>
                    ) : top.length === 0 ? (
                        <div className="grid place-items-center text-[2vw] text-white/60">Aucun candidat pour le moment.</div>
                    ) : (
                        <ol className="min-h-0 flex flex-col gap-[1vh]">
                            <AnimatePresence initial={false}>
                                {top.map((e) => {
                                    const podium = e.rank <= 3;
                                    const color = e.rank === 1 ? '#F5B301' : e.rank === 2 ? '#C9D1DC' : e.rank === 3 ? '#D58A4A' : 'rgba(255,255,255,0.35)';
                                    const mv = moves[e.candidateId];
                                    return (
                                        <motion.li
                                            key={e.candidateId}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                                            className="flex items-center gap-[1.5vw] rounded-[1.2vw] px-[1.5vw]"
                                            style={{ background: podium ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', height: podium ? '10.5vh' : '6.8vh' }}
                                        >
                                            <span className="w-[4.5vw] text-center font-extrabold tabular-nums" style={{ color, fontSize: podium ? '4.2vh' : '3vh' }}>
                                                {e.rank}
                                            </span>
                                            <span className="shrink-0 rounded-full overflow-hidden bg-white/10" style={{ width: podium ? '8vh' : '5vh', height: podium ? '8vh' : '5vh', boxShadow: `0 0 0 3px ${color}` }}>
                                                {e.photoFileId && <img src={sbcApiService.generateThumbnailUrl(e.photoFileId, 256)} alt="" className="size-full object-cover" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-bold truncate" style={{ fontSize: podium ? '3.6vh' : '2.6vh' }}>{e.displayName}</span>
                                                <span className="block text-white/55 truncate" style={{ fontSize: '1.8vh' }}>
                                                    n°{e.number}{e.category ? ` · ${e.category}` : ''}
                                                </span>
                                            </span>
                                            {mv ? (
                                                <span className={cn('font-bold', mv > 0 ? 'text-[#4ADE80]' : 'text-[#F87171]')} style={{ fontSize: '2.2vh' }}>
                                                    {mv > 0 ? `▲ ${mv}` : `▼ ${-mv}`}
                                                </span>
                                            ) : null}
                                            {scoreLabel(board, e) && (
                                                <span className="shrink-0 font-extrabold tabular-nums" style={{ fontSize: podium ? '3.4vh' : '2.6vh' }}>{scoreLabel(board, e)}</span>
                                            )}
                                        </motion.li>
                                    );
                                })}
                            </AnimatePresence>
                        </ol>
                    )}

                    <aside className="w-[18vw] min-w-[180px] flex flex-col items-center justify-center gap-[1.5vh] text-center">
                        {status === 'VOTING_OPEN' ? (
                            <>
                                <p className="text-[clamp(16px,1.6vw,30px)] font-bold">Votez maintenant</p>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(voteUrl)}`}
                                    alt="QR code vers la page de vote"
                                    className="w-full max-w-[16vw] min-w-[160px] aspect-square rounded-[1vw] bg-white"
                                />
                                <p className="text-[clamp(11px,0.9vw,16px)] text-white/60 break-all">{voteUrl.replace(/^https?:\/\//, '')}</p>
                            </>
                        ) : status === 'COMPLETED' ? (
                            <>
                                <HugeiconsIcon icon={ChampionIcon} size={64} className="text-[#F5B301]" />
                                <p className="text-[clamp(16px,1.6vw,30px)] font-bold">Résultats publiés</p>
                            </>
                        ) : (
                            <p className="text-[clamp(16px,1.6vw,30px)] font-bold text-white/70">{info(CHALLENGE_STATUS, status).label}</p>
                        )}
                        <p className="flex items-center gap-2 text-[clamp(11px,0.9vw,16px)] text-white/50">
                            <span className={cn('size-2 rounded-full', link === 'live' ? 'bg-[#22C55E] animate-pulse' : link === 'polling' ? 'bg-[#F59E0B]' : 'bg-white/40')} />
                            {link === 'live' ? 'En direct' : link === 'polling' ? 'Mise à jour toutes les 5 s' : 'Connexion…'}
                        </p>
                    </aside>
                </main>
            </div>
        );
    }

    // ================= Normal mode =================
    if (loading) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-3 flex flex-col gap-3">
                <Skeleton height="h-10" rounded="rounded-card" />
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="h-16" rounded="rounded-card" />)}
            </div>
        );
    }
    if (error || !challenge) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-10">
                <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                    <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                    <p className="text-sm font-semibold text-ink">{error || 'Défi introuvable.'}</p>
                    <button onClick={() => navigate(base)} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">Retour au défi</button>
                </div>
            </div>
        );
    }

    const st = info(CHALLENGE_STATUS, status);
    const votingOpen = status === 'VOTING_OPEN';

    return (
        <div className="min-h-screen bg-bg pb-8">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(base)} />
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold text-ink truncate">Classement en direct</h1>
                    <p className="text-xs text-ink-2 truncate">{challenge.name}</p>
                </div>
                <Link
                    to={`${base}/live?tv=1`}
                    aria-label="Mode grand écran"
                    className="shrink-0 size-10 grid place-items-center rounded-xl border border-border bg-surface text-ink"
                >
                    <HugeiconsIcon icon={Tv01Icon} size={18} />
                </Link>
            </div>

            <div className="px-4 flex flex-col gap-3">
                <div className="bg-surface border border-border rounded-card p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>{st.label}</span>
                        {left && <p className="text-sm font-semibold text-ink mt-1">Clôture dans {left}</p>}
                        {board?.showVoteCounts && <p className="text-xs text-ink-2 mt-0.5 tabular-nums">{board.totals.votes.toLocaleString('fr-FR')} votes au total</p>}
                    </div>
                    <span className={cn('shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold', link === 'live' ? 'text-success' : 'text-ink-2')}>
                        <HugeiconsIcon icon={link === 'connecting' ? WifiOff01Icon : Wifi01Icon} size={14} />
                        {link === 'live' ? 'Connecté en direct' : link === 'polling' ? 'Actualisé toutes les 5 s' : 'Connexion…'}
                    </span>
                </div>

                {status === 'COMPLETED' && (
                    <Link to={`${base}/resultats`} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-semibold text-white">
                        <HugeiconsIcon icon={ChampionIcon} size={16} />
                        Résultats publiés
                    </Link>
                )}

                {!board ? (
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="h-16" rounded="rounded-card" />)}
                    </div>
                ) : entries.length === 0 ? (
                    <p className="bg-surface border border-border rounded-card p-4 text-sm text-ink-2 text-center">Aucun candidat pour le moment.</p>
                ) : (
                    <ol className="flex flex-col gap-2">
                        <AnimatePresence initial={false}>
                            {entries.map((e) => {
                                const mv = moves[e.candidateId];
                                const label = scoreLabel(board, e);
                                return (
                                    <motion.li
                                        key={e.candidateId}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                                        className={cn(
                                            'bg-surface border rounded-card p-2.5 flex items-center gap-3',
                                            e.rank <= 3 ? 'border-accent' : 'border-border',
                                        )}
                                    >
                                        <span className={cn(
                                            'w-8 shrink-0 text-center text-base font-extrabold tabular-nums',
                                            e.rank === 1 ? 'text-accent' : e.rank <= 3 ? 'text-ink' : 'text-ink-3',
                                        )}>
                                            {e.rank}
                                        </span>
                                        <Link to={`${base}/candidats/${e.number}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                                            <span className="size-11 shrink-0 rounded-pill bg-surface-2 overflow-hidden grid place-items-center text-sm font-bold text-ink-3">
                                                {e.photoFileId
                                                    ? <img src={sbcApiService.generateThumbnailUrl(e.photoFileId, 128)} alt="" loading="lazy" className="size-full object-cover" />
                                                    : e.displayName?.[0]?.toUpperCase()}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold text-ink truncate">{e.displayName}</span>
                                                <span className="block text-[11px] text-ink-2 truncate">
                                                    n°{e.number}{e.category ? ` · ${e.category}` : ''}{label ? ` · ${label}` : ''}
                                                </span>
                                            </span>
                                        </Link>
                                        {mv ? (
                                            <span className={cn('shrink-0 text-[11px] font-bold', mv > 0 ? 'text-success' : 'text-danger')} aria-label={mv > 0 ? `Gagne ${mv} place(s)` : `Perd ${-mv} place(s)`}>
                                                {mv > 0 ? `▲${mv}` : `▼${-mv}`}
                                            </span>
                                        ) : null}
                                        {votingOpen && (
                                            <Link
                                                to={`${base}/candidats/${e.number}`}
                                                aria-label={`Voter pour ${e.displayName}`}
                                                className="shrink-0 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                                            >
                                                Voter
                                            </Link>
                                        )}
                                    </motion.li>
                                );
                            })}
                        </AnimatePresence>
                    </ol>
                )}

                {status === 'COMPLETED' && (
                    <p className="text-[11px] text-ink-3 text-center">Seuls les résultats publiés font foi (départage des ex æquo compris).</p>
                )}
            </div>
        </div>
    );
}
