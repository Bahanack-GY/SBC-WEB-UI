import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, ArrowDown01Icon, Delete02Icon, UserMultiple02Icon } from '@hugeicons/core-free-icons';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Skeleton from '../components/common/Skeleton';
import { ConfirmSheet } from '../components/relance/ui/ConfirmSheet';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import type { ExtraNumber, ExtraNumbers as ExtraNumbersData } from '../types/api';
import { handleApiResponse } from '../utils/apiHelpers';
import { allCountries, countryForPhone, DEFAULT_DIAL_CODE, dialCodeOf, findAnyCountry, toInternationalDigits, worldCountryCodes, type DialCode } from '../utils/countriesData';
import { defaultPaymentMethod } from '../utils/paymentMethod';
import { redirectTo } from '../utils/redirect';
import { cn, fcfa } from '../lib/utils';

const QUERY_KEY = ['extra-numbers'];
const FALLBACK_ERROR = 'Cela n\'a pas marché. Réessayez dans un instant.';

/** "🇨🇲 +237 677 123 456" */
const displayNumber = (digits: string) => {
    const country = countryForPhone(`+${digits}`);
    if (!country) return `+${digits}`;
    const national = digits.slice(country.phoneCode.length - 1).replace(/(\d{3})(?=\d)/g, '$1 ');
    return `${country.flag} ${country.phoneCode} ${national}`;
};

const errorText = (err: unknown) => (err instanceof Error && err.message ? err.message : FALLBACK_ERROR);

