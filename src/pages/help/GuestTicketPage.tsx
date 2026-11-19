import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import HelpTicket from './HelpTicket';
import { HelpPage } from './ui';
import { guestKeyFor, rememberGuestRequest } from './guest';
import { primaryBtn } from './styles';

/**
 * `/signaler-un-probleme/suivi/:id`: the chat of a request sent without an account.
 * The key comes from this device, or from the link in the agent's email (`#k=…`,
 * which never reaches a server); it is then kept here and removed from the address.
 */
export default function GuestTicketPage() {
    const { id = '' } = useParams();
    const key = useMemo(() => {
        const fromLink = new URLSearchParams(window.location.hash.slice(1)).get('k');
        if (fromLink) {
            rememberGuestRequest({ id, number: '', key: fromLink });
            window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
            return fromLink;
        }
        return guestKeyFor(id);
    }, [id]);

    if (!key) {
        return (
            <HelpPage title="Ma demande" back="/connexion">
                <div className="rounded-card border border-border bg-surface p-4 text-sm text-ink-2">
                    <p>Pour ouvrir cette conversation, utilisez le lien reçu par email (dans la réponse de l’agent), ou ouvrez-la depuis le téléphone qui a envoyé la demande.</p>
                    <Link to="/signaler-un-probleme" className={`${primaryBtn} mt-4`}>Envoyer une nouvelle demande</Link>
                </div>
            </HelpPage>
        );
    }
    return <HelpTicket guestKey={key} />;
}
