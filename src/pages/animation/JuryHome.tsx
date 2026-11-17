import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Medal01Icon } from '@hugeicons/core-free-icons';
import { animationApi } from '../../services/animationApi';
import BackButton from '../../components/common/BackButton';
import Skeleton from '../../components/common/Skeleton';
import { CHALLENGE_STATUS, errorMessage, info } from '../../lib/animation';
import { TONE_CLASS } from '../../lib/eventStatus';
import { cn } from '../../lib/utils';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));
const SCORING_OPEN = ['ACTIVE', 'VOTING_OPEN', 'VOTING_CLOSED'];

export default function JuryHome() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await animationApi.juryAssignments();
                if (res.apiReportedSuccess) setRows(res.body.data ?? []);
                else setError(errText(res));
            } catch (e: any) {
                setError(e?.message || 'Erreur réseau.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Espace jury</h1>
            </div>
            <div className="px-4 pb-8 flex flex-col gap-3">
                <p className="text-xs text-ink-2">Les défis pour lesquels vous êtes membre du jury. Votre notation est confidentielle : les autres jurés ne voient pas vos notes.</p>
                {loading ? (
                    Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height="h-24" rounded="rounded-card" />)
                ) : error ? (
                    <p className="bg-surface border border-border rounded-card p-4 text-sm text-danger">{error}</p>
                ) : rows.length === 0 ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={Medal01Icon} size={30} className="text-ink-3" />
                        <p className="text-sm font-semibold text-ink">Aucun défi à noter</p>
                        <p className="text-xs text-ink-2">Quand un organisateur vous invite dans un jury, le défi apparaît ici.</p>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {rows.map((c) => {
                            const st = info(CHALLENGE_STATUS, c.status);
                            const total = c.counters?.approved ?? 0;
                            const done = c.submitted ?? 0;
                            const open = SCORING_OPEN.includes(c.status);
                            return (
                                <li key={String(c._id)}>
                                    <Link to={`/events/jury/${c._id}`} className="bg-surface border border-border rounded-card p-4 flex flex-col gap-2">
                                        <div className="flex items-start justify-between gap-3">
                                            <span className="min-w-0">
                                                <span className="block text-xs text-ink-2 truncate">{c.event?.title}</span>
                                                <span className="block font-semibold text-ink truncate">{c.name}</span>
                                            </span>
                                            <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>{st.label}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 flex-1 rounded-pill bg-surface-2 overflow-hidden" aria-hidden>
                                                <div className="h-full bg-primary" style={{ width: `${total ? Math.min(100, (100 * done) / total) : 0}%` }} />
                                            </div>
                                            <span className="shrink-0 text-xs font-semibold text-ink tabular-nums">{done}/{total} notés</span>
                                        </div>
                                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                                            {open ? (done < total ? 'Noter les candidats' : 'Revoir mes notes') : 'Voir'}
                                            <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
