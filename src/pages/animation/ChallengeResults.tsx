import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, ChampionIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { animationApi } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { TIE_RULES, challengePath, errorMessage, fmtDateTime } from '../../lib/animation';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const ordinal = (n: number) => (n === 1 ? '1er' : `${n}e`);
const MEDAL = ['#F5B301', '#A7B1BF', '#D58A4A'];

export default function ChallengeResults() {
    const { slug = '', cslug = '' } = useParams<{ slug: string; cslug: string }>();
    const navigate = useNavigate();
    const base = challengePath(slug, cslug);

    const [result, setResult] = useState<any>(null);
    const [photos, setPhotos] = useState<Record<string, string | undefined>>({});
    const [notPublished, setNotPublished] = useState(false);
    const [challengeName, setChallengeName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const r = await animationApi.resolveChallenge(slug, cslug);
                if (!r.apiReportedSuccess) { if (!cancelled) setError(errText(r)); return; }
                const id = r.body.data._id;
                const [res, board] = await Promise.all([animationApi.result(id), animationApi.board(id).catch(() => null)]);
                if (cancelled) return;
                if (board?.apiReportedSuccess && board.body?.data?.entries) {
                    setPhotos(Object.fromEntries(board.body.data.entries.map((e: any) => [String(e.candidateId), e.photoFileId])));
                }
                if (!res.apiReportedSuccess) {
                    if (res.body?.code === 'NOT_PUBLISHED') {
                        setNotPublished(true);
                        const c = await animationApi.challenge(id);
                        if (!cancelled && c.apiReportedSuccess) setChallengeName(c.body.data.name);
                    } else setError(errText(res));
                    return;
                }
                setResult(res.body.data);
                setChallengeName(res.body.data.challenge?.name ?? '');
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Erreur réseau.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug, cslug]);

    const header = (
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
            <BackButton onClick={() => navigate(base)} />
            <div className="min-w-0">
                <h1 className="text-lg font-bold text-ink truncate">Résultats</h1>
                {challengeName && <p className="text-xs text-ink-2 truncate">{challengeName}</p>}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-bg">
                {header}
                <div className="px-4 flex flex-col gap-3">
                    <Skeleton height="h-48" rounded="rounded-card" />
                    <Skeleton height="h-40" rounded="rounded-card" />
                </div>
            </div>
        );
    }
    if (notPublished || error || !result) {
        return (
            <div className="min-h-screen bg-bg">
                {header}
                <div className="px-4 pt-6">
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={notPublished ? Clock01Icon : AlertCircleIcon} size={26} className={notPublished ? 'text-accent' : 'text-danger'} />
                        <p className="text-sm font-semibold text-ink">{notPublished ? 'Résultats bientôt publiés' : error || 'Résultats indisponibles.'}</p>
                        {notPublished && <p className="text-xs text-ink-2">L’organisateur vérifie et fige le classement avant publication.</p>}
                        <div className="mt-2 flex gap-2">
                            <button onClick={() => navigate(`${base}/live`)} className="rounded-pill border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink">Classement en direct</button>
                            <button onClick={() => navigate(base)} className="rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">Retour au défi</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const method: string = result.challenge?.scoring?.method ?? 'VOTES';
    const showVotes = Boolean(result.challenge?.voting?.showVoteCounts);
    const entries: any[] = [...(result.entries ?? [])].sort((a, b) => a.rank - b.rank || a.number - b.number);
    const podium = entries.filter((e) => e.rank <= 3).slice(0, 3);
    const tie = result.tieResolution;
    const tieLabel = tie ? TIE_RULES.find((t) => t.value === tie.method)?.label : undefined;

    const scoreOf = (e: any) => {
        if (method === 'VOTES') return showVotes && typeof e.totalVotes === 'number' ? `${e.totalVotes.toLocaleString('fr-FR')} vote${e.totalVotes > 1 ? 's' : ''}` : null;
        return `${(e.score / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} pts`;
    };

    // Podium order on screen: 2 · 1 · 3.
    const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

    return (
        <div className="min-h-screen bg-bg pb-8">
            {header}
            <div className="px-4 flex flex-col gap-4">
                {podium.length > 0 && (
                    <section className="bg-surface border border-border rounded-card p-4">
                        <h2 className="text-base font-bold text-ink flex items-center gap-2 mb-3">
                            <HugeiconsIcon icon={ChampionIcon} size={18} className="text-accent" />
                            Podium
                        </h2>
                        <div className="grid grid-cols-3 items-end gap-2">
                            {podiumOrder.map((e) => {
                                const first = e.rank === 1;
                                const photo = photos[String(e.candidateId)];
                                return (
                                    <Link key={String(e.candidateId)} to={`${base}/candidats/${e.number}`} className="flex flex-col items-center text-center min-w-0">
                                        <span
                                            className={cn('rounded-pill overflow-hidden bg-surface-2 grid place-items-center font-bold text-ink-3 border-[3px]', first ? 'size-24 text-2xl' : 'size-16 text-lg')}
                                            style={{ borderColor: MEDAL[Math.min(e.rank, 3) - 1] }}
                                        >
                                            {photo ? <img src={sbcApiService.generateThumbnailUrl(photo, 256)} alt="" className="size-full object-cover" /> : e.displayName?.[0]?.toUpperCase()}
                                        </span>
                                        <span className="mt-1.5 text-sm font-extrabold" style={{ color: MEDAL[Math.min(e.rank, 3) - 1] }}>{ordinal(e.rank)}</span>
                                        <span className="w-full text-xs font-semibold text-ink truncate">{e.displayName}</span>
                                        <span className="text-[11px] text-ink-2">n°{e.number}{e.sharedRank ? ' · ex æquo' : ''}</span>
                                        {scoreOf(e) && <span className="text-[11px] font-semibold text-primary tabular-nums">{scoreOf(e)}</span>}
                                        <span
                                            className={cn('mt-1.5 w-full rounded-t-tile', first ? 'h-16' : e.rank === 2 ? 'h-11' : 'h-8')}
                                            style={{ background: MEDAL[Math.min(e.rank, 3) - 1], opacity: 0.25 }}
                                            aria-hidden
                                        />
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}

                {tie && (
                    <section className="bg-accent-soft rounded-card p-3 text-sm text-ink">
                        <p className="font-semibold">Départage{tieLabel ? ` : ${tieLabel.toLowerCase()}` : ''}</p>
                        {tie.note && <p className="text-ink-2 mt-0.5 whitespace-pre-wrap">{tie.note}</p>}
                        {tie.at && <p className="text-[11px] text-ink-3 mt-1">{fmtDateTime(tie.at)}</p>}
                    </section>
                )}

                <section className="flex flex-col gap-2">
                    <h2 className="text-base font-bold text-ink">Classement complet</h2>
                    <ol className="bg-surface border border-border rounded-card divide-y divide-border">
                        {entries.map((e) => (
                            <li key={String(e.candidateId)}>
                                <Link to={`${base}/candidats/${e.number}`} className="flex items-center gap-3 px-3 py-2.5">
                                    <span className="w-9 shrink-0 text-center text-sm font-extrabold text-ink tabular-nums">{ordinal(e.rank)}</span>
                                    <span className="size-9 shrink-0 rounded-pill bg-surface-2 overflow-hidden grid place-items-center text-xs font-bold text-ink-3">
                                        {photos[String(e.candidateId)]
                                            ? <img src={sbcApiService.generateThumbnailUrl(photos[String(e.candidateId)], 96)} alt="" loading="lazy" className="size-full object-cover" />
                                            : e.displayName?.[0]?.toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-ink truncate">{e.displayName}</span>
                                        <span className="block text-[11px] text-ink-2">
                                            n°{e.number}
                                            {e.sharedRank && <span className="ml-1 rounded-pill bg-accent-soft px-1.5 py-px font-semibold text-ink">ex æquo</span>}
                                        </span>
                                    </span>
                                    {scoreOf(e) && <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">{scoreOf(e)}</span>}
                                </Link>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="text-[11px] text-ink-3 flex flex-col gap-0.5">
                    {result.frozenAt && <p>Classement figé le {fmtDateTime(result.frozenAt)}</p>}
                    {result.publishedAt && <p>Publié le {fmtDateTime(result.publishedAt)}</p>}
                    {result.inputsHash && (
                        <p className="break-all">Empreinte de vérification : <span className="font-mono">{result.inputsHash}</span></p>
                    )}
                </section>
            </div>
        </div>
    );
}
