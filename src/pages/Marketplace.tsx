import BackButton from "../components/common/BackButton";
import iconGrowth from "../assets/icon/ecommerce.png";
import { useState, useEffect } from "react";
import MarketplaceProductCard from "../components/MarketplaceProductCard";
import Skeleton from '../components/common/Skeleton';
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";

function Marketplace() {
    const [selectedCategory, setSelectedCategory] = useState('Tous');
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1200);
        return () => clearTimeout(timer);
    }, []);

    const menuItems = [
        { label: "Ajouter un produit", action: () => navigate('/ajouter-produit') },
        { label: "Voir mes produits", action: () => navigate('/mes-produits') }
    ];

    return (
        <div className="p-3 h-screen mb-64 bg-white relative">
            <div className="flex items-center">
                <BackButton />
                <h3 className="text-xl font-medium text-center w-full">Marketplace</h3>
            </div>
            {loading ? (
                <div className="flex flex-col gap-4 mt-4">
                    <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-28" rounded="rounded-2xl" />
                    <div className="flex gap-2">
                        <Skeleton width="w-20" height="h-8" rounded="rounded-full" />
                        <Skeleton width="w-20" height="h-8" rounded="rounded-full" />
                        <Skeleton width="w-20" height="h-8" rounded="rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton height="h-60" rounded="rounded-xl" />
                        <Skeleton height="h-60" rounded="rounded-xl" />
                    </div>
                </div>
            ) : (
                <>
                    {/* Search Bar */}
                    <div className="my-4">
                        <input
                            type="text"
                            placeholder="Rechercher un produit ou un service"
                            className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-300 bg-gray-50 text-gray-700"
                        />
                    </div>
                    {/* Clearance Sales Card */}
                    <div className="relative w-full h-28 rounded-2xl bg-[#2ecc40] flex items-center px-5 mb-5 overflow-visible">
                        <div className="flex-1 z-10">
                            <div className="text-white font-bold text-lg">Vendez et achetez des <br /> produits et services</div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-[#d7f6e6] text-green-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                    Offres spéciales
                                </span>
                            </div>
                        </div>
                        <img src={iconGrowth} alt="Ecommerce" className="absolute right-[32px] bottom-0 h-24 w-auto object-contain z-0" />
                    </div>
                    {/* Categories */}
                    <div className="mb-4">
                        <div className="font-semibold text-gray-700 mb-2">Categories</div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {['Tous', 'Services', 'Produits'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-1 rounded-full border text-sm font-medium whitespace-nowrap transition-colors duration-150 ${selectedCategory === cat ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Content based on selected category */}
                    {selectedCategory === 'Tous' && (
                        <>
                          {/* Services Section */}
                          <div className="mb-2 mt-2 text-green-700 font-bold text-base">Services</div>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            {/* Example Service Card */}
                            <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="Service WhatsApp Pro" price={5000} />
                            <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="Design Flyer" price={8000} />
                          </div>
                          {/* Products Section */}
                          <div className="mb-2 mt-2 text-green-700 font-bold text-base">Produits</div>
                          <div className="grid grid-cols-2 gap-4">
                            <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="Glycolic Acid 7% To..." price={12000} />
                            <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="MacBook Air 13" price={25000} />
                          </div>
                        </>
                    )}
                    {selectedCategory === 'Services' && (
                        <div className="grid grid-cols-2 gap-4">
                          <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="Service WhatsApp Pro" price={5000} />
                          <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="Design Flyer" price={8000} />
                        </div>
                    )}
                    {selectedCategory === 'Produits' && (
                        <div className="grid grid-cols-2 gap-4">
                          <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="Glycolic Acid 7% To..." price={12000} />
                          <MarketplaceProductCard image={iconGrowth} brand="Sniper Business Center" name="MacBook Air 13" price={25000} />
                        </div>
                    )}
                </>
            )}
            {!loading && (
                <motion.div 
                    className="fixed bottom-20 right-4 z-50"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <motion.button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="bg-green-600 text-white rounded-full p-4 shadow-lg hover:bg-green-700 transition-colors"
                        whileTap={{ scale: 0.95 }}
                    >
                        <PlusIcon className="w-6 h-6" />
                    </motion.button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{ duration: 0.2 }}
                                className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-2 w-48"
                            >
                                {menuItems.map((item, index) => (
                                    <motion.button
                                        key={index}
                                        onClick={() => {
                                            item.action();
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm"
                                        whileHover={{ x: 5 }}
                                    >
                                        {item.label}
                                    </motion.button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </div>
    )
}

export default Marketplace;
