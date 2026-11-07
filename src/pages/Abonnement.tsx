import { HugeiconsIcon } from '@hugeicons/react';
import {
    ArrowRight01Icon,
    Bitcoin01Icon,
    CheckmarkCircle02Icon,
    Crown02Icon,
    LockIcon,
    SmartPhone01Icon,
    Tick02Icon,
    WhatsappIcon,
} from '@hugeicons/core-free-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { redirectTo } from '../utils/redirect';
import { findAnyCountry } from '../utils/countriesData';
import type { AddonOffer, PackId, PackOffer, PaymentMethod, PurchasablePlan, SubscriptionOffers } from '../types/api';
import ProtectedRoute from '../components/common/ProtectedRoute';
import TourButton from '../components/common/TourButton';
import NegativeBalanceNotification from '../components/NegativeBalanceNotification';
import { useAuth } from '../contexts/AuthContext';
import { cn, fcfa } from '../lib/utils';

/** "2 150 FCFA" or "4,80 $". */
const money = (n: number, currency: string) =>
    currency === 'USD'
        ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
        : fcfa(n);

/**
 * Mobile Money where the member's country has it, crypto elsewhere. An unknown
 * country keeps Mobile Money: most members are in Mobile Money countries.
 */
const defaultPaymentMethod = (country?: string | null): PaymentMethod => {
    if (!country) return 'traditional';
    return findAnyCountry(country)?.supportsMomo ? 'traditional' : 'crypto';
};

const PACK_CLASS: Record<PackId, string> = { CLASSIQUE: 'classic-plan', CIBLE: 'premium-plan', WINNER: 'winner-plan' };
const PACK_BADGE: Partial<Record<PackId, { label: string; className: string }>> = {
    CIBLE: { label: 'Le plus rentable', className: 'bg-primary-soft text-primary' },
    WINNER: { label: 'Le plus complet', className: 'bg-accent-soft text-ink' },
};
const MAX_FEATURES = 5;

const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const btn = 'w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 disabled:cursor-not-allowed';
const REDIRECTING = 'Redirection vers le paiement…';
const START_FAILED = 'Le paiement n\'a pas pu démarrer. Réessayez dans un instant.';

