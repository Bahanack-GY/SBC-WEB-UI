import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { AlertCircleIcon, CheckmarkCircle02Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { animationApi } from '../../services/animationApi';
import { useAuth } from '../../contexts/AuthContext';
import BackButton from '../../components/common/BackButton';
import { errorMessage } from '../../lib/animation';

const errText = (res: any) => (res?.statusCode <= 0 ? 'Connexion impossible. Vérifiez votre réseau et réessayez.' : errorMessage(res));

const ROLE_LABEL: Record<string, string> = {
    MANAGER: 'gestionnaire',
    MODERATOR: 'modérateur',
    STAFF: 'membre du staff',
};

export default function AcceptInvite() {
    const { token = '' } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, loading: authLoading } = useAuth();

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<any>(null);

    if (!authLoading && !isAuthenticated) return <Navigate to="/connexion" state={{ from: location }} replace />;

    const accept = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await animationApi.acceptInvite(token);
            if (res.apiReportedSuccess) setDone(res.body.data);
            else setError(res.statusCode === 404 ? 'Cette invitation est invalide, a expiré ou a déjà été utilisée.' : errText(res));
        } catch (e: any) {
            setError(e?.message || 'Erreur réseau.');
        } finally {
            setBusy(false);
        }
    };

    const target = done?.kind === 'JURY' ? `/events/jury/${done.challengeId}` : done?.eventId ? `/events/organizer/${done.eventId}/animation` : null;

    return (
        <div className="min-h-screen bg-bg">
            <div className="px-4 pt-3 pb-2 flex items-center gap-3">
                <BackButton onClick={() => navigate('/events')} />
                <h1 className="text-xl font-bold text-ink">Invitation</h1>
            </div>
            <div className="px-4 pt-4 pb-8">
                {done ? (
                    <section className="bg-success-soft rounded-card p-6 text-center flex flex-col items-center gap-2">
                        <span className="grid size-12 place-items-center rounded-pill bg-success text-white">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} />
                        </span>
                        <p className="text-base font-bold text-ink">Invitation acceptée</p>
                        <p className="text-sm text-ink-2 text-pretty">
                            {done.kind === 'JURY'
                                ? 'Vous faites désormais partie du jury de ce défi.'
                                : `Vous rejoignez l’équipe de l’événement en tant que ${ROLE_LABEL[done.role] ?? 'membre'}.`}
                        </p>
                        {target && (
                            <button onClick={() => navigate(target, { replace: true })} className="mt-2 rounded-pill bg-primary px-5 py-2.5 text-sm font-semibold text-white">
                                {done.kind === 'JURY' ? 'Accéder à l’espace jury' : 'Ouvrir l’espace animation'}
                            </button>
                        )}
                    </section>
                ) : (
                    <section className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-3">
                        <span className="grid size-12 place-items-center rounded-pill bg-primary-soft text-primary">
                            <HugeiconsIcon icon={UserGroupIcon} size={24} />
                        </span>
                        <p className="text-base font-bold text-ink">Vous avez été invité</p>
                        <p className="text-sm text-ink-2 text-pretty">
                            Un organisateur SBC Event vous invite à rejoindre son équipe ou le jury d’un défi. Acceptez pour accéder à votre espace.
                        </p>
                        {error && (
                            <p role="alert" className="w-full bg-danger-soft rounded-card p-3 text-sm text-danger flex items-start gap-2 text-left">
                                <HugeiconsIcon icon={AlertCircleIcon} size={16} className="shrink-0 mt-px" />
                                {error}
                            </p>
                        )}
                        <button
                            onClick={accept}
                            disabled={busy || authLoading || !token}
                            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
                        >
                            {busy ? 'Acceptation…' : 'Accepter l’invitation'}
                        </button>
                        <button onClick={() => navigate('/events')} className="text-sm text-ink-2">Plus tard</button>
                    </section>
                )}
            </div>
        </div>
    );
}
