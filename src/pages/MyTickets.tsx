import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Ticket01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { ticketStatusInfo, TONE_CLASS } from '../lib/eventStatus';
import { cn } from '../lib/utils';

interface TicketRow {
    ticket: { _id: string; serial: string; status: string; resaleListingId?: string | null };
    event: { title: string; startsAt: string; venue: string; resaleEnabled?: boolean };
    ticketType: { name: string };
}

const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

export default function MyTickets() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [rows, setRows] = useState<TicketRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await sbcApiService.listMyTickets({ past: tab === 'past' });
                if (res.apiReportedSuccess && res.body?.data?.items) setRows(res.body?.data.items);
                else setError(res.message || 'Impossible de charger vos billets.');
            } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
            finally { setLoading(false); }
        })();
    }, [tab]);

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-xl font-bold text-ink">Mes billets</h1>
            </div>

            <div className="px-4 pb-8 flex flex-col gap-4">
                <div role="tablist" aria-label="Billets" className="flex gap-1 bg-surface-2 rounded-pill p-1">
                    {([['upcoming', 'À venir'], ['past', 'Passés']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            role="tab"
                            aria-selected={tab === key}
                            onClick={() => setTab(key)}
                            className={cn(
                                'flex-1 rounded-pill py-2 text-sm font-medium transition-colors duration-150',
                                tab === key ? 'bg-surface text-ink' : 'text-ink-2',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col gap-2">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="h-32" rounded="rounded-card" />)}
                    </div>
                ) : error ? (
                    <p className="bg-surface border border-border rounded-card p-4 text-sm text-danger">{error}</p>
                ) : rows.length === 0 ? (
                    <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <HugeiconsIcon icon={Ticket01Icon} size={30} className="text-ink-3" />
                        <p className="text-sm font-semibold text-ink">
                            {tab === 'past' ? 'Aucun billet passé' : 'Aucun billet à venir'}
                        </p>
                        <p className="text-xs text-ink-2">Vos billets achetés sur SBC Event apparaîtront ici.</p>
                        {tab === 'upcoming' && (
                            <button
                                onClick={() => navigate('/events')}
                                className="mt-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-white"
                            >
                                Découvrir les événements
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {rows.map((r) => {
                            const isListed = Boolean(r.ticket.resaleListingId);
                            const st = ticketStatusInfo(r.ticket.status, isListed);
                            // Eligible per §28: paid, unused, not cancelled/refunded, not already listed.
                            const canResell = tab === 'upcoming' && r.ticket.status === 'ISSUED' && !isListed
                                && r.event?.resaleEnabled !== false;

                            return (
                                <li key={r.ticket._id} className="bg-surface border border-border rounded-card p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-ink truncate">{r.event?.title || '—'}</p>
                                            <p className="text-xs text-ink-2 mt-0.5">{r.event?.startsAt ? fmt(r.event.startsAt) : ''}</p>
                                            <p className="text-xs text-ink-2">{r.event?.venue}</p>
                                            <p className="text-[11px] text-ink-3 mt-1">
                                                Billet {r.ticket.serial} · {r.ticketType?.name}
                                            </p>
                                        </div>
                                        <span className={cn('shrink-0 rounded-pill px-2 py-0.5 text-[11px] font-semibold', TONE_CLASS[st.tone])}>
                                            {st.label}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => navigate(`/events/mes-billets/${r.ticket._id}`)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                                        >
                                            Voir mon billet
                                            <HugeiconsIcon icon={ArrowRight01Icon} size={15} />
                                        </button>
                                        {canResell && (
                                            <button
                                                onClick={() => navigate(`/events/mes-billets/${r.ticket._id}/revendre`)}
                                                className="rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary-soft transition-colors"
                                            >
                                                Revendre
                                            </button>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
