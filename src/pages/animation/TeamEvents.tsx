import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../../components/common/BackButton';
import { animationApi } from '../../services/animationApi';
import { statusInfo, TONE_CLASS } from '../../lib/eventStatus';
import { errorMessage } from '../../lib/animation';

const ROLE_LABEL: Record<string, string> = {
    OWNER: 'Organisateur',
    MANAGER: 'Gestionnaire',
    MODERATOR: 'Modérateur',
    STAFF: 'Staff',
};

/** « Mes événements en équipe » — every event where this member holds a team role. */
export default function TeamEvents() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [juryChallenges, setJuryChallenges] = useState(0);

    useEffect(() => {
        (async () => {
            const res = await animationApi.myTeams();
            if (res.apiReportedSuccess) {
                setEvents(res.body?.data?.events ?? []);
                setJuryChallenges(res.body?.data?.juryChallenges ?? 0);
            } else {
                setError(res.statusCode === 401 ? 'Session expirée : reconnectez-vous.' : errorMessage(res));
            }
            setLoading(false);
        })();
    }, []);

    return (
        <div className="min-h-screen bg-bg">
            <div className="bg-surface p-4 flex items-center gap-3 border-b border-border">
                <BackButton onClick={() => navigate('/events/organizer')} />
                <h1 className="text-lg font-semibold text-ink">Mes événements en équipe</h1>
            </div>

            <div className="p-4 space-y-3">
                {loading && <div className="text-center text-ink-2 text-sm py-8">Chargement…</div>}
                {error && <div className="bg-danger-soft border border-border rounded-tile p-3 text-sm text-danger">{error}</div>}

                {!loading && juryChallenges > 0 && (
                    <button onClick={() => navigate('/events/jury')} className="w-full text-left bg-accent-soft border border-border rounded-card p-3">
                        <div className="font-semibold text-ink">⚖️ Espace jury</div>
                        <div className="text-xs text-ink-2 mt-0.5">
                            Vous êtes juré de {juryChallenges} défi{juryChallenges > 1 ? 's' : ''}. Notez les candidats.
                        </div>
                    </button>
                )}

                {!loading && !error && events.length === 0 && (
                    <div className="bg-surface border border-dashed border-border rounded-card p-6 text-center text-sm text-ink-2">
                        Vous ne faites partie d’aucune équipe d’animation pour le moment.
                        <div className="text-xs text-ink-3 mt-2">Un organisateur peut vous ajouter comme gestionnaire, modérateur ou staff.</div>
                    </div>
                )}

                {events.map((ev) => {
                    const st = statusInfo('event', ev.status);
                    return (
                        <button
                            key={ev._id}
                            onClick={() => navigate(`/events/organizer/${ev._id}/animation`)}
                            className="w-full text-left bg-surface border border-border rounded-card p-3 hover:bg-surface-2 transition-colors"
                        >
                            <div className="font-medium text-ink">{ev.title}</div>
                            {ev.startsAt && <div className="text-xs text-ink-2 mt-0.5">{new Date(ev.startsAt).toLocaleDateString('fr-FR')}</div>}
                            <div className="flex flex-wrap gap-1 mt-1">
                                <span className="inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold bg-primary-soft text-primary">
                                    {ROLE_LABEL[ev.role] ?? ev.role ?? 'Équipe'}
                                </span>
                                <span className={`inline-block rounded-pill px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[st.tone]}`}>{st.label}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
