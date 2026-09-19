import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { HelpCircleIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { statusInfo, TONE_CLASS } from '../lib/eventStatus';
import { cn } from '../lib/utils';

interface Dispute {
    _id: string;
    kind: string;
    description: string;
    status: string;
    resolutionNote?: string;
    createdAt: string;
    resolvedAt?: string;
}

const KIND_LABEL: Record<string, string> = {
    EVENT_NOT_AS_ADVERTISED: "Événement non conforme",
    RESALE_INVALID_TICKET: 'Billet de revente invalide',
    RESALE_NOT_RECEIVED: 'Billet de revente non reçu',
    OTHER: 'Autre problème',
};

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function MyDisputes() {
    const navigate = useNavigate();
    const [items, setItems] = useState<Dispute[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await sbcApiService.listMyDisputes();
                if (res.apiReportedSuccess) setItems(res.body?.data || []);
                else setError(res.message || 'Impossible de charger vos signalements.');
            } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Mes signalements</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-3">
                {loading ? (
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height="h-32" rounded="rounded-card" />)}
                    </div>
                ) : error ? (
                    <p className="bg-danger-soft rounded-card p-3 text-sm text-danger">{error}</p>
                ) : items.length === 0 ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={HelpCircleIcon} size={30} className="text-ink-3" />
                        <p className="text-sm font-semibold text-ink">Aucun signalement</p>
                        <p className="text-xs text-ink-2">Un problème avec un billet ? Signalez-le depuis le billet concerné.</p>
                        <button onClick={() => navigate('/events/mes-billets')} className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white">
                            Mes billets
                        </button>
                    </div>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {items.map((d) => {
                            const st = statusInfo('dispute', d.status);
                            return (
                                <li key={d._id} className="bg-surface border border-border rounded-card p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold text-ink">{KIND_LABEL[d.kind] ?? d.kind}</p>
                                        <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>
                                            {st.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-ink-3 mt-0.5">Ouvert le {fmt(d.createdAt)}</p>
                                    <p className="mt-2 text-sm text-ink-2 whitespace-pre-wrap">{d.description}</p>

                                    {d.resolutionNote && (
                                        <div className="mt-3 rounded-tile bg-surface-2 p-3">
                                            <p className="text-[11px] font-semibold text-ink">Réponse de SBC{d.resolvedAt ? ` · ${fmt(d.resolvedAt)}` : ''}</p>
                                            <p className="mt-1 text-xs text-ink-2 whitespace-pre-wrap">{d.resolutionNote}</p>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
