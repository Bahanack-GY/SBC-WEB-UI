import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyIcon, SmartPhone01Icon, UserIdVerificationIcon } from '@hugeicons/core-free-icons';
import { Card, ErrorNote, HelpPage, RowLink, Skeletons } from './ui';
import { supportErrorText } from './support';
import { identityApi, isPurpose, PURPOSES, type IdentityPurpose } from './identity';
import { IdentityForm, IdentityStatusCard } from './IdentityForm';
import { useState } from 'react';

const ICONS: Record<IdentityPurpose, typeof LockKeyIcon> = { fraud_hold: LockKeyIcon, authenticator_reset: SmartPhone01Icon, lost_access: UserIdVerificationIcon };

/**
 * `/aide/identite?motif=…&demande=…` (KYC level 3): the member sends the recto (+ verso) of an ID
 * and a selfie; a support agent checks them. Linked from a withdrawal held by the security check
 * (`fraud_hold`), the lost-phone note of the authenticator (`authenticator_reset`) and « Changer
 * mon email ou téléphone » (`lost_access`). Without a reason in the link, the member picks one.
 */
export default function HelpIdentity() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const motif = params.get('motif');
    const ticketId = params.get('demande') ?? undefined;
    const [retry, setRetry] = useState(false);
    const latest = useQuery({ queryKey: ['support', 'identity', 'latest'], queryFn: identityApi.latest });

    if (!isPurpose(motif)) {
        return (
            <HelpPage title="Vérifier mon identité">
                <p className="text-sm text-ink-2">Pourquoi voulez-vous faire vérifier votre identité ?</p>
                {(Object.keys(PURPOSES) as IdentityPurpose[]).map((p) => (
                    <RowLink key={p} to={`/aide/identite?motif=${p}${ticketId ? `&demande=${encodeURIComponent(ticketId)}` : ''}`} icon={ICONS[p]} title={PURPOSES[p].title} />
                ))}
            </HelpPage>
        );
    }

    const v = latest.data;
    const showForm = !v || (v.status === 'refused' && retry) || (v.status === 'approved' && v.purpose !== motif);
    return (
        <HelpPage title={PURPOSES[motif].title}>
            {latest.isLoading ? <Skeletons count={2} /> : latest.isError ? (
                <ErrorNote onRetry={() => latest.refetch()}>{supportErrorText(latest.error)}</ErrorNote>
            ) : showForm ? (
                <IdentityForm
                    why={PURPOSES[motif].why}
                    send={async (images) => {
                        const r = await identityApi.submit(motif, images, ticketId);
                        qc.setQueryData(['support', 'identity', 'latest'], r);
                        setRetry(false);
                        if (r.ticketId) navigate(`/aide/identite?motif=${motif}&demande=${encodeURIComponent(r.ticketId)}`, { replace: true });
                    }}
                />
            ) : v ? (
                <IdentityStatusCard
                    status={v}
                    onRetry={() => setRetry(true)}
                    ticketLink={v.ticketId ? <Link to={`/aide/demandes/${v.ticketId}`} className="text-sm font-semibold text-primary underline">Ouvrir ma demande</Link> : null}
                />
            ) : null}
            {!showForm && v?.status === 'pending' && (
                <Card>
                    <p className="text-xs text-ink-2">Une seule vérification à la fois : attendez la réponse de l’agent avant d’en envoyer une autre.</p>
                </Card>
            )}
        </HelpPage>
    );
}
