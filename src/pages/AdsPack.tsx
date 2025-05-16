import  { useState, useEffect } from 'react';
import BackButton from "../components/common/BackButton";
import { motion } from "framer-motion";
import iconOne from "../assets/icon/Growth.png";
import iconTwo from "../assets/icon/analyse.png";
import iconThree from "../assets/icon/contact.png";
import Skeleton from '../components/common/Skeleton';

function AdsPack() {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="p-3 h-screen mb-36">
            {loading ? (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Skeleton width="w-10" height="h-10" rounded="rounded-xl" />
                        <Skeleton width="w-40" height="h-8" rounded="rounded-xl" />
                    </div>
                    <Skeleton height="h-28" rounded="rounded-2xl" />
                    <Skeleton height="h-28" rounded="rounded-2xl" />
                    <Skeleton height="h-28" rounded="rounded-2xl" />
                </div>
            ) : (
                <>
                    <div className="flex items-center">
                        <BackButton />
                        <h3 className="text-xl font-medium text-center w-full">Offres publicitaires</h3>
                    </div>
                    
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
                                <div className="text-2xl font-bold text-white">2000F/mo</div>
                                <div className="text-white text-sm mt-1">Promotion sur whatsapp<br/>Accès au marketplace</div>
                                <div className="mt-3">
                                    <button className="bg-orange-500 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-orange-500 transition-colors">Je souscris</button>
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
                            <div>
                                <div className="uppercase text-white text-xs">Up to</div>
                                <div className="text-2xl font-bold text-white">5000F/mo</div>
                                <div className="text-white text-sm mt-1">Promotion sur whatsapp<br/>Accès au marketplace</div>
                                <div className="mt-3">
                                    <button className="bg-blue-700 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-blue-800 transition-colors">Je souscris</button>
                                </div>
                            </div>
                            <div className="absolute right-4 bottom-4 opacity-30">
                                <img src={iconTwo} alt="icon" className="size-40" />
                            </div>
                        </motion.div>
                        {/* Gold Pack */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-r from-[#94B027] to-green-600 rounded-2xl p-5 flex items-center justify-between shadow-lg relative overflow-hidden"
                        >
                            <div>
                                <div className="uppercase text-white text-xs">Up to</div>
                                <div className="text-2xl font-bold text-white">10000F/mo</div>
                                <div className="text-white text-sm mt-1">Promotion sur whatsapp<br/>Accès au marketplace<br/>Promotion sur Facebook<br/>Design de flyer</div>
                                <div className="mt-3">
                                    <button className="bg-green-700 text-white rounded-xl px-4 py-2 font-bold shadow hover:bg-green-700 transition-colors">Je souscris</button>
                                </div>
                            </div>
                            <div className="absolute right-4 bottom-4 opacity-30">
                                <img src={iconThree} alt="icon" className="size-40" />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </div>
    )
}   

export default AdsPack;
