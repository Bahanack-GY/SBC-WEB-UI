import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { sbcApiService } from '../../services/SBCApiService';
import { asList, dateTimeFr, money, supportErrorText, unwrap, withdrawalRef, withdrawalStatus, type Withdrawal } from './support';
import { ErrorNote, HelpPage, Pill, Skeletons } from './ui';

/** « Mon retrait est bloqué »: each withdrawal with its real status, in plain French. */
export default function HelpWithdrawals() {
    const list = useQuery({
        queryKey: ['support', 'withdrawals'],
        queryFn: async () => asList<Withdrawal>(unwrap(await sbcApiService.supportWithdrawals()), 'withdrawals'),
    });

    return (
        <HelpPage title="Mes retraits">
            <p className="text-sm text-ink-2">
                Le statut affiché ici est celui de l’opérateur de paiement, vérifié par SBC. Touchez un retrait pour
                savoir ce qu’il se passe et ce que vous pouvez faire.
            </p>
            {list.isLoading ? (
                <Skeletons count={3} height="h-20" />
            ) : list.isError ? (
                <ErrorNote onRetry={() => list.refetch()}>{supportErrorText(list.error)}</ErrorNote>
            ) : (list.data ?? []).length === 0 ? (
                <div className="pt-10 text-center">
                    <span className="mx-auto size-16 grid place-items-center rounded-pill bg-surface-2 text-ink-3">
                        <HugeiconsIcon icon={Wallet01Icon} size={30} />
                    </span>
                    <p className="mt-3 font-semibold text-ink">Aucun retrait récent</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {(list.data ?? []).map((w) => {
                        const s = withdrawalStatus(w);
                        return (
                            <li key={withdrawalRef(w)}>
                                <Link to={`/aide/retraits/${encodeURIComponent(withdrawalRef(w))}`}
                                    className="block p-3 rounded-card bg-surface border border-border">
                                    <span className="flex items-start gap-2">
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-semibold text-ink">{money(w.amount, w.currency) || 'Retrait'}</span>
                                            <span className="block text-xs text-ink-3">{[dateTimeFr(w.createdAt), w.method].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        <Pill tone={s.tone}>{s.label}</Pill>
                                        <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3 shrink-0" />
                                    </span>
                                    <span className="block mt-2 text-xs text-ink-2 line-clamp-2">{s.text}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </HelpPage>
    );
}
