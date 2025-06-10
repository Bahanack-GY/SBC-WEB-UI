import BackButton from "../components/common/BackButton";
import iconGrowth from "../assets/icon/ecommerce.png";
import { useState, useEffect, useRef } from "react";
import MarketplaceProductCard from "../components/MarketplaceProductCard";
import Skeleton from '../components/common/Skeleton';
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import { useProducts } from '../hooks/useApi';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

function Marketplace() {
    const [selectedCategory, setSelectedCategory] = useState('Tous');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const limit = 10; // Number of items per page
    const navigate = useNavigate();
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<HTMLDivElement | null>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Use the products API hook
    const { data: allProducts, loading, error, refetch } = useProducts({
        search: searchQuery,
        category: selectedCategory === 'Tous' ? undefined : selectedCategory,
        page,
        limit
    });

    // Reset page and products when search/category changes
    useEffect(() => {
        setPage(1);
        setProducts([]);
        setServices([]);
        setHasMore(true);
    }, [searchQuery, selectedCategory]);

    // Handle new data: replace on page 1, append on page > 1
    useEffect(() => {
        const productsFromApi = allProducts?.products || [];
        const productsArray = Array.isArray(productsFromApi) ? productsFromApi : [];
        const productsList = productsArray.filter(
            (item: any) =>
                (item.type && item.type === 'product') ||
                (!item.type && item.category && item.category.toLowerCase() !== 'services')
        );
        const servicesList = productsArray.filter(
            (item: any) =>
                (item.type && item.type === 'service') ||
                (item.category && item.category.toLowerCase() === 'services')
        );

        if (page === 1) {
            setProducts(productsList);
            setServices(servicesList);
        } else {
            setProducts(prev => [...prev, ...productsList]);
            setServices(prev => [...prev, ...servicesList]);
        }
        const pagination = allProducts?.paginationInfo;
        setHasMore(pagination ? (pagination.currentPage < pagination.totalPages) : productsArray.length === limit);
    }, [allProducts]);

    // Infinite scroll: load more when scroll is past 70% of the page
    useEffect(() => {
        if (!hasMore || loading) return;
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const windowHeight = window.innerHeight;
            const docHeight = document.body.scrollHeight;
            const scrollPercent = (scrollY + windowHeight) / docHeight;
            if (scrollPercent > 0.7 && !isFetchingMore) {
                setIsFetchingMore(true);
                setPage((prev) => prev + 1);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasMore, loading, isFetchingMore]);

    // Reset fetching state after data loads
    useEffect(() => {
        if (isFetchingMore && !loading) {
            setIsFetchingMore(false);
        }
    }, [loading, isFetchingMore]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        // Debounce search to avoid too many API calls
        const timeoutId = setTimeout(() => {
            refetch();
        }, 500);
        return () => clearTimeout(timeoutId);
    };

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    const menuItems = [
        { label: "Ajouter un produit", action: () => navigate('/ajouter-produit') },
        { label: "Voir mes produits", action: () => navigate('/mes-produits') }
    ];

    const initialLoading = loading && page === 1;
    return (
        <div className="p-3  bg-white relative pb-20">
            <div className="flex items-center">
                {/* <BackButton /> */}
                <h3 className="text-xl font-medium text-center w-full">Marketplace</h3>
            </div>
            {/* Search Bar */}
            <div className="my-4">
                <input
                    type="text"
                    placeholder="Rechercher un produit ou un service"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
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
            {/* Loading Skeleton after categories */}
            {initialLoading ? (
                <div className="flex flex-col gap-4 mt-4">
                    {/* <Skeleton height="h-10" rounded="rounded-xl" />
                    <Skeleton height="h-28" rounded="rounded-2xl" />
                    <div className="flex gap-2">
                        <Skeleton width="w-20" height="h-8" rounded="rounded-full" />
                        <Skeleton width="w-20" height="h-8" rounded="rounded-full" />
                        <Skeleton width="w-20" height="h-8" rounded="rounded-full" />
                    </div> */}
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton height="h-60" rounded="rounded-xl" />
                        <Skeleton height="h-60" rounded="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton height="h-60" rounded="rounded-xl" />
                        <Skeleton height="h-60" rounded="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton height="h-60" rounded="rounded-xl" />
                        <Skeleton height="h-60" rounded="rounded-xl" />
                    </div>
                </div>
            ) : (
                <>
                    {/* Error State */}
                    {error && (
                        <div className="text-center py-8">
                            <div className="text-red-500 mb-2">Erreur lors du chargement</div>
                            <button
                                onClick={() => refetch()}
                                className="text-blue-600 underline"
                            >
                                Réessayer
                            </button>
                        </div>
                    )}

                    {/* Content based on selected category */}
                    {!error && (
                        <>
                            {selectedCategory === 'Tous' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[...services, ...products].map((item: any) => (
                                            <div key={item.id || item._id} onClick={() => navigate(`/single-product/${item.id || item._id}`)} className="cursor-pointer">
                                                <MarketplaceProductCard
                                                    image={item.images?.[0]?.fileId ? sbcApiService.generateSettingsFileUrl(item.images[0].fileId) : iconGrowth}
                                                    brand={item.seller?.name || (item.category && item.category.toLowerCase() === 'services' ? 'Service SBC' : 'Produit SBC')}
                                                    name={item.name}
                                                    price={item.price}
                                                    whatsappLink={item.whatsappLink}
                                                    productId={item.id || item._id}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {hasMore && (
                                        <div ref={observerRef} className="block mt-8 mb-4 w-full flex justify-center items-center min-h-[48px]">
                                            {isFetchingMore && (
                                                <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                </svg>
                                            )}
                                        </div>
                                    )}
                                    {/* No results */}
                                    {services.length === 0 && products.length === 0 && !loading && (
                                        <div className="text-center py-8 text-gray-500">
                                            Aucun produit ou service trouvé
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedCategory === 'Services' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {services.length > 0 ? (
                                        services.map((service: any) => (
                                            <div key={service.id} onClick={() => navigate(`/single-product/${service.id || service._id}`)} className="cursor-pointer">
                                                <MarketplaceProductCard
                                                    image={service.images?.[0]?.fileId ? sbcApiService.generateSettingsFileUrl(service.images[0].fileId) : iconGrowth}
                                                    brand={service.seller?.name || "SBC"}
                                                    name={service.name}
                                                    price={service.price}
                                                    whatsappLink={service.whatsappLink}
                                                    productId={service.id || service._id}
                                                />
                                            </div>
                                        ))
                                    ) : !loading && (
                                        <div className="col-span-2 text-center py-8 text-gray-500">
                                            Aucun service trouvé
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedCategory === 'Produits' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {products.length > 0 ? (
                                        <>
                                            {products.map((product: any) => (
                                                <div key={product.id} onClick={() => navigate(`/single-product/${product.id || product._id}`)} className="cursor-pointer">
                                                    <MarketplaceProductCard
                                                        image={product.images?.[0]?.fileId ? sbcApiService.generateSettingsFileUrl(product.images[0].fileId) : iconGrowth}
                                                        brand={product.seller?.name || "SBC"}
                                                        name={product.name}
                                                        price={product.price}
                                                        whatsappLink={product.whatsappLink}
                                                        productId={product.id || product._id}
                                                    />
                                                </div>
                                            ))}
                                            {hasMore && (
                                                <div ref={observerRef} className="col-span-2 block mt-8 mb-4 w-full flex justify-center items-center min-h-[48px]">
                                                    {isFetchingMore && (
                                                        <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : !loading && (
                                        <div className="col-span-2 text-center py-8 text-gray-500">
                                            Aucun produit trouvé
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
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
