import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../../services/SBCApiService';
import { isAuthenticated } from '../../utils/apiHelpers';
import { asList, isTicketClosed, unwrap, type Ticket } from './support';

/** The member's support requests: same cache as « Mes demandes » (`['support', 'tickets']`). */
export function useMyRequests(enabled = true) {
    const q = useQuery({
        queryKey: ['support', 'tickets'],
        queryFn: async () => asList<Ticket>(unwrap(await sbcApiService.supportTickets()), 'tickets'),
        enabled: enabled && isAuthenticated(),
        staleTime: 30_000,
        retry: false,
    });
    const list = q.data ?? [];
    return {
        count: list.length,
        open: list.filter((t) => !isTicketClosed(t.status)).length,
        /** Requests where the support is waiting for the member's reply (the badge, like unread chats). */
        waiting: list.filter((t) => t.status === 'en_attente_membre' || t.status === 'waiting_member').length,
    };
}
