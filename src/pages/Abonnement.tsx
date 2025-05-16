import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import iconOne from "../assets/icon/Growth.png";
import iconTwo from "../assets/icon/analyse.png";
import BackButton from "../components/common/BackButton";
import { HiMiniMinusCircle } from "react-icons/hi2";
import Skeleton from '../components/common/Skeleton';

function Abonnement() {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    const proFeatures = [
        "Accès à la fiche de contacts",
        "Accès aux contacts ciblés",
        "Retrait d'argent",
        "Accès au groupe WhatsApp",
        "Formation trading",
        "Formation marketing",
        "Formation achat en Chine",
        "Formation prise de parole en public",
        "Accès au marketplace"
    ];
    return (
        <div className="p-3 h-screen bg-white justify-center items-center">
            <div className="flex items-center mb-3">
                <BackButton />
                <h3 className="text-xl font-medium text-center w-full">Abonnement</h3>
            </div>
            {loading ? (
                <div className="flex flex-col gap-4 mt-6">
                    <Skeleton height="h-28" rounded="rounded-2xl" />
                    <Skeleton height="h-44" rounded="rounded-2xl" />
                </div>
            ) : (
            <div className="flex flex-col gap-4 mt-6 ">
                {/* Basic Pack */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-[#F68F0F] to-orange-400 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden"
                >
                    <div>
                        <div className="uppercase text-white text-xs">Basic</div>
                        <div className="text-2xl font-bold text-white">2000F</div>
                        <div className="text-white text-sm mt-1">Promotion sur whatsapp<br/>Accès au marketplace</div>
                        <div className="mt-3">
                            <button className="bg-orange-500 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-orange-500 transition-colors">Actif</button>
                        </div>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-30">
                        <img src={iconOne} alt="icon" className="size-40" />
                    </div>
                </motion.div>
                {/* Pro Pack */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-r from-[#115CF6] to-blue-600 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden"
                >
                    <div className="w-full">
                        <div className="uppercase text-white text-xs">Pro</div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-bold text-white">5000F</div>
                            <span className="text-orange-300 font-bold text-xs align-top">à vie</span>
                        </div>
                        <ul className="mt-2 mb-2 space-y-1">
                            {proFeatures.map((feature, idx) => (
                                <li key={idx} className="flex items-center text-white text-sm gap-2">
                                    <HiMiniMinusCircle className="text-orange-300 w-4 h-4" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-3">
                            <button className="bg-blue-700 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-blue-800 transition-colors">Mettre à niveau</button>
                        </div>
                    </div>
                    <div className="absolute right-4 bottom-4 opacity-30">
                        <img src={iconTwo} alt="icon" className="size-40" />
                    </div>
                </motion.div>
            </div>
            )}
        </div>
    );
}

export default Abonnement;