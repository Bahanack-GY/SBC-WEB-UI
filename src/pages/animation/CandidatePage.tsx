import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, CheckmarkCircle02Icon, Share08Icon, StarIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi, newIdempotencyKey } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { CANDIDATE_STATUS, CHALLENGE_STATUS, challengePath, countdown, errorMessage, fmtDateTime, info } from '../../lib/animation';
import { TONE_CLASS, xaf } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

/** Server refusal in French; a lost connection gets its own wording (the client returns statusCode ≤ 0). */
const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const FREE_MODES = ['FREE', 'FREE_AND_PAID', 'PUBLIC_AND_JURY'];
const PAID_MODES = ['PAID', 'FREE_AND_PAID', 'PUBLIC_AND_JURY'];

const plural = (n: number, word: string) => `${n.toLocaleString('fr-FR')} ${word}${n > 1 ? 's' : ''}`;

const Badge = ({ table, status }: { table: Parameters<typeof info>[0]; status?: string }) => {
    const s = info(table, status);
    return <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[s.tone])}>{s.label}</span>;
};

const packOpen = (p: any, now = Date.now()) =>
    (!p.availableFrom || new Date(p.availableFrom).getTime() <= now) && (!p.availableUntil || new Date(p.availableUntil).getTime() > now);

export default function CandidatePage() {
    const { slug = '', cslug = '', number = '' } = useParams<{ slug: string; cslug: string; number: string }>();
    const navigate = useNavigate();

    const [challenge, setChallenge] = useState<any>(null);
    const [candidate, setCandidate] = useState<any>(null);
    const [me, setMe] = useState<any>(null);
    const [quota, setQuota] = useState<any>(null);
    const [liveRank, setLiveRank] = useState<number | undefined>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [voting, setVoting] = useState(false);
    const [voteMsg, setVoteMsg] = useState<string | null>(null);
    const [voteErr, setVoteErr] = useState<string | null>(null);

    const [packId, setPackId] = useState<string | null>(null);
    const [buying, setBuying] = useState(false);
    const [buyErr, setBuyErr] = useState<string | null>(null);
    /** One key per purchase click, kept only while a network error leaves the outcome unknown. */
    const pendingKey = useRef<{ key: string; packageId: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const r = await animationApi.resolveChallenge(slug, cslug);
                if (!r.apiReportedSuccess) { if (!cancelled) setError(errText(r)); return; }
                const id = r.body.data._id;
                const [c, cand] = await Promise.all([animationApi.challenge(id), animationApi.candidateByNumber(id, Number(number))]);
                if (cancelled) return;
                if (!c.apiReportedSuccess) { setError(errText(c)); return; }
                if (!cand.apiReportedSuccess) { setError(errText(cand)); return; }
                setChallenge(c.body.data);
                setCandidate(cand.body.data);
                const candidateId = cand.body.data._id;
                // Best-effort extras: my quota/eligibility and the live rank.
                const [m, b] = await Promise.all([
                    animationApi.me(id, candidateId).catch(() => null),
                    animationApi.board(id).catch(() => null),
                ]);
                if (cancelled) return;
                if (m?.apiReportedSuccess) { setMe(m.body.data); setQuota(m.body.data.quota); }
                const entry = b?.apiReportedSuccess ? b.body.data?.entries?.find((e: any) => String(e.candidateId) === String(candidateId)) : null;
                if (entry?.rank) setLiveRank(entry.rank);
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Erreur réseau.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug, cslug, number]);

    const share = async () => {
        const url = window.location.href;
        const text = candidate && challenge ? `Votez pour ${candidate.displayName} (n°${candidate.number}) — ${challenge.name}` : '';
        try {
            if (navigator.share) { await navigator.share({ title: challenge?.name, text, url }); return; }
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* cancelled */ }
    };

    const freeVote = async () => {
        if (!challenge || !candidate) return;
        setVoting(true);
        setVoteErr(null);
        setVoteMsg(null);
        try {
            const res = await animationApi.freeVote(challenge._id, candidate._id);
            if (res.apiReportedSuccess) {
                setQuota(res.body.data);
                setVoteMsg(`Merci ! Votre vote pour ${candidate.displayName} est compté.`);
                if (typeof candidate.totalVotes === 'number') setCandidate({ ...candidate, totalVotes: candidate.totalVotes + 1 });
            } else {
                setVoteErr(errText(res));
                if (res.body?.code === 'QUOTA_EXHAUSTED') setQuota((q: any) => (q ? { ...q, remaining: 0 } : q));
            }
        } catch (e: any) {
            setVoteErr(e?.message || 'Erreur réseau. Réessayez.');
        } finally {
            setVoting(false);
        }
    };

    const buy = async () => {
        if (!challenge || !candidate || !packId) return;
        // Reuse the key only to retry the same purchase after a lost response.
        if (!pendingKey.current || pendingKey.current.packageId !== packId) {
            pendingKey.current = { key: newIdempotencyKey(), packageId: packId };
        }
        const idempotencyKey = pendingKey.current.key;
        setBuying(true);
        setBuyErr(null);
        try {
            const res = await animationApi.buyVotes(challenge._id, { candidateId: candidate._id, packageId: packId, idempotencyKey });
            const d = res.body?.data;
            if (res.apiReportedSuccess && d?.sessionId) {
                pendingKey.current = null;
                window.open(sbcApiService.generatePaymentUrl(d.sessionId), '_blank', 'noopener,noreferrer');
                navigate(`/events/votes/${d.transactionId}`);
                return;
            }
            // A definitive refusal (4xx): the next click is a new purchase. On a lost
            // response or a 5xx the outcome is unknown, so a retry reuses the key.
            if (res.statusCode >= 400 && res.statusCode < 500) pendingKey.current = null;
            setBuyErr(errText(res));
        } catch (e: any) {
            setBuyErr(e?.message || 'Erreur réseau. Réessayez : le même achat sera repris.');
        } finally {
            setBuying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-3 flex flex-col gap-3">
                <Skeleton height="h-10" rounded="rounded-card" />
                <Skeleton height="h-72" rounded="rounded-card" />
                <Skeleton height="h-32" rounded="rounded-card" />
            </div>
        );
    }
    if (error || !challenge || !candidate) {
        return (
            <div className="min-h-screen bg-bg px-4 pt-10">
                <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                    <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
                    <p className="text-sm font-semibold text-ink">{error || 'Candidat introuvable.'}</p>
                    <button onClick={() => navigate(challengePath(slug, cslug))} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                        Retour au défi
                    </button>
                </div>
            </div>
        );
    }

    const c = challenge;
    const mode: string = c.voting?.mode;
    const showVotes = Boolean(c.voting?.showVoteCounts);
    const isSelf = me?.candidacy && String(me.candidacy._id) === String(candidate._id);
    const votable = c.status === 'VOTING_OPEN' && !c.suspended && candidate.status === 'APPROVED';
    const selfBlocked = isSelf && !c.voting?.selfVoteAllowed;
    const canVote = me?.canVote;
    const freeOn = FREE_MODES.includes(mode) && quota?.enabled !== false;
    const paidOn = PAID_MODES.includes(mode);
    const packs: any[] = c.packages ?? [];
    const selectedPack = packs.find((p) => p._id === packId);
    const rank = liveRank ?? candidate.rank;
    const eventSlug = c.event?.slug || slug;

    return (
        <div className="min-h-screen bg-bg pb-8">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(challengePath(slug, cslug))} />
                <h1 className="text-lg font-bold text-ink truncate min-w-0 flex-1">{candidate.displayName}</h1>
                <button
                    onClick={share}
                    aria-label="Partager la page du candidat"
                    className="shrink-0 size-10 grid place-items-center rounded-xl border border-border bg-surface text-ink"
                >
                    <HugeiconsIcon icon={copied ? CheckmarkCircle02Icon : Share08Icon} size={18} />
                </button>
            </div>

            {candidate.photoFileId ? (
                <img src={sbcApiService.generateThumbnailUrl(candidate.photoFileId, 768)} alt={candidate.displayName} className="w-full max-h-[28rem] object-cover bg-surface-2" />
            ) : (
                <div className="w-full h-56 grid place-items-center bg-surface-2 text-5xl font-bold text-ink-3">{candidate.displayName?.[0]?.toUpperCase()}</div>
            )}

            <div className="px-4 pt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-primary">Candidat n°{candidate.number}</p>
                            <h2 className="text-xl font-bold text-ink text-balance">{candidate.displayName}</h2>
                        </div>
                        {candidate.status !== 'APPROVED' && <Badge table={CANDIDATE_STATUS} status={candidate.status} />}
                    </div>
                    {candidate.category && <p className="text-sm text-ink-2">{candidate.category}</p>}
                    <Link to={challengePath(slug, cslug)} className="text-sm font-medium text-primary">{c.name}</Link>
                    {copied && <p className="text-xs text-success">Lien copié</p>}
                </div>

                {(rank || (showVotes && typeof candidate.totalVotes === 'number')) && (
                    <div className="grid grid-cols-2 gap-2">
                        {rank ? (
                            <div className="bg-surface border border-border rounded-card p-3">
                                <p className="text-[11px] text-ink-2">Rang {liveRank ? 'actuel' : ''}</p>
                                <p className="text-lg font-bold text-ink tabular-nums">{rank === 1 ? '1er' : `${rank}e`}</p>
                            </div>
                        ) : <div />}
                        {showVotes && typeof candidate.totalVotes === 'number' && (
                            <div className="bg-surface border border-border rounded-card p-3">
                                <p className="text-[11px] text-ink-2">Votes</p>
                                <p className="text-lg font-bold text-ink tabular-nums">{candidate.totalVotes.toLocaleString('fr-FR')}</p>
                            </div>
                        )}
                    </div>
                )}

                {candidate.videoFileId && (
                    <video
                        src={sbcApiService.generateSettingsFileUrl(candidate.videoFileId)}
                        poster={candidate.photoFileId ? sbcApiService.generateThumbnailUrl(candidate.photoFileId, 768) : undefined}
                        className="w-full max-h-96 rounded-card bg-black"
                        controls
                        playsInline
                        preload="metadata"
                    />
                )}

                {candidate.description && <p className="text-sm text-ink-2 whitespace-pre-wrap leading-relaxed text-pretty">{candidate.description}</p>}

                {/* ---------- Vote panel ---------- */}
                {!votable ? (
                    <div className="bg-surface border border-border rounded-card p-4 flex items-center justify-between gap-3">
                        <p className="text-sm text-ink-2">
                            {c.suspended ? 'Les votes sont suspendus.'
                                : candidate.status !== 'APPROVED' ? 'Ce candidat ne peut plus recevoir de votes.'
                                    : c.status === 'COMPLETED' ? 'Le défi est terminé.'
                                        : ['PROGRAMMED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ACTIVE'].includes(c.status)
                                            ? `Les votes ne sont pas encore ouverts${c.schedule?.votingOpensAt ? ` (ouverture le ${fmtDateTime(c.schedule.votingOpensAt)})` : ''}.`
                                            : 'Les votes sont clos.'}
                        </p>
                        <Badge table={CHALLENGE_STATUS} status={c.status} />
                    </div>
                ) : mode === 'NONE' || mode === 'JURY' ? (
                    <p className="bg-surface border border-border rounded-card p-4 text-sm text-ink-2">
                        Ce défi est départagé {mode === 'JURY' ? 'par le jury' : 'sans vote du public'}.
                    </p>
                ) : selfBlocked ? (
                    <div className="bg-primary-soft rounded-card p-4 flex flex-col gap-2">
                        <p className="text-sm font-semibold text-ink">C’est votre candidature.</p>
                        <p className="text-xs text-ink-2">Vous ne pouvez pas voter pour vous-même : partagez votre lien pour récolter des votes.</p>
                        <button onClick={share} className="self-start rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                            {copied ? 'Lien copié' : 'Partager ma page'}
                        </button>
                    </div>
                ) : canVote?.ok === false ? (
                    <div className="bg-accent-soft rounded-card p-4 flex flex-col gap-2">
                        <p className="text-sm font-semibold text-ink">{canVote.message || 'Vous ne pouvez pas voter pour ce défi.'}</p>
                        {canVote.code === 'TICKET_REQUIRED' && (
                            <Link to={`/events/${encodeURIComponent(eventSlug)}`} className="self-start rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                                Acheter un billet
                            </Link>
                        )}
                    </div>
                ) : (
                    <section className="bg-surface border border-border rounded-card p-4 flex flex-col gap-4" aria-label="Voter">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-ink flex items-center gap-2">
                                <HugeiconsIcon icon={StarIcon} size={17} className="text-accent" />
                                Voter pour n°{candidate.number}
                            </h3>
                            {c.schedule?.votingClosesAt && countdown(c.schedule.votingClosesAt) && (
                                <span className="text-[11px] text-ink-2">Clôture dans {countdown(c.schedule.votingClosesAt)}</span>
                            )}
                        </div>

                        {freeOn && (
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={freeVote}
                                    disabled={voting || (quota && quota.remaining <= 0)}
                                    className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {voting ? 'Vote en cours…'
                                        : quota && quota.remaining <= 0
                                            ? (quota.remainingOverall > 0 ? 'Maximum atteint pour ce candidat' : 'Votes gratuits épuisés')
                                            : 'Voter gratuitement'}
                                </button>
                                {quota && (
                                    <p className="text-xs text-ink-2 text-center">
                                        {quota.remaining > 0
                                            // "pour ce candidat" only when the per-candidate cap is what limits it.
                                            ? `Il vous reste ${plural(quota.remaining, 'vote')} gratuit${quota.remaining > 1 ? 's' : ''}${quota.perCandidatePerPeriod && quota.remainingForCandidate === quota.remaining ? ' pour ce candidat' : ''}`
                                            : quota.remainingOverall > 0
                                                // The per-candidate cap is reached, not the voter's quota.
                                                ? `${quota.perCandidatePerPeriod} vote${quota.perCandidatePerPeriod > 1 ? 's' : ''} max. par candidat · il vous reste ${plural(quota.remainingOverall, 'vote')} pour d’autres candidats`
                                                : 'Plus de vote gratuit'}
                                        {` (${quota.perPeriod} ${quota.period === 'DAY' ? 'par jour' : 'pour tout le défi'})`}
                                        {quota.resetsAt && quota.remaining <= 0 ? ` · renouvelés le ${fmtDateTime(quota.resetsAt)}` : ''}
                                    </p>
                                )}
                                {voteMsg && <p role="status" className="bg-success-soft rounded-card p-3 text-sm text-success flex items-center gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />{voteMsg}</p>}
                                {voteErr && <p role="alert" className="bg-danger-soft rounded-card p-3 text-sm text-danger">{voteErr}</p>}
                            </div>
                        )}

                        {paidOn && packs.length > 0 && (
                            <div className={cn('flex flex-col gap-2', freeOn && 'pt-3 border-t border-border')}>
                                <p className="text-sm font-semibold text-ink">{freeOn ? 'Soutenir davantage' : 'Acheter des votes'}</p>
                                <div role="radiogroup" aria-label="Packs de votes" className="flex flex-col gap-1.5">
                                    {packs.map((p) => {
                                        const open = packOpen(p);
                                        const selected = packId === p._id;
                                        return (
                                            <button
                                                key={p._id}
                                                role="radio"
                                                aria-checked={selected}
                                                disabled={!open || buying}
                                                onClick={() => { setPackId(p._id); setBuyErr(null); }}
                                                className={cn(
                                                    'flex items-center justify-between gap-3 rounded-tile border px-3 py-2.5 text-left transition-colors disabled:opacity-50',
                                                    selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface',
                                                )}
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-medium text-ink truncate">{p.label}</span>
                                                    <span className="block text-xs text-ink-2">
                                                        {plural(p.votes, 'vote')}
                                                        {!open && (p.availableFrom && new Date(p.availableFrom) > new Date() ? ` · dès le ${fmtDateTime(p.availableFrom)}` : ' · indisponible')}
                                                    </span>
                                                </span>
                                                <span className="shrink-0 text-sm font-semibold text-primary">{xaf(p.price)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={buy}
                                    disabled={!selectedPack || buying}
                                    className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {buying ? 'Ouverture du paiement…' : selectedPack ? `Acheter ${plural(selectedPack.votes, 'vote')} — ${xaf(selectedPack.price)}` : 'Choisissez un pack'}
                                </button>
                                {buyErr && <p role="alert" className="bg-danger-soft rounded-card p-3 text-sm text-danger">{buyErr}</p>}
                                <p className="text-[11px] text-ink-3 text-center">
                                    Le paiement s’ouvre dans un nouvel onglet. Les votes sont crédités après confirmation du paiement.
                                </p>
                            </div>
                        )}

                        {!freeOn && !(paidOn && packs.length > 0) && (
                            <p className="text-sm text-ink-2">Aucun moyen de vote disponible pour le moment.</p>
                        )}
                    </section>
                )}

                <Link to={`${challengePath(slug, cslug)}/live`} className="text-center text-sm font-semibold text-primary">
                    Voir le classement en direct
                </Link>
            </div>
        </div>
    );
}
