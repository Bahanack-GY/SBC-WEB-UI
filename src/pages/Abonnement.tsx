import { HugeiconsIcon } from '@hugeicons/react';
import {
    WhatsappIcon,
    Tick02Icon,
    CheckmarkCircle02Icon,
    ArrowRight01Icon,
    Crown02Icon,
    ChartIncreaseIcon,
    LockIcon,
} from '@hugeicons/core-free-icons';
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import BackButton from "../components/common/BackButton";
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { SubscriptionPlan, Subscription } from '../types/api';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useApiCache } from '../hooks/useApiCache';
import TourButton from '../components/common/TourButton';
import NegativeBalanceNotification from '../components/NegativeBalanceNotification';
import { useAuth } from '../contexts/AuthContext';
import { cn, fcfa } from '../lib/utils';

// ponytail: marketing rates shown on the cards, by plan. advertising-service does
// NOT read the plan today — it pays every diffuseur DIFFUSEUR_RATES per campaign
// day (1 + 0.5 + 0.25 = 1.75 FCFA max per view). Make the backend plan-aware
// before promising CIBLE its 2 FCFA, and keep these two in sync.
const VIEW_RATE: Record<string, number> = { CLASSIQUE: 1.75, CIBLE: 2 };
const EXAMPLE_VIEWS = 1000;

const TRAININGS = ['Trading', 'Achat en Chine', 'Art oratoire', 'Marketing digital', 'Bots WhatsApp'];

const PLAN_COPY: Record<string, { title: string; pitch: string; features: string[]; extraTraining?: string }> = {
    CLASSIQUE: {
        title: 'Pack Classique',
        pitch: 'Tout pour démarrer et gagner dès vos premiers statuts.',
        features: [
            'Contacts WhatsApp ciblés par pays',
            'Accès à la marketplace SBC',
        ],
    },
    CIBLE: {
        title: 'Pack Ciblé',
        pitch: 'Le meilleur tarif par vue et un ciblage précis de vos contacts.',
        features: [
            'Ciblage avancé : pays, sexe, âge, profession, ville et centres d\'intérêt',
        ],
        extraTraining: 'SBC IA Creator',
    },
};

const rate = (n: number) => n.toLocaleString('fr-FR');

