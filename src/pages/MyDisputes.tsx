import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

interface Dispute {
    _id: string;
    kind: string;
    description: string;
    status: 'OPEN' | 'RESOLVED' | 'REJECTED';
    resolutionNote?: string;
    createdAt: string;
    resolvedAt?: string;
}

const STATUS_STYLES: Record<Dispute['status'], string> = {
    OPEN: 'bg-amber-100 text-amber-800',
    RESOLVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
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
                else setError(res.message || 'Erreur');
            } catch (e: any) { setError(e?.message || 'Erreur réseau'); }
            finally { setLoading(false); }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Mes signalements</h1>
            </div>

            <div className="p-4 space-y-3">
                {loading ? <div className="text-center text-gray-500 py-8">Chargement...</div>
                : error ? <div className="text-red-600 text-sm">{error}</div>
                : items.length === 0 ? <div className="text-center text-gray-500 py-8">Aucun signalement pour l'instant.</div>
                : items.map((d) => (
                    <div key={d._id} className="border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-start justify-between">
                            <div className="text-xs uppercase text-gray-500">{d.kind}</div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[d.status]}`}>{d.status}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{fmt(d.createdAt)}</div>
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{d.description}</p>
                        {d.resolutionNote && (
                            <div className="mt-3 border-t border-gray-100 pt-3 text-xs">
                                <div className="text-gray-500">Réponse SBC :</div>
                                <div className="text-gray-700 whitespace-pre-wrap">{d.resolutionNote}</div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
