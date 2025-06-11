import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon } from "@heroicons/react/24/solid";
import ecommerceIcon from '../assets/icon/Ecommerce.png';
import MarketplaceProductCard from "../components/MarketplaceProductCard";
import Skeleton from '../components/common/Skeleton';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import BackButton from "../components/common/BackButton";

// Define interfaces
interface MarketplaceItem {
    _id: string;
    id?: string;
    name: string;
    price: number;
    type?: 'product' | 'service';
    category?: string;
    seller?: {
        name: string;
    };
    images?: Array<{
        fileId: string;
        url?: string;
    }>;
    whatsappLink?: string;
}

interface PaginatedResponse {
    products: MarketplaceItem[];
    paginationInfo: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
    };
}

// Query keys for consistent caching
const queryKeys = {
    marketplace: (category: string, search: string, page: number) =>
        ['marketplace', category, search, page] as const,
};

function Marketplace() {
    const [selectedCategory, setSelectedCategory] = useState('Tous');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [allProducts, setAllProducts] = useState<MarketplaceItem[]>([]);
    const [allServices, setAllServices] = useState<MarketplaceItem[]>([]);
    const [loadedItemIds, setLoadedItemIds] = useState<Set<string>>(new Set());
    const limit = 10; // Number of items per page
    const navigate = useNavigate();
    const [lastItemRef, setLastItemRef] = useState<HTMLDivElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadingRef = useRef<HTMLDivElement>(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Use React Query for API calls with optimized settings
    const { data, isLoading, error, refetch } = useQuery<PaginatedResponse>({
        queryKey: queryKeys.marketplace(
            selectedCategory === 'Tous' ? '' : selectedCategory,
            searchQuery,
            page
        ),
        queryFn: async () => {
            const response = await sbcApiService.getProducts({
                search: searchQuery,
                category: selectedCategory === 'Tous' ? undefined : selectedCategory,
                page,
                limit
            });
            return handleApiResponse(response) as PaginatedResponse;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 2,
    });

    // Reset page and products when search/category changes
    useEffect(() => {
        setPage(1);
        setAllProducts([]);
        setAllServices([]);
        setLoadedItemIds(new Set());
        setHasMore(true);
    }, [searchQuery, selectedCategory]);

    // Setup intersection observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
                    setIsFetchingMore(true);
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        observerRef.current = observer;

        if (lastItemRef) {
            observer.observe(lastItemRef);
        }

        return () => {
            observer.disconnect();
        };
    }, [lastItemRef, hasMore, isFetchingMore]);

    // Update products and services when new data arrives
    useEffect(() => {
        if (data?.products) {
            // Filter out duplicates using the loadedItemIds Set
            const newItems = data.products.filter(item => !loadedItemIds.has(item._id));
            
            // Add new item IDs to the Set
            const newIds = new Set(newItems.map(item => item._id));
            setLoadedItemIds(prev => new Set([...prev, ...newIds]));

            const newProducts = newItems.filter((item: MarketplaceItem) =>
                (item.type === 'product') ||
                (!item.type && item.category?.toLowerCase() !== 'services')
            );
            const newServices = newItems.filter((item: MarketplaceItem) =>
                (item.type === 'service') ||
                (item.category?.toLowerCase() === 'services')
            );

            if (page === 1) {
                setAllProducts(newProducts);
                setAllServices(newServices);
            } else {
                setAllProducts(prev => [...prev, ...newProducts]);
                setAllServices(prev => [...prev, ...newServices]);
            }

            setHasMore(data.paginationInfo.currentPage < data.paginationInfo.totalPages);
        }
    }, [data, page]);

    // Reset fetching state after data loads
    useEffect(() => {
        if (isFetchingMore && !isLoading) {
            setIsFetchingMore(false);
        }
    }, [isLoading, isFetchingMore]);

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        // Debounce search to avoid too many API calls
        const timeoutId = setTimeout(() => {
            refetch();
        }, 500);
        return () => clearTimeout(timeoutId);
    };

    const menuItems = [
        { label: "Ajouter un produit", action: () => navigate('/ajouter-produit') },
        { label: "Voir mes produits", action: () => navigate('/mes-produits') }
    ];

    const initialLoading = isLoading && page === 1;

    return (
        <div className="p-3 bg-white relative pb-20">
            <div className="flex items-center">
                <BackButton />
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
                <img src={ecommerceIcon} alt="Ecommerce" className="absolute right-[32px] bottom-0 h-24 w-auto object-contain z-0" />
            </div>

            {/* Categories */}
            <div className="mb-4">
                <div className="font-semibold text-gray-700 mb-2">Categories</div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {['Tous', 'Services', 'Produits'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1 rounded-full border text-sm font-medium whitespace-nowrap transition-colors duration-150 ${selectedCategory === cat
                                ? 'bg-green-700 text-white border-green-700'
                                : 'bg-white text-gray-700 border-gray-300'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading Skeleton */}
            {initialLoading ? (
                <div className="flex flex-col gap-4 mt-4">
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
                                        {[...allServices, ...allProducts].map((item, index, array) => (
                                            <div
                                                key={item._id}
                                                ref={index === array.length - 1 ? setLastItemRef : null}
                                                onClick={() => navigate(`/single-product/${item._id}`)}
                                                className="cursor-pointer"
                                            >
                                                <MarketplaceProductCard
                                                    image={item.images?.[0]?.fileId
                                                        ? sbcApiService.generateSettingsFileUrl(item.images[0].fileId)
                                                        : ecommerceIcon}
                                                    brand={item.seller?.name || "SBC"}
                                                    name={item.name}
                                                    price={item.price}
                                                    whatsappLink={item.whatsappLink}
                                                    productId={item._id}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    {isFetchingMore && (
                                        <div className="flex justify-center items-center py-4">
                                            <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                            </svg>
                                        </div>
                                    )}
                                    {/* No results */}
                                    {allServices.length === 0 && allProducts.length === 0 && !isLoading && (
                                        <div className="text-center py-8 text-gray-500">
                                            Aucun produit ou service trouvé
                                        </div>
                                    )}
                                </>
                            )}

                            {selectedCategory === 'Services' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {allServices.length > 0 ? (
                                        allServices.map((service) => (
                                            <div
                                                key={service._id}
                                                onClick={() => navigate(`/single-product/${service._id}`)}
                                                className="cursor-pointer"
                                            >
                                                <MarketplaceProductCard
                                                    image={service.images?.[0]?.fileId
                                                        ? sbcApiService.generateSettingsFileUrl(service.images[0].fileId)
                                                        : ecommerceIcon}
                                                    brand={service.seller?.name || "SBC"}
                                                    name={service.name}
                                                    price={service.price}
                                                    whatsappLink={service.whatsappLink}
                                                    productId={service._id}
                                                />
                                            </div>
                                        ))
                                    ) : !isLoading && (
                                        <div className="col-span-2 text-center py-8 text-gray-500">
                                            Aucun service trouvé
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedCategory === 'Produits' && (
                                <div className="grid grid-cols-2 gap-4">
                                    {allProducts.length > 0 ? (
                                        <>
                                            {allProducts.map((product) => (
                                                <div
                                                    key={product._id}
                                                    onClick={() => navigate(`/single-product/${product._id}`)}
                                                    className="cursor-pointer"
                                                >
                                                    <MarketplaceProductCard
                                                        image={product.images?.[0]?.fileId
                                                            ? sbcApiService.generateSettingsFileUrl(product.images[0].fileId)
                                                            : ecommerceIcon}
                                                        brand={product.seller?.name || "SBC"}
                                                        name={product.name}
                                                        price={product.price}
                                                        whatsappLink={product.whatsappLink}
                                                        productId={product._id}
                                                    />
                                                </div>
                                            ))}
                                            {hasMore && (
                                                <div ref={loadingRef} className="col-span-2 block mt-8 mb-4 w-full flex justify-center items-center min-h-[48px]">
                                                    {isFetchingMore && (
                                                        <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    ) : !isLoading && (
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

            {/* Floating Action Button */}
            {!isLoading && (
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
    );
}

export default Marketplace;
