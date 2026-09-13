import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';

interface Organizer { _id: string; displayName: string; status: 'PENDING' | 'APPROVED' | 'SUSPENDED'; }

export default function OrganizerHub() {
    const navigate = useNavigate();
    const [org, setOrg] = useState<Organizer | null>(null);
    const [loading, setLoading] = useState(true);
    const [applyOpen, setApplyOpen] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [bio, setBio] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dashboard, setDashboard] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const res = await sbcApiService.getMyOrganizer();
                if (res.apiReportedSuccess) setOrg(res.body?.data);
            } finally { setLoading(false); }
        })();
    }, []);

    useEffect(() => {
        if (org?.status === 'APPROVED') {
            sbcApiService.getOrganizerDashboard().then((r) => r.apiReportedSuccess && setDashboard(r.body?.data));
            sbcApiService.listMyOrganizerEvents({ limit: 20 }).then((r) => r.apiReportedSuccess && setEvents(r.body?.data.items || []));
        }
    }, [org?.status]);

    const submit = async () => {
        if (!displayName.trim()) { setError('Le nom affiché est obligatoire.'); return; }
        setSubmitting(true); setError(null);
        try {
            const res = await sbcApiService.applyAsOrganizer({
                displayName: displayName.trim(),
                contactPhone: contactPhone.trim() || undefined,
                contactEmail: contactEmail.trim() || undefined,
                bio: bio.trim() || undefined,
            });
            if (res.apiReportedSuccess) setOrg(res.body?.data);
            else setError(res.message || 'Impossible de soumettre.');
        } catch (e: any) { setError(e?.message || 'Erreur.'); }
        finally { setSubmitting(false); }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                <BackButton onClick={() => navigate('/events')} />
                <h1 className="text-lg font-semibold">Espace organisateur</h1>
            </div>

            <div className="p-4 space-y-4">
                {!org && !applyOpen && (
                    <div className="border border-dashed border-gray-300 rounded-2xl p-6 text-center">
                        <p className="text-sm text-gray-700">Vous n'êtes pas encore inscrit(e) comme organisateur.</p>
                        <button onClick={() => setApplyOpen(true)} className="mt-4 bg-[#115CF6] text-white font-semibold px-6 py-3 rounded-xl">Devenir organisateur</button>
                    </div>
                )}

                {!org && applyOpen && (
                    <div className="space-y-3">
                        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nom affiché (obligatoire)" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                        <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Téléphone de contact" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email de contact" type="email" className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Présentez brièvement votre activité" rows={3} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm" />
                        <button onClick={submit} disabled={submitting} className="w-full bg-[#115CF6] text-white font-semibold py-3 rounded-xl">{submitting ? '...' : 'Soumettre'}</button>
                        {error && <div className="text-red-600 text-sm">{error}</div>}
                    </div>
                )}

                {org && org.status === 'PENDING' && (
                    <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6 text-center">
                        <div className="text-2xl">⏳</div>
                        <p className="text-sm text-gray-700 mt-2">Votre candidature <strong>{org.displayName}</strong> est en cours d'examen.</p>
                    </div>
                )}

                {org && org.status === 'SUSPENDED' && (
                    <div className="border border-red-200 bg-red-50 rounded-2xl p-6 text-center">
                        <div className="text-sm text-red-700">Votre compte organisateur est suspendu. Contactez le support SBC.</div>
                    </div>
                )}

                {org && org.status === 'APPROVED' && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <div className="text-xs text-gray-500">Événements</div>
                                <div className="text-xl font-bold">{dashboard?.eventCount ?? '—'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <div className="text-xs text-gray-500">Billets vendus</div>
                                <div className="text-xl font-bold">{dashboard?.issued ?? '—'}</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <div className="text-xs text-gray-500">CA brut</div>
                                <div className="text-lg font-bold">{(dashboard?.gross ?? 0).toLocaleString('fr-FR')} XAF</div>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <div className="text-xs text-gray-500">Entrées validées</div>
                                <div className="text-xl font-bold">{dashboard?.checkedIn ?? '—'}</div>
                            </div>
                        </div>

                        <button onClick={() => navigate('/events/organizer/nouveau')} className="w-full bg-[#115CF6] text-white font-semibold py-3 rounded-xl">+ Créer un événement</button>
                        <button onClick={() => navigate('/events/organizer/finances')} className="w-full border border-[#115CF6] text-[#115CF6] font-semibold py-3 rounded-xl">Voir mes finances</button>

                        <div>
                            <h2 className="text-base font-semibold mb-2">Mes événements</h2>
                            {events.length === 0 ? (
                                <div className="text-sm text-gray-500">Aucun événement pour l'instant.</div>
                            ) : (
                                <div className="space-y-2">
                                    {events.map((ev) => (
                                        <div key={ev._id} onClick={() => navigate(`/events/organizer/${ev._id}`)} className="border border-gray-200 rounded-xl p-3 cursor-pointer active:opacity-70">
                                            <div className="font-medium">{ev.title}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{new Date(ev.startsAt).toLocaleDateString('fr-FR')} · {ev.venue}</div>
                                            <div className="text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{ev.status}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