function ExtraNumbers() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [dial, setDial] = useState<DialCode>(() => {
        const home = findAnyCountry(user?.country);
        return home ? dialCodeOf(home) : DEFAULT_DIAL_CODE;
    });
    const [number, setNumber] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [toRemove, setToRemove] = useState<ExtraNumber | null>(null);
    const [redirecting, setRedirecting] = useState(false);

    const query = useQuery<ExtraNumbersData>({
        queryKey: QUERY_KEY,
        queryFn: async () => handleApiResponse(await sbcApiService.getExtraNumbers()),
        // Back from the payment page for a slot: show it.
        refetchOnWindowFocus: 'always',
        retry: 1,
    });
    const data = query.data;
    const used = data?.numbers.length ?? 0;
    const free = Math.max(0, (data?.slots ?? 0) - used);

    const add = useMutation({
        mutationFn: async (digits: string) => handleApiResponse(await sbcApiService.addExtraNumber(digits)) as ExtraNumbersData,
        onSuccess: (next) => {
            queryClient.setQueryData(QUERY_KEY, next);
            setNumber('');
            setFormError(null);
        },
        onError: (err) => setFormError(errorText(err)),
    });

    const remove = useMutation({
        mutationFn: async (id: string) => handleApiResponse(await sbcApiService.deleteExtraNumber(id)) as ExtraNumbersData,
        onSuccess: (next) => {
            queryClient.setQueryData(QUERY_KEY, next);
            setToRemove(null);
        },
        onError: (err) => {
            setToRemove(null);
            setPageError(errorText(err));
        },
    });

    const buySlot = async () => {
        setPageError(null);
        setRedirecting(true);
        try {
            const result = handleApiResponse(await sbcApiService.purchaseExtraNumberSlot(defaultPaymentMethod(user?.country)));
            const sessionId = result?.sessionId ?? result?.paymentDetails?.sessionId;
            if (!sessionId) throw new Error(FALLBACK_ERROR);
            // Same tab: coming back here refetches the slots.
            redirectTo(sbcApiService.generatePaymentUrl(sessionId));
        } catch (err) {
            setPageError(errorText(err));
            setRedirecting(false);
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const parsed = toInternationalDigits(number, dial);
        if ('error' in parsed) {
            setFormError(parsed.error);
            return;
        }
        add.mutate(parsed.digits);
    };

    const preview = (() => {
        const parsed = number.trim() ? toInternationalDigits(number, dial) : null;
        return parsed && 'digits' in parsed ? `+${parsed.digits}` : null;
    })();
    const price = data?.pricePerSlot ?? 500;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-bg px-4 pt-3 pb-16">
                <div className="mx-auto w-full max-w-lg">
                    <div className="flex items-center mb-4">
                        <BackButton />
                        <h1 className="text-xl font-semibold text-ink text-center w-full">Numéros en plus</h1>
                    </div>

                    <p className="mb-4 flex items-start gap-2 text-sm text-ink-2 text-pretty">
                        <HugeiconsIcon icon={UserMultiple02Icon} size={18} className="mt-0.5 shrink-0 text-primary" />
                        Vos numéros en plus sont ajoutés au fichier de contacts SBC : plus de personnes les enregistrent, plus vos statuts sont vus.
                    </p>

                    {query.isLoading ? (
                        <div className="flex flex-col gap-3" aria-busy="true">
                            <Skeleton height="h-20" rounded="rounded-card" />
                            <Skeleton height="h-32" rounded="rounded-card" />
                        </div>
                    ) : query.isError || !data ? (
                        <div className="flex flex-col items-center text-center gap-3 bg-surface border border-border rounded-card px-4 py-10">
                            <p className="text-base font-semibold text-ink">Impossible d'afficher vos numéros</p>
                            <p className="text-sm text-ink-2 max-w-xs">Vérifiez votre connexion, puis réessayez.</p>
                            <button onClick={() => query.refetch()} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
                                Réessayer
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <section aria-labelledby="slots-title" className="bg-surface border border-border rounded-card p-4">
                                <div className="flex items-baseline justify-between gap-3">
                                    <h2 id="slots-title" className="text-base font-bold text-ink">Vos emplacements</h2>
                                    <p className="text-sm text-ink-2 tabular-nums" data-testid="slots-count">
                                        {used} sur {data.slots} utilisé{used > 1 ? 's' : ''}
                                    </p>
                                </div>

                                {data.numbers.length > 0 ? (
                                    <ul className="mt-3 flex flex-col divide-y divide-border">
                                        {data.numbers.map((n) => (
                                            <li key={n._id} className="flex items-center gap-3 py-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-ink tabular-nums">{displayNumber(n.number)}</p>
                                                    {n.addedAt && (
                                                        <p className="text-xs text-ink-3">
                                                            Ajouté le {new Date(n.addedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setToRemove(n)}
                                                    aria-label={`Retirer le +${n.number}`}
                                                    className="grid size-10 shrink-0 place-items-center rounded-pill text-danger hover:bg-danger-soft"
                                                >
                                                    <HugeiconsIcon icon={Delete02Icon} size={18} />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-sm text-ink-2">
                                        {data.slots > 0 ? 'Aucun numéro pour le moment.' : 'Vous n\'avez pas encore d\'emplacement.'}
                                    </p>
                                )}
                            </section>

                            {free > 0 ? (
                                <form onSubmit={submit} aria-labelledby="add-title" className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <h2 id="add-title" className="text-base font-bold text-ink">Ajouter un numéro</h2>
                                        <p className="text-xs text-ink-2">{free} emplacement{free > 1 ? 's' : ''} libre{free > 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* The native picker lists full country names; the field shows flag + code. */}
                                        <label className="relative shrink-0 inline-flex h-12 items-center gap-1 rounded-tile border border-border bg-surface px-3 text-[15px] font-medium text-ink">
                                            <span aria-hidden>{dial.label}</span>
                                            <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="text-ink-3" aria-hidden />
                                            <select
                                                aria-label="Indicatif du pays"
                                                value={dial.value}
                                                onChange={(e) => {
                                                    setDial(worldCountryCodes.find((c) => c.value === e.target.value) ?? DEFAULT_DIAL_CODE);
                                                    setFormError(null);
                                                }}
                                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                            >
                                                {allCountries.map((c) => (
                                                    <option key={c.value} value={c.value}>{`${c.flag} ${c.value} ${c.phoneCode}`}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel-national"
                                            aria-label="Numéro WhatsApp"
                                            aria-invalid={formError ? true : undefined}
                                            value={number}
                                            onChange={(e) => { setNumber(e.target.value); setFormError(null); }}
                                            placeholder="Ex. 677123456"
                                            className={cn(
                                                'min-w-0 flex-1 h-12 rounded-tile border bg-surface px-4 text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary',
                                                formError ? 'border-danger' : 'border-border',
                                            )}
                                        />
                                    </div>
                                    {formError ? (
                                        <p role="alert" className="text-sm text-danger">{formError}</p>
                                    ) : preview ? (
                                        <p className="text-xs text-ink-2">Numéro ajouté : <strong className="font-semibold text-ink tabular-nums">{preview}</strong></p>
                                    ) : null}
                                    <button
                                        type="submit"
                                        disabled={add.isPending || !number.trim()}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
                                    >
                                        <HugeiconsIcon icon={Add01Icon} size={18} />
                                        {add.isPending ? 'Ajout…' : 'Ajouter ce numéro'}
                                    </button>
                                </form>
                            ) : (
                                <p className="text-sm text-ink-2 text-pretty">
                                    {data.slots > 0
                                        ? 'Tous vos emplacements sont pris. Achetez-en un autre pour ajouter un numéro.'
                                        : 'Achetez un emplacement pour ajouter un numéro.'}
                                </p>
                            )}

                            {pageError && <p role="alert" className="text-sm text-danger">{pageError}</p>}

                            <button
                                type="button"
                                onClick={buySlot}
                                disabled={redirecting}
                                className={cn(
                                    'inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-60',
                                    free > 0
                                        ? 'bg-surface text-primary border border-primary hover:bg-primary-soft'
                                        : 'bg-primary text-white hover:bg-primary-hover',
                                )}
                            >
                                {redirecting ? 'Redirection vers le paiement…' : `Acheter un emplacement · ${fcfa(price)}`}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmSheet
                open={toRemove !== null}
                title="Retirer ce numéro ?"
                message={toRemove
                    ? `Le ${displayNumber(toRemove.number)} sera retiré du fichier de contacts SBC. L'emplacement reste à vous : vous pourrez y mettre un autre numéro.`
                    : ''}
                confirmLabel="Retirer"
                danger
                busy={remove.isPending}
                onConfirm={() => toRemove && remove.mutate(toRemove._id)}
                onCancel={() => setToRemove(null)}
            />
        </ProtectedRoute>
    );
}

export default ExtraNumbers;
