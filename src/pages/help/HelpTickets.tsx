import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, ArrowRight01Icon, Ticket01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import {
    asList, categoryLabel, dateTimeFr, idOf, isTicketClosed, supportErrorText, ticketRef, ticketStatus, unwrap, type Ticket,
} from './support';
import { ErrorNote, HelpPage, Pill, Skeletons } from './ui';
import { primaryBtn } from './styles';

/** « Mes demandes »: the member's tickets, open ones first. */
export default function HelpTickets() {
    const list = useQuery({
        queryKey: ['support', 'tickets'],
        queryFn: async () => asList<Ticket>(unwrap(await sbcApiService.supportTickets()), 'tickets'),
        // A new agent reply changes a request's status here without a reload.
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
    });
    const tickets = [...(list.data ?? [])].sort((a, b) =>
        Number(isTicketClosed(a.status)) - Number(isTicketClosed(b.status))
        || String(b.lastMessageAt ?? b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.lastMessageAt ?? a.updatedAt ?? a.createdAt ?? '')));

    return (
        <HelpPage title="Mes demandes">
            <Link to="/aide/demandes/nouvelle" className={primaryBtn}>
                <HugeiconsIcon icon={Add01Icon} size={18} /> Nouvelle demande
            </Link>
            {list.isLoading ? (
                <Skeletons count={3} height="h-20" />
            ) : list.isError ? (
                <ErrorNote onRetry={() => list.refetch()}>{supportErrorText(list.error)}</ErrorNote>
            ) : tickets.length === 0 ? (
                <div className="pt-10 text-center">
                    <span className="mx-auto size-16 grid place-items-center rounded-pill bg-surface-2 text-ink-3">
                        <HugeiconsIcon icon={Ticket01Icon} size={30} />
                    </span>
                    <p className="mt-3 font-semibold text-ink">Aucune demande pour l’instant</p>
                    <p className="mt-1 text-sm text-ink-2">Vos échanges avec l’équipe SBC s’afficheront ici.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {tickets.map((t) => {
                        const s = ticketStatus(t.status);
                        return (
                            <li key={idOf(t)}>
                                <Link to={`/aide/demandes/${encodeURIComponent(idOf(t))}`} className="flex items-center gap-3 p-3 rounded-card bg-surface border border-border">
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-semibold text-ink truncate">{t.subject || categoryLabel(t.category)}</span>
                                        <span className="block text-xs text-ink-3">
                                            {[ticketRef(t), categoryLabel(t.category), dateTimeFr(t.lastMessageAt ?? t.updatedAt ?? t.createdAt)].filter(Boolean).join(' · ')}
                                        </span>
                                        <span className="mt-1 block"><Pill tone={s.tone}>{s.label}</Pill></span>
                                    </span>
                                    <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3 shrink-0" />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </HelpPage>
    );
}