function Features({ items, muted }: { items: string[]; muted?: boolean }) {
    if (items.length === 0) return null;
    return (
        <ul className="subscription-features flex flex-col gap-1.5">
            {items.slice(0, MAX_FEATURES).map((feature) => (
                <li key={feature} className={cn('flex items-start gap-2 text-sm', muted ? 'text-ink-2' : 'text-ink')}>
                    <HugeiconsIcon icon={Tick02Icon} size={16} className={cn('mt-0.5 shrink-0', muted ? 'text-ink-3' : 'text-primary')} />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
    );
}

function PackCard({ pack, winner, busy, locked, onBuy }: {
    pack: PackOffer;
    winner: SubscriptionOffers['winner'];
    busy: boolean;
    locked: boolean;
    onBuy: (plan: PurchasablePlan) => void;
}) {
    const owned = pack.state === 'owned';
    const included = pack.state === 'included';
    const forSale = pack.state === 'available' || pack.state === 'upgrade';
    const badge = forSale ? PACK_BADGE[pack.id] : undefined;
    const pay = pack.payPrice ?? pack.price;

    return (
        <article
            aria-labelledby={`pack-${pack.id}`}
            aria-current={owned ? 'true' : undefined}
            className={cn(
                'bg-surface border rounded-card p-4 flex flex-col gap-3',
                PACK_CLASS[pack.id],
                // A coloured border is state, which the flat rules allow.
                owned ? 'border-success' : 'border-border',
                included && 'bg-surface-2',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    {pack.id === 'WINNER' && <HugeiconsIcon icon={Crown02Icon} size={18} className="text-accent shrink-0" />}
                    <h3 id={`pack-${pack.id}`} className={cn('text-base font-bold', included ? 'text-ink-2' : 'text-ink')}>{pack.name}</h3>
                    {badge && (
                        <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', badge.className)}>{badge.label}</span>
                    )}
                </div>
                <div className="shrink-0 text-right">
                    <p className={cn('text-lg font-bold tabular-nums leading-tight', included ? 'text-ink-2' : 'text-ink')}>
                        {money(pack.price, pack.currency)}
                    </p>
                    <p className="text-[11px] text-ink-2">{owned ? 'payé · à vie' : 'une fois · à vie'}</p>
                </div>
            </div>

            {pack.state === 'upgrade' && pack.payPrice !== null && (
                <p className="rounded-tile bg-success-soft px-3 py-2 text-sm text-ink">
                    Vous payez seulement <strong className="font-semibold text-success">{money(pack.payPrice, pack.currency)}</strong>, la différence avec votre pack.
                </p>
            )}

            <Features items={pack.features} muted={included} />

            {forSale && (
                <button
                    type="button"
                    onClick={() => onBuy(pack.id)}
                    disabled={locked}
                    className={cn(btn, 'bg-primary text-white hover:bg-primary-hover')}
                >
                    {busy
                        ? REDIRECTING
                        : `${pack.state === 'upgrade' ? 'Passer au' : 'Choisir le'} ${pack.name} · ${money(pay, pack.currency)}`}
                </button>
            )}

            {owned && (
                <div className="flex flex-col gap-2">
                    <p className="flex items-center justify-center gap-1.5 rounded-xl bg-success-soft py-3 text-sm font-semibold text-success">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                        Votre pack actuel
                    </p>
                    {pack.id === 'WINNER' && winner.vipGroupLink && (
                        <a
                            href={winner.vipGroupLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(btn, 'bg-surface text-ink border border-border hover:bg-surface-2')}
                        >
                            <HugeiconsIcon icon={WhatsappIcon} size={16} className="text-whatsapp" />
                            Rejoindre le groupe VIP
                        </a>
                    )}
                    {pack.id === 'WINNER' && (
                        <p className="text-sm text-ink-2 text-pretty">
                            Numéros WhatsApp en plus : {winner.extraNumberSlots} emplacement{winner.extraNumberSlots > 1 ? 's' : ''}.{' '}
                            <Link to="/numeros-supplementaires" className="font-semibold text-primary">Gérer mes numéros</Link>
                        </p>
                    )}
                    <Link to="/ads-network" className="inline-flex items-center justify-center gap-1 py-1 text-sm font-semibold text-primary">
                        Commencer à gagner
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </Link>
                </div>
            )}

            {included && (
                <p className="flex items-center justify-center gap-1.5 rounded-xl bg-surface py-3 text-sm font-medium text-ink-2 border border-border">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-success" />
                    Inclus dans votre pack
                </p>
            )}
        </article>
    );
}

/** One option (Mise en avant), or two periods of the same one (Espace Pro monthly / yearly). */
function AddonCard({ anchor, options, purchasing, locked, onBuy }: {
    anchor: string;
    options: AddonOffer[];
    purchasing: PurchasablePlan | null;
    locked: boolean;
    onBuy: (plan: PurchasablePlan) => void;
}) {
    const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
    const selected = options.find((o) => o.period === period) ?? options[0];
    const title = selected.name.replace(/\s*\((mensuel|annuel)\)\s*$/i, '');
    const activeUntil = selected.activeUntil ?? options.find((o) => o.activeUntil)?.activeUntil ?? null;
    const discounted = selected.listPrice !== null && selected.listPrice > selected.price;

    return (
        <article
            id={anchor}
            aria-labelledby={`${anchor}-title`}
            className={cn('scroll-mt-20 bg-surface border rounded-card p-4 flex flex-col gap-3', activeUntil ? 'border-success' : 'border-border')}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 id={`${anchor}-title`} className="text-base font-bold text-ink">{title}</h3>
                    {activeUntil && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-pill bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                            Actif jusqu'au {longDate(activeUntil)}
                        </p>
                    )}
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-ink tabular-nums leading-tight">{money(selected.price, selected.currency)}</p>
                    <p className="text-[11px] text-ink-2">{selected.period === 'yearly' ? 'par an' : 'par mois'}</p>
                    {discounted && (
                        <p className="text-[11px] text-ink-2">
                            au lieu de <span className="line-through">{money(selected.listPrice!, selected.currency)}</span>
                        </p>
                    )}
                </div>
            </div>

            {options.length > 1 && (
                <div role="group" aria-label="Durée" className="grid grid-cols-2 gap-1 rounded-tile bg-surface-2 p-1">
                    {(['monthly', 'yearly'] as const).filter((p) => options.some((o) => o.period === p)).map((p) => (
                        <button
                            key={p}
                            type="button"
                            aria-pressed={period === p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                'rounded-lg py-2 text-sm font-semibold transition-colors',
                                period === p ? 'bg-surface text-ink border border-border' : 'text-ink-2',
                            )}
                        >
                            {p === 'monthly' ? 'Mensuel' : 'Annuel'}
                        </button>
                    ))}
                </div>
            )}

            <Features items={selected.features} />

            {!selected.canBuy && selected.reason && (
                <p className="flex items-start gap-1.5 text-sm text-ink-2">
                    <HugeiconsIcon icon={LockIcon} size={15} className="mt-0.5 shrink-0 text-ink-3" />
                    {selected.reason}
                </p>
            )}

            <button
                type="button"
                onClick={() => onBuy(selected.id)}
                disabled={locked || !selected.canBuy}
                className={cn(
                    btn,
                    selected.canBuy ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-surface-2 text-ink-2',
                )}
            >
                {purchasing === selected.id
                    ? REDIRECTING
                    : `${activeUntil ? 'Prolonger' : 'Activer'} · ${money(selected.price, selected.currency)}`}
            </button>
        </article>
    );
}

function Abonnement() {
    const reduceMotion = useReducedMotion();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { user, refreshUser } = useAuth();
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => defaultPaymentMethod(user?.country));
    const [purchasing, setPurchasing] = useState<PurchasablePlan | null>(null);
    const [showNegativeBalanceModal, setShowNegativeBalanceModal] = useState(false);
    const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    const balance = user?.balance || 0;

    const offersQuery = useQuery<SubscriptionOffers>({
        queryKey: ['subscription-offers', paymentMethod],
        queryFn: async () => handleApiResponse(await sbcApiService.getSubscriptionOffers(paymentMethod)),
        staleTime: 60 * 1000,
        // Switching FCFA <-> USD keeps the cards on screen while the new prices load.
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: false, // the return-to-page handler below does it, with the status
        retry: 1,
    });
    const offers = offersQuery.data;
    const { refetch: refetchOffers } = offersQuery;
    // Placeholder data carries the other currency: nothing can be bought until the right prices are in.
    const pricesPending = offersQuery.isPlaceholderData;

    useEffect(() => {
        if (balance < 0) setShowNegativeBalanceModal(true);
    }, [balance]);

    // The member comes back from the payment page (tab switch, back button,
    // bfcache restore): fetch the packs and the paywall status again, so a pack
    // that was just paid shows at once.
    const onReturn = useCallback(() => {
        refetchOffers();
        queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
        refreshUser?.().catch(() => undefined);
    }, [refetchOffers, queryClient, refreshUser]);
    // refreshUser changes identity on every AuthProvider render; the listeners
    // below read the latest handler instead of re-subscribing each time.
    const onReturnRef = useRef(onReturn);
    onReturnRef.current = onReturn;

    useEffect(() => {
        let last = 0;
        const handle = () => {
            if (document.visibilityState === 'hidden') return;
            // focus and visibilitychange arrive together; one refetch is enough.
            if (Date.now() - last < 1500) return;
            last = Date.now();
            onReturnRef.current();
        };
        const onPageShow = (e: PageTransitionEvent) => {
            // Restored from the back/forward cache with "Redirection…" still on the button.
            if (e.persisted) setPurchasing(null);
            handle();
        };
        window.addEventListener('focus', handle);
        window.addEventListener('pageshow', onPageShow);
        document.addEventListener('visibilitychange', handle);
        return () => {
            window.removeEventListener('focus', handle);
            window.removeEventListener('pageshow', onPageShow);
            document.removeEventListener('visibilitychange', handle);
        };
    }, []);

    // /abonnement#pro (the Contacts banner) opens on the Espace Pro card.
    const hasOffers = !!offers;
    useEffect(() => {
        if (!hasOffers || !location.hash) return;
        const target = document.getElementById(location.hash.slice(1));
        target?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, [hasOffers, location.hash, reduceMotion]);

    const handlePurchase = async (planType: PurchasablePlan) => {
        setPurchasing(planType);
        try {
            const response = await sbcApiService.purchaseSubscription(planType, paymentMethod);
            if (!response.isSuccessByStatusCode) {
                // 409 (already owned) and 403 (a pack first) carry a French message for the member.
                const serverMessage = [403, 409].includes(response.statusCode) ? response.body?.message : null;
                const message = serverMessage
                    || (response.statusCode === -1
                        ? 'Connexion impossible. Vérifiez votre connexion internet, puis réessayez.'
                        : START_FAILED);
                setErrorModal({ show: true, message });
                setPurchasing(null);
                return;
            }
            const data = handleApiResponse(response);
            const sessionId = data?.paymentDetails?.sessionId;
            if (sessionId) {
                // Same tab: the member comes back here, and the page notices the payment.
                redirectTo(sbcApiService.generatePaymentUrl(sessionId));
                return; // keep "Redirection vers le paiement…" while the page changes
            }
            setPurchasing(null);
            onReturn();
        } catch {
            setErrorModal({ show: true, message: START_FAILED });
            setPurchasing(null);
        }
    };

    const packs = offers?.packs ?? [];
    const ownedPack = packs.find((p) => p.state === 'owned');
    const proOptions = (offers?.addons ?? []).filter((a) => a.type === 'PRO');
    const highlightOptions = (offers?.addons ?? []).filter((a) => a.type === 'MISE_EN_AVANT');
    const locked = purchasing !== null || pricesPending;

    const enter = (i: number) => reduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
        : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] as const, delay: i * 0.05 } };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-bg px-4 pt-3 pb-24">
                <div className="mx-auto w-full max-w-lg">
                    <div className="flex items-center mb-4">
                        <BackButton />
                        <h1 className="text-xl font-semibold text-ink text-center w-full">Abonnement</h1>
                    </div>

                    <header className="subscription-header mb-4 flex flex-col gap-3">
                        <div>
                            <h2 className="text-2xl font-bold text-ink leading-tight text-balance">Choisissez votre pack</h2>
                            <p className="mt-1.5 text-sm text-ink-2 text-pretty">
                                Vous payez une seule fois, il est à vie.
                            </p>
                            {ownedPack && (
                                <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-success">
                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="shrink-0" />
                                    Votre pack actuel : {ownedPack.name}
                                </p>
                            )}
                        </div>

                        <div role="group" aria-label="Moyen de paiement" className="grid grid-cols-2 gap-1 rounded-tile border border-border bg-surface p-1">
                            {([
                                { id: 'traditional', label: 'Mobile Money (FCFA)', icon: SmartPhone01Icon },
                                { id: 'crypto', label: 'Crypto (USD)', icon: Bitcoin01Icon },
                            ] as const).map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    aria-pressed={paymentMethod === m.id}
                                    disabled={purchasing !== null}
                                    onClick={() => setPaymentMethod(m.id)}
                                    className={cn(
                                        'inline-flex items-center justify-center gap-1.5 rounded-lg px-1 py-2 text-[13px] font-semibold transition-colors',
                                        paymentMethod === m.id ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-2',
                                    )}
                                >
                                    <HugeiconsIcon icon={m.icon} size={16} className="shrink-0" />
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </header>

                    {offersQuery.isLoading ? (
                        <div className="flex flex-col gap-3" aria-busy="true">
                            <Skeleton height="h-56" rounded="rounded-card" />
                            <Skeleton height="h-56" rounded="rounded-card" />
                            <Skeleton height="h-56" rounded="rounded-card" />
                        </div>
                    ) : offersQuery.isError && !offers ? (
                        <div className="flex flex-col items-center text-center gap-3 bg-surface border border-border rounded-card px-4 py-10">
                            <p className="text-base font-semibold text-ink">Impossible d'afficher les packs</p>
                            <p className="text-sm text-ink-2 max-w-xs">Vérifiez votre connexion, puis réessayez.</p>
                            <button onClick={() => refetchOffers()} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
                                Réessayer
                            </button>
                        </div>
                    ) : packs.length === 0 ? (
                        <p className="bg-surface border border-border rounded-card px-4 py-10 text-center text-sm text-ink-2">
                            Aucun pack n'est disponible pour le moment. Revenez un peu plus tard.
                        </p>
                    ) : (
                        <div className={cn('flex flex-col gap-3 transition-opacity', pricesPending && 'opacity-60')}>
                            {packs.map((pack, index) => (
                                <motion.div key={pack.id} {...enter(index)}>
                                    <PackCard
                                        pack={pack}
                                        winner={offers!.winner}
                                        busy={purchasing === pack.id}
                                        locked={locked}
                                        onBuy={handlePurchase}
                                    />
                                </motion.div>
                            ))}

                            {(proOptions.length > 0 || highlightOptions.length > 0) && (
                                <section aria-labelledby="options-title" className="subscription-options mt-4 flex flex-col gap-3">
                                    <div>
                                        <h2 id="options-title" className="text-lg font-bold text-ink">Options pour les membres</h2>
                                        <p className="text-sm text-ink-2">Avec un pack, ajoutez ce qu'il vous faut, au mois ou à l'année.</p>
                                    </div>
                                    {proOptions.length > 0 && (
                                        <AddonCard anchor="pro" options={proOptions} purchasing={purchasing} locked={locked} onBuy={handlePurchase} />
                                    )}
                                    {highlightOptions.length > 0 && (
                                        <AddonCard anchor="mise-en-avant" options={highlightOptions} purchasing={purchasing} locked={locked} onBuy={handlePurchase} />
                                    )}
                                </section>
                            )}
                        </div>
                    )}
                </div>

                <TourButton />

                <NegativeBalanceNotification
                    isOpen={showNegativeBalanceModal}
                    onClose={() => setShowNegativeBalanceModal(false)}
                    userReferralCode={user?.referralCode || ''}
                    negativeBalance={Math.abs(balance)}
                />

                <AnimatePresence>
                    {errorModal.show && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setErrorModal({ show: false, message: '' })}
                        >
                            <motion.div
                                role="alertdialog"
                                aria-labelledby="abonnement-error-title"
                                aria-describedby="abonnement-error-message"
                                className="bg-surface rounded-card p-6 max-w-sm w-full border border-border text-center"
                                initial={{ scale: 0.96, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.96, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 id="abonnement-error-title" className="text-lg font-semibold text-ink mb-2">Le paiement n'a pas démarré</h3>
                                <p id="abonnement-error-message" className="text-sm text-ink-2 mb-6">{errorModal.message}</p>
                                <button
                                    onClick={() => setErrorModal({ show: false, message: '' })}
                                    className="w-full rounded-xl bg-primary py-2.5 px-4 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
                                >
                                    Fermer
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}

export default Abonnement;
