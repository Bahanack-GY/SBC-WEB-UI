import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { CustomerSupportIcon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { SupportError, dateTimeFr, money, supportErrorText, unwrap, withdrawalRef, withdrawalStatus, type Withdrawal } from './support';
import { Card, ErrorNote, HelpPage, Pill, Skeletons } from './ui';
import { secondaryBtn } from './styles';

/** One withdrawal: what its status means and what the member can do. */
export default function HelpWithdrawal() {
    const { id = '' } = useParams();
    const q = useQuery({
        queryKey: ['support', 'withdrawal', id],
        queryFn: async () => unwrap<Withdrawal>(await sbcApiService.supportWithdrawal(id)),
    });
    const w = q.data;
    const s = w ? withdrawalStatus(w) : null;

    return (
        <HelpPage title="Mon retrait" back="/aide/retraits">
            {q.isLoading ? (
                <Skeletons count={1} height="h-40" />
            ) : q.isError || !w || !s ? (
                <ErrorNote onRetry={() => q.refetch()}>
                    {q.error instanceof SupportError && q.error.status === 404 ? 'Ce retrait est introuvable sur votre compte.' : supportErrorText(q.error)}
                </ErrorNote>
            ) : (
                <>
                    <Card>
                        <div className="flex items-start gap-2">
                            <p className="flex-1 text-xl font-bold text-ink">{money(w.amount, w.currency) || 'Retrait'}</p>
                            <Pill tone={s.tone}>{s.label}</Pill>
                        </div>
                        <p className="mt-3 text-sm text-ink-2">{s.text}</p>
                        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                            <dt className="text-ink-3">Demandé le</dt><dd className="text-ink">{dateTimeFr(w.createdAt) || '—'}</dd>
                            {w.updatedAt && <><dt className="text-ink-3">Mis à jour le</dt><dd className="text-ink">{dateTimeFr(w.updatedAt)}</dd></>}
                            {w.method && <><dt className="text-ink-3">Moyen</dt><dd className="text-ink">{w.method}</dd></>}
                            <dt className="text-ink-3">Référence</dt><dd className="text-ink break-all">{withdrawalRef(w)}</dd>
                        </dl>
                    </Card>
                    <Link to={`/aide/demandes/nouvelle?categorie=retrait&retrait=${encodeURIComponent(withdrawalRef(w))}`} className={secondaryBtn}>
                        <HugeiconsIcon icon={CustomerSupportIcon} size={18} /> Écrire à un agent à propos de ce retrait
                    </Link>
                </>
            )}
        </HelpPage>
    );
}
