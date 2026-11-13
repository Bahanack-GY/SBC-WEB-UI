import { HugeiconsIcon } from '@hugeicons/react';
import {
    ArrowRight01Icon,
    ChartIncreaseIcon,
    CheckmarkCircle02Icon,
    Copy01Icon,
    Crown02Icon,
    LinkSquare02Icon,
    LockIcon,
    Megaphone01Icon,
    Share08Icon,
    Tick02Icon,
    WhatsappIcon,
} from '@hugeicons/core-free-icons';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import BackButton from '../components/common/BackButton';
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { redirectTo } from '../utils/redirect';
import { defaultPaymentMethod } from '../utils/paymentMethod';
import type { AddonOffer, PackId, PackOffer, PaymentMethod, PurchasablePlan, SubscriptionOffers } from '../types/api';
import ProtectedRoute from '../components/common/ProtectedRoute';
import TourButton from '../components/common/TourButton';
import NegativeBalanceNotification from '../components/NegativeBalanceNotification';
import { useAuth } from '../contexts/AuthContext';
import { cn, fcfa } from '../lib/utils';
import { ANNONCEUR_HOME } from '../utils/annonceur';

/** "2 150 FCFA" or "4,80 $". */
const money = (n: number, currency: string) =>
    currency === 'USD'
        ? `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
        : fcfa(n);

const PACK_CLASS: Record<PackId, string> = { CLASSIQUE: 'classic-plan', CIBLE: 'premium-plan', WINNER: 'winner-plan' };
const PACK_BADGE: Partial<Record<PackId, { label: string; className: string }>> = {
    CIBLE: { label: 'Le plus rentable', className: 'bg-primary-soft text-primary' },
    WINNER: { label: 'Le plus complet', className: 'bg-accent-soft text-ink' },
};
const MAX_FEATURES = 5;

// ponytail: marketing rates shown on the cards, by plan. advertising-service does
// NOT read the plan today — it pays every diffuseur DIFFUSEUR_RATES per campaign
// day (1 + 0.5 + 0.25 = 1.75 FCFA max per view). Make the backend plan-aware
// before promising CIBLE its 2 FCFA, and keep these two in sync.
// Winner holds everything in Ciblé, so it shows Ciblé's rate.
const VIEW_RATE: Record<PackId, number> = { CLASSIQUE: 1.75, CIBLE: 2, WINNER: 2 };
const EXAMPLE_VIEWS = 1000;

const TRAININGS = ['Trading', 'Achat en Chine', 'Art oratoire', 'Marketing digital', 'Bots WhatsApp'];

/**
 * The Classique and Ciblé cards say what they always said (Rufus, 2026-11-07:
 * the packs must not change). Winner has no copy here: its list comes from the
 * server, which carries the sales page and Mise en avant lines.
 */
const PLAN_COPY: Partial<Record<PackId, { title: string; pitch: string; features: string[]; extraTraining?: string }>> = {
    CLASSIQUE: {
        title: 'Pack Classique',
        pitch: 'Tout pour démarrer et gagner dès vos premiers statuts.',
        features: [
            'Possibilité de gagner entre 5 000 et 10 000 FCFA par jour',
            'Vente de produits digitaux',
            'Contacts WhatsApp ciblés par pays',
            'Accès à la marketplace SBC',
        ],
    },
    CIBLE: {
        title: 'Pack Ciblé',
        pitch: 'Le meilleur tarif par vue et un ciblage précis de vos contacts.',
        features: [
            'Ciblage avancé : pays, sexe, âge, profession, ville et centres d\'intérêt',
            'Commissions sur 3 niveaux',
        ],
        extraTraining: 'SBC IA Creator',
    },
};

/** The pitch under each pack name; Winner's is the line its old teaser card carried. */
const PITCH: Record<PackId, string> = {
    CLASSIQUE: 'Tout pour démarrer et gagner dès vos premiers statuts.',
    CIBLE: 'Le meilleur tarif par vue et un ciblage précis de vos contacts.',
    WINNER: 'Pour viser 1 million de FCFA en 3 mois.',
};
const SHORT_NAME: Record<PackId, string> = { CLASSIQUE: 'Classique', CIBLE: 'Ciblé', WINNER: 'Winner' };

const rate = (n: number) => n.toLocaleString('fr-FR');

const longDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const btn = 'w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 disabled:cursor-not-allowed';
const REDIRECTING = 'Redirection vers le paiement…';
const START_FAILED = 'Le paiement n\'a pas pu démarrer. Réessayez dans un instant.';

function Features({ items }: { items: string[] }) {
    if (items.length === 0) return null;
    return (
        <ul className="subscription-features flex flex-col gap-1.5">
            {items.slice(0, MAX_FEATURES).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-ink">
                    <HugeiconsIcon icon={Tick02Icon} size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
    );
}

/** "Gagnez avec vos statuts WhatsApp": the earning feature leads every pack. */
function EarningsBox({ viewRate }: { viewRate: number }) {
    return (
        <section className="rounded-tile bg-success-soft p-3" aria-label="Gains sur vos statuts WhatsApp">
            <div className="flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-pill bg-whatsapp text-white">
                    <HugeiconsIcon icon={WhatsappIcon} size={15} />
                </span>
                <span className="text-sm font-semibold text-ink">Gagnez avec vos statuts WhatsApp</span>
            </div>
            <p className="mt-2 flex items-baseline gap-1.5">
                <span className="text-sm text-ink-2">jusqu'à</span>
                <span className="text-3xl font-bold text-success tabular-nums leading-none">{rate(viewRate)}</span>
                <span className="text-sm font-semibold text-success">FCFA par vue</span>
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-2">
                <HugeiconsIcon icon={ChartIncreaseIcon} size={14} className="text-success shrink-0" />
                <span>
                    {EXAMPLE_VIEWS.toLocaleString('fr-FR')} vues sur vos statuts ={' '}
                    <strong className="font-semibold text-ink">{fcfa(Math.round(EXAMPLE_VIEWS * viewRate))}</strong> pour vous
                </span>
            </p>
        </section>
    );
}

/** The pack's list, ending with its trainings as chips. */
function PackFeatures({ packId, features }: { packId: PackId; features: string[] }) {
    // Winner includes Ciblé, so it carries Ciblé's extra training too.
    const extraTraining = PLAN_COPY[packId === 'WINNER' ? 'CIBLE' : packId]?.extraTraining;
    const trainings = extraTraining ? [...TRAININGS, extraTraining] : TRAININGS;
    return (
        <div className="subscription-features flex flex-col gap-2.5">
            {packId === 'CIBLE' && (
                <p className="text-xs font-semibold text-ink-2">Tout le Pack Classique, et en plus :</p>
            )}
            <ul className="flex flex-col gap-2">
                {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-ink">
                        <HugeiconsIcon icon={Tick02Icon} size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                    </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-ink">
                    <HugeiconsIcon icon={Tick02Icon} size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                        {trainings.length} formations incluses
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {trainings.map((t) => (
                                <span
                                    key={t}
                                    className={cn(
                                        'rounded-pill border px-2 py-0.5 text-[11px]',
                                        t === extraTraining
                                            ? 'border-primary bg-primary-soft font-semibold text-primary'
                                            : 'border-border bg-surface-2 text-ink-2',
                                    )}
                                >
                                    {t}
                                </span>
                            ))}
                        </span>
                    </span>
                </li>
            </ul>
        </div>
    );
}

function PackCard({ pack, winner, busy, locked, ownerName, onBuy }: {
    pack: PackOffer;
    winner: SubscriptionOffers['winner'];
    busy: boolean;
    locked: boolean;
    /** Name of the member's own pack, for "Inclus dans votre Pack …". */
    ownerName: string | null;
    onBuy: (plan: PurchasablePlan) => void;
}) {
    const navigate = useNavigate();
    const owned = pack.state === 'owned';
    const included = pack.state === 'included';
    const copy = PLAN_COPY[pack.id];
    const name = copy?.title ?? pack.name;
    // The old cards: Ciblé (and now Winner) framed in blue while they are for sale.
    const highlighted = pack.id !== 'CLASSIQUE' && !owned && !included;
    const unit = pack.currency === 'USD' ? 'USD' : 'FCFA';
    const amount = (n: number) => (pack.currency === 'USD'
        ? n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : n.toLocaleString('fr-FR'));

    return (
        <article
            aria-labelledby={`pack-${pack.id}`}
            aria-current={owned ? 'true' : undefined}
            className={cn(
                'relative bg-surface border rounded-card p-4 flex flex-col gap-4 overflow-hidden',
                PACK_CLASS[pack.id],
                // A coloured border is state, which the flat rules allow.
                owned ? 'border-success' : highlighted ? 'border-primary' : 'border-border',
            )}
        >
            {owned && (
                <p className="-mx-4 -mt-4 flex items-center gap-2 bg-success px-4 py-2 text-sm font-semibold text-white">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                    Votre pack actuel · actif à vie
                </p>
            )}

            {/* Name, price, status */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {pack.id === 'WINNER' && <HugeiconsIcon icon={Crown02Icon} size={18} className="text-accent shrink-0" />}
                        <h3 id={`pack-${pack.id}`} className="text-base font-bold text-ink">{name}</h3>
                        {pack.state === 'available' && PACK_BADGE[pack.id] && (
                            <span className={cn('rounded-pill px-2 py-0.5 text-[11px] font-semibold', PACK_BADGE[pack.id]!.className)}>
                                {PACK_BADGE[pack.id]!.label}
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-2 text-pretty">{PITCH[pack.id]}</p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-xl font-bold text-ink tabular-nums">{amount(pack.price)}</p>
                    <p className="text-[11px] text-ink-2">{owned ? `${unit} · payé` : `${unit} · à vie`}</p>
                </div>
            </div>

            {/* The earning feature leads every pack */}
            <EarningsBox viewRate={VIEW_RATE[pack.id]} />
            <PackFeatures packId={pack.id} features={copy?.features ?? pack.features} />

            {owned && (
                <div className="flex flex-col gap-2">
                    <button onClick={() => navigate('/ads-network')} className={cn(btn, 'bg-primary text-white hover:bg-primary-hover')}>
                        Commencer à gagner avec mes statuts
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </button>
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
                </div>
            )}

            {included && (
                <p className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-3 text-sm font-medium text-ink-2">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-success" />
                    Inclus dans votre {ownerName ?? 'pack'}
                </p>
            )}

            {pack.state === 'upgrade' && (
                <div className="flex flex-col gap-1.5">
                    <button onClick={() => onBuy(pack.id)} disabled={locked} className={cn(btn, 'bg-primary text-white hover:bg-primary-hover')}>
                        {busy ? REDIRECTING : `Passer au ${SHORT_NAME[pack.id]} · ${money(pack.payPrice ?? pack.price, pack.currency)}`}
                    </button>
                    <p className="text-center text-xs text-ink-2">Vous ne payez que la différence.</p>
                </div>
            )}

            {pack.state === 'available' && (
                <button
                    onClick={() => onBuy(pack.id)}
                    disabled={locked}
                    className={cn(
                        btn,
                        pack.id === 'CLASSIQUE'
                            ? 'bg-surface text-primary border border-primary hover:bg-primary-soft'
                            : 'bg-primary text-white hover:bg-primary-hover',
                    )}
                >
                    {busy ? REDIRECTING : `Choisir le ${SHORT_NAME[pack.id]} · ${money(pack.payPrice ?? pack.price, pack.currency)}`}
                </button>
            )}
        </article>
    );
}

/** The Winner member's public sales page (/p/<referralCode>): their link to share with prospects. */
function SalesPageCard({ referralCode }: { referralCode: string }) {
    const url = `${window.location.origin}/p/${encodeURIComponent(referralCode)}`;
    const [copy, setCopy] = useState<'copied' | 'failed' | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => () => clearTimeout(timer.current), []);

    const copyLink = async () => {
        clearTimeout(timer.current);
        try {
            await navigator.clipboard.writeText(url);
            setCopy('copied');
        } catch {
            // No clipboard (old browser, http): the link stays on screen to copy by hand.
            setCopy('failed');
        }
        timer.current = setTimeout(() => setCopy(null), 2500);
    };

    const share = async () => {
        const text = 'Rejoignez-moi sur Sniper Business Center';
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: 'Sniper Business Center', text, url });
            } catch { /* closed the share sheet */ }
            return;
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} : ${url}`)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <section aria-labelledby="sales-page-title" className="bg-surface border border-border rounded-card p-4 flex flex-col gap-3">
            <div>
                <h3 id="sales-page-title" className="text-base font-bold text-ink">Votre page de vente</h3>
                <p className="mt-1 text-sm text-ink-2 text-pretty">
                    Partagez ce lien : vos prospects découvrent SBC et s'inscrivent directement sous vous.
                </p>
            </div>
            <p className="rounded-tile bg-surface-2 px-3 py-2.5 text-sm font-medium text-ink break-all select-all" data-testid="sales-page-link">
                {url}
            </p>
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={copyLink}
                    className={cn(btn, 'bg-surface text-ink border border-border hover:bg-surface-2')}
                >
                    <HugeiconsIcon icon={copy === 'copied' ? CheckmarkCircle02Icon : Copy01Icon} size={16} className={copy === 'copied' ? 'text-success' : undefined} />
                    {copy === 'copied' ? 'Lien copié' : 'Copier le lien'}
                </button>
                <button
                    type="button"
                    onClick={share}
                    className={cn(btn, 'bg-primary text-white hover:bg-primary-hover')}
                >
                    <HugeiconsIcon icon={Share08Icon} size={16} />
                    Partager
                </button>
            </div>
            <p role="status" className={cn('text-sm text-ink-2', copy !== 'failed' && 'sr-only')}>
                {copy === 'copied' && 'Lien copié'}
                {copy === 'failed' && 'Copie impossible : appuyez longuement sur le lien pour le copier.'}
            </p>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="-mt-1 inline-flex items-center justify-center gap-1 py-1 text-sm font-semibold text-primary"
            >
                Voir ma page
                <HugeiconsIcon icon={LinkSquare02Icon} size={16} />
            </a>
        </section>
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
                <h3 id={`${anchor}-title`} className="min-w-0 text-base font-bold text-ink">{title}</h3>
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

            {activeUntil && (
                <p className="-mt-1 inline-flex items-center gap-1 self-start rounded-pill bg-success-soft px-2 py-0.5 text-xs font-semibold text-success">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
                    Actif jusqu'au {longDate(activeUntil)}
                </p>
            )}

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

    const ownedPack = (offers?.packs ?? []).find((p) => p.state === 'owned');
    // The member's own pack comes first, so the page opens on what they have (as before).
    const packs = [...(offers?.packs ?? [])].sort((a, b) => Number(b.state === 'owned') - Number(a.state === 'owned'));
    const proOptions = (offers?.addons ?? []).filter((a) => a.type === 'PRO');
    const highlightOptions = (offers?.addons ?? []).filter((a) => a.type === 'MISE_EN_AVANT');
    const locked = purchasing !== null || pricesPending;
    const salesPageCode = offers?.winner.owned ? user?.referralCode : undefined;

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

                    <header className="subscription-header mb-5 flex flex-col gap-3">
                        <div>
                            {ownedPack ? (
                                <>
                                    <h2 className="text-2xl font-bold text-ink leading-tight text-balance">
                                        Votre {PLAN_COPY[ownedPack.id]?.title ?? ownedPack.name} est actif
                                    </h2>
                                    <p className="mt-2 text-sm text-ink-2 text-pretty">
                                        {ownedPack.id === 'CLASSIQUE'
                                            ? `Passez au Pack Ciblé pour gagner jusqu'à ${rate(VIEW_RATE.CIBLE)} FCFA par vue et cibler vos contacts plus finement. Vous ne payez que la différence.`
                                            : ownedPack.id === 'CIBLE'
                                                ? `Publiez les pubs des annonceurs en statut : chaque vue vous rapporte jusqu'à ${rate(VIEW_RATE.CIBLE)} FCFA. Passez au Pack Winner pour tout avoir : vous ne payez que la différence.`
                                                : `Vous avez le pack le plus complet. Publiez les pubs des annonceurs en statut : chaque vue vous rapporte jusqu'à ${rate(VIEW_RATE.CIBLE)} FCFA.`}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-ink leading-tight text-balance">
                                        Payez une fois. Vos statuts WhatsApp remboursent le reste.
                                    </h2>
                                    <p className="mt-2 text-sm text-ink-2 text-pretty">
                                        Chaque pack est à vie et vous ouvre SBC Ads Network : publiez les pubs des
                                        annonceurs en statut, et chaque vue vous rapporte de l'argent.
                                    </p>
                                </>
                            )}
                        </div>

                        <div role="group" aria-label="Moyen de paiement" className="grid grid-cols-2 gap-1 rounded-tile border border-border bg-surface p-1">
                            {([
                                { id: 'traditional', label: 'Mobile Money (FCFA)' },
                                { id: 'crypto', label: 'Crypto (USD)' },
                            ] as const).map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    aria-pressed={paymentMethod === m.id}
                                    disabled={purchasing !== null}
                                    onClick={() => setPaymentMethod(m.id)}
                                    className={cn(
                                        'rounded-lg px-1 py-2 text-sm font-semibold transition-colors',
                                        paymentMethod === m.id ? 'bg-primary text-white' : 'text-ink-2 hover:bg-surface-2',
                                    )}
                                >
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
                                <Fragment key={pack.id}>
                                    <motion.div {...enter(index)}>
                                        <PackCard
                                            pack={pack}
                                            winner={offers!.winner}
                                            busy={purchasing === pack.id}
                                            locked={locked}
                                            ownerName={ownedPack ? (PLAN_COPY[ownedPack.id]?.title ?? ownedPack.name) : null}
                                            onBuy={handlePurchase}
                                        />
                                    </motion.div>
                                    {pack.id === 'WINNER' && salesPageCode && (
                                        <motion.div {...enter(index + 1)}>
                                            <SalesPageCard referralCode={salesPageCode} />
                                        </motion.div>
                                    )}
                                </Fragment>
                            ))}

                            {/* Advertisers need no pack (Rufus, 2026-11-13): someone who only
                                wants to advertise goes to the advertiser space instead. */}
                            {!ownedPack && (
                                <motion.div {...enter(packs.length)}>
                                    <Link
                                        to={ANNONCEUR_HOME}
                                        className="flex items-center gap-3 bg-surface border border-border rounded-card p-4 hover:bg-surface-2 transition-colors"
                                    >
                                        <span className="shrink-0 size-10 grid place-items-center rounded-full bg-primary-soft text-primary">
                                            <HugeiconsIcon icon={Megaphone01Icon} size={20} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-ink">Vous voulez seulement faire de la publicité ?</span>
                                            <span className="block text-sm text-ink-2 text-pretty">Lancez une campagne sans acheter de pack.</span>
                                        </span>
                                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="shrink-0 text-ink-3" />
                                    </Link>
                                </motion.div>
                            )}

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
                                <h3 id="abonnement-error-title" className="text-lg font-semibold text-ink mb-2">Paiement interrompu</h3>
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
