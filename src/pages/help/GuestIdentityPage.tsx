import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorNote, HelpPage, Skeletons } from './ui';
import { supportErrorText } from './support';
import { guestKeyFor } from './guest';
import { guestIdentityApi, PURPOSES } from './identity';
import { IdentityForm, IdentityStatusCard } from './IdentityForm';
import { primaryBtn } from './styles';

/**
 * `/signaler-un-probleme/identite/:id`: someone who lost access (no account to sign in with) sends
 * an ID + selfie on their request, with the request's key kept on this device.
 */
export default function GuestIdentityPage() {
    const { id = '' } = useParams();
    const qc = useQueryClient();
    const [retry, setRetry] = useState(false);
    const hasKey = !!guestKeyFor(id);
    const latest = useQuery({ queryKey: ['support', 'guest-identity', id], queryFn: () => guestIdentityApi.latest(id), enabled: hasKey });
    const back = `/signaler-un-probleme/suivi/${id}`;

    if (!hasKey) {
        return (
            <HelpPage title="Vérifier mon identité" back="/connexion">
                <div className="rounded-card border border-border bg-surface p-4 text-sm text-ink-2">
                    <p>Ouvrez d’abord votre demande avec le lien reçu par email, ou depuis le téléphone qui l’a envoyée.</p>
                    <Link to="/signaler-un-probleme" className={`${primaryBtn} mt-4`}>Envoyer une nouvelle demande</Link>
                </div>
            </HelpPage>
        );
    }
    const v = latest.data;
    return (
        <HelpPage title="Vérifier mon identité" back={back}>
            {latest.isLoading ? <Skeletons count={2} /> : latest.isError ? (
                <ErrorNote onRetry={() => latest.refetch()}>{supportErrorText(latest.error)}</ErrorNote>
            ) : !v || (v.status === 'refused' && retry) ? (
                <IdentityForm
                    why={PURPOSES.lost_access.why}
                    send={async (images) => {
                        const r = await guestIdentityApi.submit(id, images);
                        qc.setQueryData(['support', 'guest-identity', id], r);
                        setRetry(false);
                    }}
                />
            ) : (
                <IdentityStatusCard status={v} onRetry={() => setRetry(true)}
                    ticketLink={<Link to={back} className="text-sm font-semibold text-primary underline">Revenir à ma demande</Link>} />
            )}
        </HelpPage>
    );
}
