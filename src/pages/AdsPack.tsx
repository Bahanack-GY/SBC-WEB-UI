import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from "../components/common/BackButton";
import { motion } from "framer-motion";
import iconContact from "../assets/icon/contact.png";
import Skeleton from '../components/common/Skeleton';
import { HiMiniMinusCircle } from "react-icons/hi2";
import { useRelance } from '../contexts/RelanceContext';
import RelancePacksModal from '../components/relance/RelancePacksModal';

function AdsPack() {
    const navigate = useNavigate();
    const { hasCredits, isLoading: checkingSubscription } = useRelance();
    const [loading, setLoading] = useState(true);
    const [showPacksModal, setShowPacksModal] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    const handleAccessRelance = () => {
        navigate('/relance');
    };

    const handlePurchaseClick = () => {
        setShowPacksModal(true);
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
                            <div className="w-full">
                                <div className="uppercase text-white text-xs">Relance email & SMS</div>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-2xl font-bold text-white">À l'usage</div>
                                </div>
                                <div className="text-white text-sm mt-1 mb-3">
                                    Achetez des packs de crédits — payez seulement les messages que vous envoyez.
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
                                        <span>Emails personnalisés avec campagnes ciblées</span>
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

                                <div className="mt-3 flex gap-2 flex-wrap">
                                    {checkingSubscription ? (
                                        <button className="bg-white/30 text-white rounded-xl px-4 py-2 font-bold shadow cursor-wait" disabled>
                                            Vérification...
                                        </button>
                                    ) : hasCredits ? (
                                        <>
                                            <button
                                                onClick={handleAccessRelance}
                                                className="bg-green-600 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-green-700 transition-colors flex items-center gap-2"
                                            >
                                                <span>✓</span>
                                                Accéder à Relance
                                            </button>
                                            <button
                                                onClick={handlePurchaseClick}
                                                className="bg-white text-[#25D366] rounded-xl px-4 py-2 font-bold shadow hover:bg-green-50 transition-colors"
                                            >
                                                Acheter des crédits
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handlePurchaseClick}
                                            className="bg-white text-[#25D366] rounded-xl px-4 py-2 font-bold shadow hover:bg-green-50 transition-colors"
                                        >
                                            Acheter des crédits
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

            {/* Relance credit packs modal */}
            <RelancePacksModal
                isOpen={showPacksModal}
                onClose={() => setShowPacksModal(false)}
            />

        </div>
    );
}

export default AdsPack;