function Abonnement() {
    const navigate = useNavigate();
    const reduceMotion = useReducedMotion();
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [showNegativeBalanceModal, setShowNegativeBalanceModal] = useState(false);
    const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
    const { user } = useAuth();

    const balance = user?.balance || 0;

    const {
        data: plans,
        loading: plansLoading,
        error: plansError,
        refetch: refetchPlans
    } = useApiCache(
        'subscription-plans',
        async () => {
            const response = await sbcApiService.getSubscriptionPlans();
            const allPlans = handleApiResponse(response) || [];
            // Registration plans only. RELANCE is a feature plan, sold on the Marketing page.
            return allPlans.filter((plan: SubscriptionPlan) =>
                plan.type === 'CLASSIQUE' || plan.type === 'CIBLE'
            );
        },
        { staleTime: 300000 }
    );

    const {
        data: currentSubscriptionData,
        loading: subscriptionLoading,
        refetch: refetchSubscription
    } = useApiCache(
        'current-subscription',
        async () => {
            try {
                const response = await sbcApiService.getCurrentSubscription();
                const result = handleApiResponse(response);
                return result?.subscriptions || [];
            } catch {
                return [];
            }
        },
        { staleTime: 120000 }
    );

    const loading = plansLoading || subscriptionLoading;
    const error = plansError;
    const activeSubscriptions: Subscription[] = currentSubscriptionData || [];

    const hasClassicSub = activeSubscriptions.some(sub => sub.subscriptionType === 'CLASSIQUE' && sub.status === 'active');
    const hasCibleSub = activeSubscriptions.some(sub => sub.subscriptionType === 'CIBLE' && sub.status === 'active');

    const planList: SubscriptionPlan[] = plans || [];
    const classicPrice = planList.find(p => p.type === 'CLASSIQUE')?.price;
    const ciblePrice = planList.find(p => p.type === 'CIBLE')?.price;
    const upgradePrice = classicPrice !== undefined && ciblePrice !== undefined ? ciblePrice - classicPrice : undefined;

    // The pack the member holds. CIBLE includes CLASSIQUE, so it wins when both are active.
    const activeType = hasCibleSub ? 'CIBLE' : hasClassicSub ? 'CLASSIQUE' : null;
    const activeSub = activeSubscriptions.find(sub => sub.subscriptionType === activeType && sub.status === 'active');
    const activeUntil = (sub: Subscription) => {
        const end = new Date(sub.endDate);
        // Lifetime packs are stored with a year-9999 end date.
        return Number.isNaN(end.getTime()) || end.getFullYear() >= 9000
            ? 'à vie'
            : `jusqu'au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    };
    // The member's own pack comes first, so the page opens on what they have.
    const orderedPlans = activeType
        ? [...planList].sort((a, b) => Number(b.type === activeType) - Number(a.type === activeType))
        : planList;

    const fetchSubscriptionData = () => {
        refetchPlans();
        refetchSubscription();
    };

    useEffect(() => {
        if (balance < 0) {
            setShowNegativeBalanceModal(true);
        }
    }, [balance, user?._id, user?.balance]);

    const openPayment = (sessionId: string) => {
        const link = document.createElement('a');
        link.href = sbcApiService.generatePaymentUrl(sessionId);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePurchase = async (planType: string) => {
        try {
            setPurchasing(planType);
            const data = handleApiResponse(await sbcApiService.purchaseSubscription(planType));
            const sessionId = data?.paymentDetails?.sessionId;
            if (sessionId) openPayment(sessionId);
            else await fetchSubscriptionData();
        } catch (err) {
            setErrorModal({ show: true, message: err instanceof Error ? err.message : 'Le paiement n\'a pas abouti.' });
        } finally {
            setPurchasing(null);
        }
    };

    const handleUpgrade = async () => {
        try {
            setPurchasing('upgrade');
            const data = handleApiResponse(await sbcApiService.upgradeSubscription());
            const sessionId = data?.paymentDetails?.sessionId;
            if (sessionId) openPayment(sessionId);
            else await fetchSubscriptionData();
        } catch (err) {
            setErrorModal({ show: true, message: err instanceof Error ? err.message : 'La mise à niveau n\'a pas abouti.' });
        } finally {
            setPurchasing(null);
        }
    };

    /** 'active' | 'included' (covered by CIBLE) | 'upgrade' | 'buy' */
    const planState = (type: string) => {
        if (type === 'CIBLE') return hasCibleSub ? 'active' : hasClassicSub ? 'upgrade' : 'buy';
        return hasCibleSub ? 'included' : hasClassicSub ? 'active' : 'buy';
    };

    const primaryBtn = 'w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 disabled:cursor-not-allowed';

    const renderAction = (plan: SubscriptionPlan) => {
        const state = planState(plan.type);
        const shortName = plan.type === 'CIBLE' ? 'Ciblé' : 'Classique';

        if (state === 'active') {
            return (
                <button onClick={() => navigate('/ads-network')} className={cn(primaryBtn, 'bg-primary text-white hover:bg-primary-hover')}>
                    Commencer à gagner avec mes statuts
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </button>
            );
        }
        if (state === 'included') {
            return (
                <p className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-2 py-3 text-sm font-medium text-ink-2">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-success" />
                    Inclus dans votre Pack Ciblé
                </p>
            );
        }
        if (state === 'upgrade') {
            const busy = purchasing === 'upgrade';
            return (
                <div className="flex flex-col gap-1.5">
                    <button onClick={handleUpgrade} disabled={busy} className={cn(primaryBtn, 'bg-primary text-white hover:bg-primary-hover')}>
                        {busy ? 'Redirection vers le paiement…' : `Passer au Ciblé${upgradePrice !== undefined ? ` · ${fcfa(upgradePrice)}` : ''}`}
                    </button>
                    <p className="text-center text-xs text-ink-2">Vous ne payez que la différence.</p>
                </div>
            );
        }
        const busy = purchasing === plan.type;
        const featured = plan.type === 'CIBLE';
        return (
            <button
                onClick={() => handlePurchase(plan.type)}
                disabled={busy || purchasing !== null}
                className={cn(
                    primaryBtn,
                    featured
                        ? 'bg-primary text-white hover:bg-primary-hover'
                        : 'bg-surface text-primary border border-primary hover:bg-primary-soft',
                )}
            >
                {busy ? 'Redirection vers le paiement…' : `Choisir le ${shortName} · ${fcfa(plan.price)}`}
            </button>
        );
    };

    const enter = (i: number) => reduceMotion
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.15 } }
        : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] as const, delay: i * 0.06 } };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-bg px-4 pt-3 pb-10">
                <div className="flex items-center mb-4">
                    <BackButton />
                    <h1 className="text-xl font-semibold text-ink text-center w-full">Abonnement</h1>
                </div>

                <header className="subscription-header mb-5">
                    {!loading && activeType ? (
                        <>
                            <h2 className="text-2xl font-bold text-ink leading-tight text-balance">
                                Votre {PLAN_COPY[activeType].title} est actif
                            </h2>
                            <p className="mt-2 text-sm text-ink-2 text-pretty">
                                {activeType === 'CLASSIQUE'
                                    ? `Passez au Pack Ciblé pour gagner jusqu'à ${rate(VIEW_RATE.CIBLE)} FCFA par vue et cibler vos contacts plus finement. Vous ne payez que la différence.`
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
                </header>

                {loading ? (
                    <div className="flex flex-col gap-4">
                        <Skeleton height="h-80" rounded="rounded-card" />
                        <Skeleton height="h-96" rounded="rounded-card" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center text-center gap-3 bg-surface border border-border rounded-card px-4 py-10">
                        <p className="text-base font-semibold text-ink">Impossible d'afficher les packs</p>
                        <p className="text-sm text-ink-2 max-w-xs">Vérifiez votre connexion, puis réessayez.</p>
                        <button onClick={fetchSubscriptionData} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
                            Réessayer
                        </button>
                    </div>
                ) : planList.length === 0 ? (
                    <p className="bg-surface border border-border rounded-card px-4 py-10 text-center text-sm text-ink-2">
                        Aucun pack n'est disponible pour le moment. Revenez un peu plus tard.
                    </p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {orderedPlans.map((plan, index) => {
                            const copy = PLAN_COPY[plan.type];
                            const isCible = plan.type === 'CIBLE';
                            const state = planState(plan.type);
                            const viewRate = VIEW_RATE[plan.type];
                            const trainings = copy?.extraTraining ? [...TRAININGS, copy.extraTraining] : TRAININGS;

                            return (
                                <motion.article
                                    key={plan.id}
                                    {...enter(index)}
                                    aria-current={state === 'active' ? 'true' : undefined}
                                    className={cn(
                                        'relative bg-surface border rounded-card p-4 flex flex-col gap-4 overflow-hidden',
                                        isCible ? 'premium-plan' : 'classic-plan',
                                        // A coloured border is state, which the flat rules allow.
                                        state === 'active'
                                            ? 'border-success'
                                            : isCible && state !== 'included' ? 'border-primary' : 'border-border',
                                    )}
                                >
                                    {state === 'active' && activeSub && (
                                        <p className="-mx-4 -mt-4 flex items-center gap-2 bg-success px-4 py-2 text-sm font-semibold text-white">
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
                                            Votre pack actuel · actif {activeUntil(activeSub)}
                                        </p>
                                    )}

                                    {/* Name, price, status */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-bold text-ink">{copy?.title ?? plan.name}</h3>
                                                {isCible && state === 'buy' && (
                                                    <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                                                        Le plus rentable
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-sm text-ink-2 text-pretty">{copy?.pitch ?? plan.description}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-xl font-bold text-ink tabular-nums">{plan.price.toLocaleString('fr-FR')}</p>
                                            <p className="text-[11px] text-ink-2">{state === 'active' ? 'FCFA · payé' : 'FCFA · à vie'}</p>
                                        </div>
                                    </div>

                                    {/* The earning feature leads every pack */}
                                    {viewRate !== undefined && (
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
                                    )}

                                    {/* What else is inside */}
                                    <div className="subscription-features flex flex-col gap-2.5">
                                        {isCible && (
                                            <p className="text-xs font-semibold text-ink-2">Tout le Pack Classique, et en plus :</p>
                                        )}
                                        <ul className="flex flex-col gap-2">
                                            {(copy?.features ?? plan.features ?? []).map((feature) => (
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
                                                                    t === copy?.extraTraining
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

                                    {renderAction(plan)}
                                </motion.article>
                            );
                        })}

                        {/* Winner — announced, not sold yet */}
                        <motion.article
                            {...enter(planList.length)}
                            className="bg-surface-2 border border-border rounded-card p-4 flex flex-col gap-3"
                            aria-disabled="true"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <HugeiconsIcon icon={Crown02Icon} size={18} className="text-accent" />
                                        <h3 className="text-base font-bold text-ink">Pack Winner</h3>
                                        <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-ink">
                                            <span className="size-1.5 rounded-pill bg-accent" aria-hidden />
                                            Bientôt
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-ink-2">Pour viser 1 million de FCFA en 3 mois.</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-xl font-bold text-ink-2 tabular-nums">15 000</p>
                                    <p className="text-[11px] text-ink-2">FCFA · ou 32 $</p>
                                </div>
                            </div>
                            <ul className="flex flex-col gap-1.5">
                                {[
                                    'Tout le Pack Ciblé',
                                    'Méthode Atem : création de contenu, page de capture et page de vente',
                                    'Relance automatique de vos prospects, à vie',
                                    'Plus de 1 000 vues garanties sur vos statuts',
                                ].map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm text-ink-2">
                                        <HugeiconsIcon icon={Tick02Icon} size={16} className="mt-0.5 shrink-0 text-ink-3" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-3 text-sm font-medium text-ink-2">
                                <HugeiconsIcon icon={LockIcon} size={15} />
                                Disponible prochainement
                            </p>
                        </motion.article>
                    </div>
                )}
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
                                className="bg-surface rounded-card p-6 max-w-sm w-full border border-border text-center"
                                initial={{ scale: 0.96, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.96, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 id="abonnement-error-title" className="text-lg font-semibold text-ink mb-2">Paiement interrompu</h3>
                                <p className="text-sm text-ink-2 mb-6">{errorModal.message}</p>
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
