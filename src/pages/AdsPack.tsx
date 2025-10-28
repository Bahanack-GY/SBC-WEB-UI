import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from "../components/common/BackButton";
import { motion } from "framer-motion";
import iconContact from "../assets/icon/contact.png";
import Skeleton from '../components/common/Skeleton';
import { HiMiniMinusCircle } from "react-icons/hi2";
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

function AdsPack() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [loading, setLoading] = useState(true);
    const [hasRelanceSub, setHasRelanceSub] = useState(false);
    const [checkingSubscription, setCheckingSubscription] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [showComingSoonModal, setShowComingSoonModal] = useState(false);

    useEffect(() => {
        checkRelanceSubscription();
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    // Refresh subscription status when returning to this page
    useEffect(() => {
        const handleFocus = () => {
            checkRelanceSubscription();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const checkRelanceSubscription = async () => {
        try {
            const response = await sbcApiService.checkSubscription('RELANCE');

            // Handle the response directly without handleApiResponse wrapper
            if (response.isSuccessByStatusCode && response.body?.data) {
                const hasSub = response.body.data.hasSubscription || false;
                setHasRelanceSub(hasSub);
            } else {
                setHasRelanceSub(false);
            }
        } catch (error) {
            setHasRelanceSub(false);
        } finally {
            setCheckingSubscription(false);
        }
    };

    const handlePurchaseRelance = async () => {
        try {
            setPurchasing(true);
            const response = await sbcApiService.purchaseSubscription('RELANCE');
            const data = handleApiResponse(response);

            const sessionId = data?.paymentDetails?.sessionId;
            if (sessionId) {
                const paymentUrl = sbcApiService.generatePaymentUrl(sessionId);
                const link = document.createElement('a');
                link.href = paymentUrl;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                await checkRelanceSubscription();
            }
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Paiement échoué');
        } finally {
            setPurchasing(false);
        }
    };

    const handleAccessRelance = () => {
        // Check both admin status AND subscription
        if (!isAdmin || !hasRelanceSub) {
            setShowComingSoonModal(true);
            return;
        }
        navigate('/relance');
    };

    const handlePurchaseClick = () => {
        if (!isAdmin) {
            setShowComingSoonModal(true);
            return;
        }
        handlePurchaseRelance();
    };

    return (
        <div className="p-3 h-screen mb-36">
            {loading ? (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Skeleton width="w-10" height="h-10" rounded="rounded-xl" />
                        <Skeleton width="w-40" height="h-8" rounded="rounded-xl" />
                    </div>
                    <Skeleton height="h-44" rounded="rounded-2xl" />
                </div>
            ) : (
                <>
                    <div className="flex items-center">
                        <BackButton />
                        <h3 className="text-xl font-medium text-center w-full">Marketing</h3>
                    </div>

                    <div className="flex flex-col gap-4 mt-6">
                        {/* Relance Pack */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-gradient-to-r from-[#25D366] to-green-500 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden"
                        >
                            {/* Bientôt disponible badge */}
                            <div className="absolute top-3 right-3 bg-yellow-400 text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-10">
                                Bientôt disponible
                            </div>
                            <div className="w-full">
                                <div className="uppercase text-white text-xs">Relance WhatsApp</div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold text-white">1 000F</div>
                                    <span className="text-green-100 font-medium text-xs">/2 mois</span>
                                </div>
                                <div className="text-white text-sm mt-1 mb-3">
                                    Système automatisé de suivi des filleuls non-payants
                                </div>

                                {/* Features List */}
                                <ul className="mt-3 mb-4 space-y-1">
                                    <li className="flex items-center text-white text-xs gap-2">
                                        <HiMiniMinusCircle className="text-green-200 w-3 h-3 flex-shrink-0" />
                                        <span>Messages automatiques pendant 7 jours</span>
                                    </li>
                                    <li className="flex items-center text-white text-xs gap-2">
                                        <HiMiniMinusCircle className="text-green-200 w-3 h-3 flex-shrink-0" />
                                        <span>Relance intelligente des filleuls non-payants</span>
                                    </li>
                                    <li className="flex items-center text-white text-xs gap-2">
                                        <HiMiniMinusCircle className="text-green-200 w-3 h-3 flex-shrink-0" />
                                        <span>Augmente vos chances de conversion</span>
                                    </li>
                                    <li className="flex items-center text-white text-xs gap-2">
                                        <HiMiniMinusCircle className="text-green-200 w-3 h-3 flex-shrink-0" />
                                        <span>Connexion via WhatsApp Web (QR Code)</span>
                                    </li>
                                    <li className="flex items-center text-white text-xs gap-2">
                                        <HiMiniMinusCircle className="text-green-200 w-3 h-3 flex-shrink-0" />
                                        <span>Contrôle total: activer/suspendre à tout moment</span>
                                    </li>
                                    <li className="flex items-center text-white text-xs gap-2">
                                        <HiMiniMinusCircle className="text-green-200 w-3 h-3 flex-shrink-0" />
                                        <span>Suivi en temps réel des messages envoyés</span>
                                    </li>
                                    <li className="flex items-center text-white text-xs gap-2">
                                        <HiMiniMinusCircle className="text-green-200 w-3 h-3 flex-shrink-0" />
                                        <span>Économisez du temps et maximisez vos revenus</span>
                                    </li>
                                </ul>

                                <div className="mt-3">
                                    {checkingSubscription ? (
                                        <button className="bg-white/30 text-white rounded-xl px-4 py-2 font-bold shadow cursor-wait" disabled>
                                            Vérification...
                                        </button>
                                    ) : hasRelanceSub ? (
                                        <button
                                            onClick={handleAccessRelance}
                                            className="bg-green-500 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-green-600 transition-colors flex items-center gap-2"
                                        >
                                            <span>✓</span>
                                            Accéder à Relance
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handlePurchaseClick}
                                            disabled={purchasing}
                                            className="bg-white text-[#25D366] rounded-xl px-4 py-2 font-bold shadow hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {purchasing ? 'Paiement...' : 'Souscrire'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="absolute right-4 bottom-4 opacity-30">
                                <img src={iconContact} alt="icon" className="size-40" />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}

            {/* Coming Soon Modal */}
            {showComingSoonModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={() => setShowComingSoonModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0.2 }}
                        className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className="text-6xl mb-4">🚀</div>
                            <h4 className="text-lg font-bold mb-3">Bientôt disponible !</h4>
                            <p className="text-gray-600 mb-6">
                                La fonctionnalité Relance WhatsApp sera disponible très prochainement. Restez connecté pour profiter de cette nouvelle fonctionnalité.
                            </p>
                            <button
                                onClick={() => setShowComingSoonModal(false)}
                                className="w-full bg-green-500 text-white rounded-xl py-2 font-bold shadow hover:bg-green-600 transition-colors"
                            >
                                OK
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}

export default AdsPack;
