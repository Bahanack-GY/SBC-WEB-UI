import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

interface TicketRow {
    ticket: { _id: string; serial: string; status: string };
    event: { title: string; startsAt: string; venue: string };
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
            try {
                const res = await sbcApiService.listMyTickets({ past: tab === 'past' });
                if (res.apiReportedSuccess && res.body?.data?.items) setRows(res.body?.data.items);
                else setError(res.message || 'Erreur');
            } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
            finally { setLoading(false); }
        })();
    }, [tab]);

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Mes billets</h1>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex bg-gray-100 rounded-xl p-1">
                    <button className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'upcoming' ? 'bg-white shadow' : 'text-gray-500'}`} onClick={() => setTab('upcoming')}>À venir</button>
                    <button className={`flex-1 py-2 rounded-lg text-sm font-medium ${tab === 'past' ? 'bg-white shadow' : 'text-gray-500'}`} onClick={() => setTab('past')}>Passés</button>
                </div>

                {loading ? (
                    <div className="text-center text-gray-500 py-8">Chargement...</div>
                ) : error ? (
                    <div className="text-red-600 text-sm">{error}</div>
                ) : rows.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">Aucun billet.</div>
                ) : (
                    <div className="space-y-3">
                        {rows.map((r) => (
                            <div
                                key={r.ticket._id}
                                onClick={() => navigate(`/events/mes-billets/${r.ticket._id}`)}
                                className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm cursor-pointer active:opacity-70"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold text-gray-900">{r.event?.title || '—'}</div>
                                        <div className="text-xs text-gray-500 mt-1">{r.event?.startsAt ? fmt(r.event.startsAt) : ''}</div>
                                        <div className="text-xs text-gray-500">{r.event?.venue}</div>
                                        <div className="text-xs text-gray-400 mt-1">Billet {r.ticket.serial} · {r.ticketType?.name}</div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${r.ticket.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {r.ticket.status}
                                    </span>
                                </div>
                                <button className="mt-3 w-full bg-[#115CF6] text-white text-sm font-medium py-2 rounded-xl">Voir mon billet</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
