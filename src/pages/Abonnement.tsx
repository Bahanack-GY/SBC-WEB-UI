import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import iconOne from "../assets/icon/Growth.png";
import iconTwo from "../assets/icon/analyse.png";
import iconContact from "../assets/icon/contact.png";
import BackButton from "../components/common/BackButton";
import { HiMiniMinusCircle } from "react-icons/hi2";
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { SubscriptionPlan, Subscription } from '../types/api';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useApiCache } from '../hooks/useApiCache';
import TourButton from '../components/common/TourButton';
import NegativeBalanceNotification from '../components/NegativeBalanceNotification';
import { useAuth } from '../contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';

function Abonnement() {

    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [showNegativeBalanceModal, setShowNegativeBalanceModal] = useState(false);
    const [errorModal, setErrorModal] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
    const { user } = useAuth();

    // Get user balance for negative balance modal (already available from AuthContext)
    const balance = user?.balance || 0;

    // Use cached API calls to prevent duplicate requests
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
            // Filter to show only REGISTRATION category plans (CLASSIQUE, CIBLE)
            // Exclude FEATURE category plans (RELANCE) - those are shown in Marketing page
            return allPlans.filter((plan: SubscriptionPlan) =>
                plan.type === 'CLASSIQUE' || plan.type === 'CIBLE'
            );
        },
        { staleTime: 300000 } // 5 minutes
    );

    const {
        data: currentSubscriptionData,
        loading: subscriptionLoading,
        // error: subscriptionError,
        refetch: refetchSubscription
    } = useApiCache(
        'current-subscription',
        async () => {
            try {
                const response = await sbcApiService.getCurrentSubscription();
                const result = handleApiResponse(response);
                // The API returns { subscriptions: [...] }, so we extract the array
                return result?.subscriptions || [];
            } catch (err) {
                return [];
            }
        },
        { staleTime: 120000 } // 2 minutes
    );

    const loading = plansLoading || subscriptionLoading;
    const error = plansError; // Don't include subscription error as it's optional
    const activeSubscriptions: Subscription[] = currentSubscriptionData || [];

    const hasClassicSub = activeSubscriptions.some(sub => sub.subscriptionType === 'CLASSIQUE' && sub.status === 'active');
    const hasCibleSub = activeSubscriptions.some(sub => sub.subscriptionType === 'CIBLE' && sub.status === 'active');

    const fetchSubscriptionData = () => {
        refetchPlans();
        refetchSubscription();
    };

    // Check for negative balance and show notification
    useEffect(() => {
        if (balance < 0) {
            // Show modal every time user logs in or signs up (no restrictions)
            setShowNegativeBalanceModal(true);
        }
    }, [balance, user?.id, user?.balance]);

    const handlePurchase = async (planType: string) => {
        try {
            setPurchasing(planType);
            const response = await sbcApiService.purchaseSubscription(planType);
            const data = handleApiResponse(response);

            const sessionId = data?.paymentDetails?.sessionId;
            if (sessionId) {
                const paymentUrl = sbcApiService.generatePaymentUrl(sessionId);
                // Create a temporary link element and trigger click
                const link = document.createElement('a');
                link.href = paymentUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                await fetchSubscriptionData();
            }
        } catch (err) {
            setErrorModal({ show: true, message: err instanceof Error ? err.message : 'Paiement échoué' });
        } finally {
            setPurchasing(null);
        }
    };

    const handleUpgrade = async () => {
        try {
            setPurchasing('upgrade');
            const response = await sbcApiService.upgradeSubscription();
            const data = handleApiResponse(response);

            const sessionId = data?.paymentDetails?.sessionId;
            if (sessionId) {
                const paymentUrl = sbcApiService.generatePaymentUrl(sessionId);
                // Create a temporary link element and trigger click
                const link = document.createElement('a');
                link.href = paymentUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                await fetchSubscriptionData();
            }
        } catch (err) {
            setErrorModal({ show: true, message: err instanceof Error ? err.message : 'Mise à niveau échouée' });
        } finally {
            setPurchasing(null);
        }
    };

    const getSubscriptionButton = (plan: SubscriptionPlan) => {
        const isPurchasing = purchasing === plan.type || (plan.type === 'CIBLE' && purchasing === 'upgrade');

        if (hasCibleSub) {
            return (
                <button className="bg-green-500 text-white rounded-xl px-4 py-2 font-bold shadow cursor-default">
                    Actif
                </button>
            );
        }

        if (hasClassicSub) {
            if (plan.type === 'CLASSIQUE') {
                return (
                    <button className="bg-green-500 text-white rounded-xl px-4 py-2 font-bold shadow cursor-default">
                        Actif
                    </button>
                );
            }
            if (plan.type === 'CIBLE') {
                return (
                    <button
                        onClick={handleUpgrade}
                        disabled={isPurchasing}
                        className="bg-purple-700 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPurchasing ? 'Mise à niveau...' : 'Mettre à niveau'}
                    </button>
                );
            }
        }

        return (
            <button
                onClick={() => handlePurchase(plan.type)}
                disabled={isPurchasing}
                className="bg-blue-700 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isPurchasing ? 'Paiement...' : 'Payer'}
            </button>
        );
    };


    return (
        <ProtectedRoute>
            <div className="p-3 bg-white justify-center items-center pb-32">
                <div className="flex items-center mb-3">
                    <BackButton />
                    <h3 className="text-xl font-medium text-center w-full">Abonnement</h3>
                </div>
                {loading ? (
                    <div className="flex flex-col gap-4 mt-6">
                        <Skeleton height="h-28" rounded="rounded-2xl" />
                        <Skeleton height="h-44" rounded="rounded-2xl" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                        <p className="text-lg mb-2 text-red-500">Erreur lors du chargement</p>
                        <p className="text-sm mb-4">{error}</p>
                        <button
                            onClick={fetchSubscriptionData}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            Réessayer
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 mt-6 ">
                        {!plans || plans.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Aucun plan d'abonnement disponible
                            </div>
                        ) : (
                            plans.map((plan: SubscriptionPlan, index: number) => (
                                <motion.div
                                    key={plan.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * (index + 1) }}
                                    className={`rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden ${plan.type === 'CIBLE'
                                        ? 'bg-gradient-to-r from-[#F68F0F] to-orange-400'
                                        : 'bg-gradient-to-r from-[#115CF6] to-blue-600'
                                        }`}
                                >
                                    <div className="w-full">
                                        <div className="uppercase text-white text-xs">{plan.name}</div>
                                        <div className="flex items-baseline gap-2">
                                            <div className="text-2xl font-bold text-white">{plan.price.toLocaleString('fr-FR')}F</div>
                                            {plan.duration > 365 && (
                                                <span className="text-orange-300 font-bold text-xs align-top">à vie</span>
                                            )}
                                        </div>
                                        <div className="text-white text-sm mt-1">{plan.description}</div>

                                        {/* Custom features based on subscription type */}
                                        <ul className="mt-3 mb-2 space-y-1">
                                            {plan.type === 'CLASSIQUE' ? (
                                                <>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Possibilité de gagner 5000fcfa à 10.000fcfa/jour</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation en trading</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation sur l'achat en chine</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation en art oratoire</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation en marketing digital</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation création des bots WhatsApp</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Accès marketplace</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Contacts WhatsApp</span>
                                                    </li>
                                                </>
                                            ) : (
                                                <>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Possibilité de gagner 12.500fcfa à 25.000fcfa/jour</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation en trading</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation sur l'achat en chine</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation en art oratoire</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation en marketing digital</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Formation création des bots WhatsApp</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Accès marketplace</span>
                                                    </li>
                                                    <li className="flex items-center text-white text-xs gap-2">
                                                        <HiMiniMinusCircle className="text-orange-300 w-3 h-3 flex-shrink-0" />
                                                        <span>Contacts WhatsApp</span>
                                                    </li>
                                                </>
                                            )}
                                        </ul>

                                        <div className="mt-3">
                                            {getSubscriptionButton(plan)}
                                        </div>
                                    </div>
                                    <div className="absolute right-4 bottom-4 opacity-30">
                                        <img
                                            src={plan.type === 'CIBLE' ? iconOne : iconTwo}
                                            alt="icon"
                                            className="size-40"
                                        />
                                    </div>
                                </motion.div>
                            ))
                        )}

                        {/* Winner Pack - Coming Soon - PREMIUM */}
                        {!loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-2xl p-5 shadow-xl relative overflow-visible border-2 border-yellow-300 mt-4"
                            >
                                {/* Premium badge at top */}
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-300 to-amber-400 text-gray-900 text-[10px] font-bold px-4 py-1 rounded-full shadow-lg z-20 border-2 border-white">
                                    👑 OFFRE PREMIUM
                                </div>

                                {/* Bientôt disponible badge */}
                                <div className="absolute top-3 right-3 bg-white text-orange-600 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-10 animate-pulse">
                                    Bientôt disponible
                                </div>

                                <div className="w-full mt-2">
                                    <div className="uppercase text-white text-xs font-bold">ABONNEMENT WINNER</div>
                                    <div className="flex items-baseline gap-2">
                                        <div className="text-2xl font-bold text-white">15 000F</div>
                                        <span className="text-white/90 font-medium text-xs">ou 32$</span>
                                    </div>
                                    <div className="text-white text-sm font-bold mt-1 mb-3">
                                        🎯 1 million de FCFA en 3 mois
                                    </div>

                                    {/* Features List */}
                                    <ul className="mt-3 mb-2 space-y-1">
                                        <li className="flex items-center text-white text-xs gap-2">
                                            <HiMiniMinusCircle className="text-yellow-200 w-3 h-3 flex-shrink-0" />
                                            <span>Accès à toutes les offres du pack ciblé</span>
                                        </li>
                                        <li className="flex items-center text-white text-xs gap-2">
                                            <HiMiniMinusCircle className="text-yellow-200 w-3 h-3 flex-shrink-0" />
                                            <span>Accès à la méthode Atem (formation en création de contenu + page de capture + page de vente)</span>
                                        </li>
                                        <li className="flex items-center text-white text-xs gap-2">
                                            <HiMiniMinusCircle className="text-yellow-200 w-3 h-3 flex-shrink-0" />
                                            <span>Relance des prospects automatiquement à vie</span>
                                        </li>
                                        <li className="flex items-center text-white text-xs gap-2">
                                            <HiMiniMinusCircle className="text-yellow-200 w-3 h-3 flex-shrink-0" />
                                            <span>Accès au système d'affiliation</span>
                                        </li>
                                        <li className="flex items-center text-white text-xs gap-2">
                                            <HiMiniMinusCircle className="text-yellow-200 w-3 h-3 flex-shrink-0" />
                                            <span>Plus de 1000 vues en statut WhatsApp</span>
                                        </li>
                                    </ul>

                                    <div className="mt-3">
                                        <button
                                            disabled
                                            className="bg-white text-orange-600 rounded-xl px-4 py-2 font-bold shadow cursor-not-allowed opacity-80"
                                        >
                                            Bientôt disponible
                                        </button>
                                    </div>
                                </div>
                                <div className="absolute right-4 bottom-4 opacity-30">
                                    <img
                                        src={iconContact}
                                        alt="icon"
                                        className="size-40"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </div>
                )}
                <TourButton />

                {/* Negative Balance Notification Modal */}
                <NegativeBalanceNotification
                    isOpen={showNegativeBalanceModal}
                    onClose={() => setShowNegativeBalanceModal(false)}
                    userReferralCode={user?.referralCode || ''}
                    negativeBalance={Math.abs(balance)}
                />

                {/* Error Modal */}
                <AnimatePresence>
                    {errorModal.show && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setErrorModal({ show: false, message: '' })}
                        >
                            <motion.div
                                className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="text-center">
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur</h3>
                                    <p className="text-gray-600 mb-6">{errorModal.message}</p>
                                    <button
                                        onClick={() => setErrorModal({ show: false, message: '' })}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}

export default Abonnement;
