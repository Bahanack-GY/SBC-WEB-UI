import { useState, useEffect } from 'react';
import HomeUserCard from "../components/HomeUserCard"
import HomeButtons from "../components/HomeButtons"
import BalanceIcon from "../assets/icon/balance.png"
import { FaBook, FaPhone } from "react-icons/fa";
import HomeBalanceCard from "../components/HomeBalanceCard";
import { FaCartShopping } from "react-icons/fa6";
import Header from '../components/common/Header'
import Skeleton from '../components/common/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import ProtectedRoute from '../components/common/ProtectedRoute';
import PromotionsCarousel from '../components/PromotionsCarousel';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Define interfaces
interface Formation {
  _id: string;
  title: string;
  link: string;
}

interface TransactionStats {
  balance: number;
  [key: string]: unknown;
}

interface ReferralStats {
  totalReferrals: number;
  [key: string]: unknown;
}

interface SubscriptionData {
  status: 'active' | 'expired' | 'cancelled';
  [key: string]: unknown;
}

// Query keys for consistent caching
export const queryKeys = {
  transactionStats: ['transaction-stats'] as const,
  referralStats: ['referral-stats'] as const,
  currentSubscription: ['current-subscription'] as const,
  formations: ['formations'] as const,
};

function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Non abonné');
  const [isFormationsModalOpen, setIsFormationsModalOpen] = useState(false);

  // Static image URLs for the carousel
  const promotionImages = [
    'https://img.freepik.com/premium-photo/technical-price-graph-indicator-red-green-candlestick-chart-blue-theme-screen-market-volatility-up-down-trend-stock-trading-crypto-currency-background_372999-3847.jpg',
    'https://tangem.com/_astro/How_Many_Cryptocurrencies_Are_There_in_February_2025_db69a4d53f_cXX7N.png',
    'https://res.cloudinary.com/people-matters/image/upload/fl_immutable_cache,w_624,h_351,q_auto,f_auto/v1598245577/1598245576.jpg'
  ];

  // Use React Query for API calls with optimized settings
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery<TransactionStats>({
    queryKey: queryKeys.transactionStats,
    queryFn: async () => {
      const response = await sbcApiService.getTransactionStats();
      return handleApiResponse(response);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const { data: referralStats, isLoading: referralLoading, error: referralError } = useQuery<ReferralStats>({
    queryKey: queryKeys.referralStats,
    queryFn: async () => {
      const response = await sbcApiService.getReferralStats();
      return handleApiResponse(response);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<SubscriptionData | null>({
    queryKey: queryKeys.currentSubscription,
    queryFn: async () => {
      try {
        const response = await sbcApiService.getCurrentSubscription();
        return handleApiResponse(response);
      } catch (err) {
        console.warn('Subscription endpoint failed:', err);
        return null;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });
  console.log(subscriptionData);

  const { data: formations, isLoading: formationsLoading, error: formationsError } = useQuery<Formation[]>({
    queryKey: queryKeys.formations,
    queryFn: async () => {
      try {
        const response = await sbcApiService.getFormations();
        return handleApiResponse(response);
      } catch (err) {
        console.error('Failed to fetch formations:', err);
        return [];
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Update subscription status when data changes
  useEffect(() => {
    if (subscriptionData) {
      if (user?.activeSubscriptions && user.activeSubscriptions.length > 0) {
        setSubscriptionStatus('Abonné');
      } else if (subscriptionData.status === 'active') {
        setSubscriptionStatus('Abonné');
      } else {
        setSubscriptionStatus('Non abonné');
      }
    } else if (user?.activeSubscriptions && user.activeSubscriptions.length > 0) {
      setSubscriptionStatus('Abonné');
    }
  }, [subscriptionData, user]);

  const loading = statsLoading || referralLoading || subscriptionLoading || formationsLoading;
  const error = statsError || referralError || formationsError;

  const balance = statsData?.balance || user?.balance || 0;

  const fetchHomeData = () => {
    // Invalidate and refetch all queries
    queryClient.invalidateQueries({ queryKey: queryKeys.transactionStats });
    queryClient.invalidateQueries({ queryKey: queryKeys.referralStats });
    queryClient.invalidateQueries({ queryKey: queryKeys.currentSubscription });
    queryClient.invalidateQueries({ queryKey: queryKeys.formations });
  };

  return (
    <ProtectedRoute>
      <Header />
      <div className="p-4 pb-20 flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton height="h-32" rounded="rounded-2xl" />
            <div className="flex gap-3">
              <Skeleton width="w-20" height="h-20" rounded="rounded-xl" />
              <Skeleton width="w-20" height="h-20" rounded="rounded-xl" />
              <Skeleton width="w-20" height="h-20" rounded="rounded-xl" />
            </div>
            <Skeleton height="h-32" rounded="rounded-2xl" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <p className="text-lg mb-2 text-red-500">Erreur lors du chargement</p>
            <p className="text-sm mb-4">{error instanceof Error ? error.message : 'Une erreur est survenue'}</p>
            <button
              onClick={fetchHomeData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            <HomeUserCard
              name={user ? user.name : "Utilisateur"}
              image={user?.avatarId ? sbcApiService.generateSettingsFileUrl(user.avatarId) : "https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg?w=360"}
              affiliates={referralStats?.totalReferrals || 0}
              status={subscriptionStatus}
              promoCode={user?.referralCode || ""}
            />
            <div className="flex flex-col  gap-4">
              <h2 className="text-2xl font-bold">Nos services</h2>
              <div className="flex justify-between overflow-x-auto gap-4">
                <HomeButtons icon={<FaBook size={30} />} title="Formations" onClick={() => setIsFormationsModalOpen(true)} />
                <HomeButtons icon={<FaCartShopping size={30} />} title="Marketplace" onClick={() => navigate("/marketplace")} />
                <HomeButtons icon={<FaPhone size={30} />} title="Contacts" onClick={() => navigate("/contacts")} />
              </div>
            </div>
            <HomeBalanceCard
              balance={balance}
              icon={<img src={BalanceIcon} alt="Balance" className="size-48" />}
            />
            <h2 className="text-2xl font-bold mt-4">Decouvrez</h2>
            <PromotionsCarousel images={promotionImages} />
          </>
        )}
      </div>

      {/* Formations Modal */}
      <AnimatePresence>
        {isFormationsModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
            >
              <h4 className="text-lg font-bold mb-4">Formations Disponibles</h4>
              {formationsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <FiLoader className="animate-spin text-4xl text-green-700" />
                </div>
              ) : formationsError ? (
                <div className="text-red-500 text-center">
                  Erreur lors du chargement des formations.
                </div>
              ) : formations && formations.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {formations.map((formation) => (
                    <a
                      key={formation._id}
                      href={formation.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-semibold text-blue-700">{formation.title}</p>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  Aucune formation disponible pour le moment.
                </div>
              )}
              <button
                className="w-full mt-6 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                onClick={() => setIsFormationsModalOpen(false)}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ProtectedRoute>
  )
}

export default Home
