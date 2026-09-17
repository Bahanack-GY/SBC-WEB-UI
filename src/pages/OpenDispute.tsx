import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

const KINDS: { value: string; label: string }[] = [
    { value: 'EVENT_NOT_AS_ADVERTISED', label: 'L\'événement ne correspond pas à la description' },
    { value: 'RESALE_INVALID_TICKET', label: 'Le billet de revente est invalide' },
    { value: 'RESALE_NOT_RECEIVED', label: 'Je n\'ai pas reçu le billet acheté' },
    { value: 'OTHER', label: 'Autre problème' },
];

export default function OpenDispute() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as { ticketId?: string; resaleOrderId?: string; eventTitle?: string; serial?: string };
    const [kind, setKind] = useState<string>('OTHER');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ok, setOk] = useState(false);

    const submit = async () => {
        if (description.trim().length < 10) { setError('Décrivez le problème en au moins 10 caractères.'); return; }
        setSubmitting(true); setError(null);
        try {
            const res = await sbcApiService.openTicketDispute({
                kind: kind as any,
                description: description.trim(),
                ticketId: state.ticketId,
                resaleOrderId: state.resaleOrderId,
            });
            if (res.apiReportedSuccess) setOk(true);
            else setError(res.message || 'Erreur lors de l\'ouverture du litige.');
        } catch (e: any) { setError(e?.message || 'Erreur réseau.'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate(-1)} />
                <h1 className="text-lg font-semibold">Signaler un problème</h1>
            </div>

            <div className="p-4 space-y-4">
                {ok ? (
                    <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6 text-center space-y-3">
                        <div className="text-2xl">✅</div>
                        <div className="font-semibold text-emerald-900">Litige enregistré</div>
                        <p className="text-sm text-emerald-800">
                            L'équipe SBC va examiner votre signalement. Vous recevrez une notification une fois la décision prise.
                        </p>
                        <button onClick={() => navigate('/events/mes-billets')} className="mt-2 bg-[#115CF6] text-white font-semibold px-6 py-2 rounded-xl">Retour à mes billets</button>
                    </div>
                ) : (
                    <>
                        {(state.eventTitle || state.serial) && (
                            <div className="bg-gray-50 rounded-xl p-3 text-sm">
                                {state.eventTitle && <div className="font-medium">{state.eventTitle}</div>}
                                {state.serial && <div className="text-xs text-gray-500">Billet {state.serial}</div>}
                            </div>
                        )}
                        <label className="block">
                            <span className="text-sm text-gray-700">Type de problème</span>
                            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm mt-2">
                                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-sm text-gray-700">Description (au moins 10 caractères)</span>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Décrivez ce qui s'est passé..."
                                rows={6}
                                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm mt-2"
                            />
                        </label>
                        {error && <div className="text-red-600 text-sm">{error}</div>}
                        <button onClick={submit} disabled={submitting} className="w-full bg-[#115CF6] text-white font-semibold py-3 rounded-xl">
                            {submitting ? '...' : 'Envoyer le signalement'}
                        </button>
                    </>
                )}

                <div>
                    <button onClick={() => navigate('/events/mes-disputes')} className="w-full text-sm text-[#115CF6] py-2">
                        Voir mes signalements précédents
                    </button>
                </div>
            </div>
        </div>
    );
}
