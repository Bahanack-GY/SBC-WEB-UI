import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import BackButton from '../components/common/BackButton';
import { statusInfo, TONE_CLASS, xaf } from '../lib/eventStatus';

interface Organizer { _id: string; displayName: string; status: 'PENDING' | 'APPROVED' | 'SUSPENDED'; }

const inputClass = 'w-full bg-surface border border-border rounded-tile px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-primary';

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="bg-surface border border-border rounded-card p-3 text-center">
            <div className="text-xs text-ink-2">{label}</div>
            <div className={`text-lg font-bold mt-1 ${accent ? 'text-success' : 'text-ink'}`}>{value}</div>
        </div>
    );
}

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
    // Live withdrawable figure (§16). Its own call, its own failure: a balance
    // service hiccup must not blank the dashboard, so it just stays "—".
    const [available, setAvailable] = useState<number | null>(null);

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
            sbcApiService.getEventOrganizerBalance()
                .then((r) => { if (r.apiReportedSuccess) setAvailable(r.body?.data?.eventOrganizerBalance ?? 0); })
                .catch(() => undefined);
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

    if (loading) return <div className="min-h-screen bg-bg p-8 text-center text-ink-2">Chargement...</div>;

    return (
        <div className="min-h-screen bg-bg">
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={() => navigate('/events')} />
                <h1 className="text-lg font-semibold text-ink">Espace organisateur</h1>
            </div>

            <div className="p-4 space-y-4">
                {!org && !applyOpen && (
                    <div className="bg-surface border border-dashed border-border rounded-card p-6 text-center">
                        <p className="text-sm text-ink-2">Vous n'êtes pas encore inscrit(e) comme organisateur.</p>
                        <button onClick={() => setApplyOpen(true)} className="mt-4 bg-primary hover:bg-primary-hover text-white font-semibold px-6 py-3 rounded-tile transition-colors">Devenir organisateur</button>
                    </div>
                )}

                {!org && applyOpen && (
                    <div className="space-y-3">
                        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nom affiché (obligatoire)" className={inputClass} />
                        <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Téléphone de contact" className={inputClass} />
                        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email de contact" type="email" className={inputClass} />
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Présentez brièvement votre activité" rows={3} className={inputClass} />
                        <button onClick={submit} disabled={submitting} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-tile transition-colors disabled:opacity-60">{submitting ? '...' : 'Soumettre'}</button>
                        {error && <div className="bg-danger-soft border border-border rounded-tile p-3 text-sm text-danger">{error}</div>}
                    </div>
                )}

                {org && org.status === 'PENDING' && (
                    <div className="bg-accent-soft border border-border rounded-card p-6 text-center">
                        <div className="text-2xl">⏳</div>
                        <p className="text-sm text-ink-2 mt-2">Votre candidature <strong className="text-ink">{org.displayName}</strong> est en cours d'examen.</p>
                    </div>
                )}

                {org && org.status === 'SUSPENDED' && (
                    <div className="bg-danger-soft border border-border rounded-card p-6 text-center">
                        <div className="text-sm text-danger">Votre compte organisateur est suspendu. Contactez le support SBC.</div>
                    </div>
                )}

                {org && org.status === 'APPROVED' && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <Metric label="Événements" value={String(dashboard?.eventCount ?? '—')} />
                            <Metric label="Billets vendus" value={String(dashboard?.issued ?? '—')} />
                            <Metric label="CA brut" value={xaf(dashboard?.gross ?? 0)} />
                            <Metric label="Entrées validées" value={String(dashboard?.checkedIn ?? '—')} />
                            <div className="col-span-2">
                                <Metric label="Revenus disponibles" value={available === null ? '—' : xaf(available)} accent />
                            </div>
                        </div>

                        <button onClick={() => navigate('/events/organizer/nouveau')} className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-tile transition-colors">+ Créer un événement</button>
                        <button onClick={() => navigate('/events/organizer/finances')} className="w-full bg-surface border border-primary text-primary font-semibold py-3 rounded-tile">Voir mes finances</button>

                        <div>
                            <h2 className="text-base font-semibold text-ink mb-2">Mes événements</h2>
                            {events.length === 0 ? (
                                <div className="text-sm text-ink-2">Aucun événement pour l'instant.</div>
                            ) : (
                                <div className="space-y-2">
                                    {events.map((ev) => {
                                        const st = statusInfo('event', ev.status);
                                        return (
                                            <button key={ev._id} onClick={() => navigate(`/events/organizer/${ev._id}`)} className="w-full text-left bg-surface border border-border rounded-card p-3 hover:bg-surface-2 transition-colors">
                                                <div className="font-medium text-ink">{ev.title}</div>
                                                <div className="text-xs text-ink-2 mt-0.5">{new Date(ev.startsAt).toLocaleDateString('fr-FR')} · {ev.venue}</div>
                                                <span className={`inline-block mt-1 rounded-pill px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
