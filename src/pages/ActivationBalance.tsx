import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Skeleton from '../components/common/Skeleton';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { FaWallet, FaUsers, FaGift, FaHistory, FaArrowRight, FaSearch, FaTimes, FaUserPlus, FaExchangeAlt, FaCheck, FaSpinner } from 'react-icons/fa';

// Types
interface ActivationReferral {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  referralLevel: 1 | 2 | 3;
  hasActiveSubscription: boolean;
  currentSubscriptionType: 'CLASSIQUE' | 'CIBLE' | null;
  canUpgrade: boolean;
  createdAt: string;
}

interface ActivationTransaction {
  _id: string;
  type: 'activation_transfer_in' | 'activation_transfer_out' | 'sponsor_activation';
  amount: number;
  description?: string;
  status: string;
  createdAt: string;
  metadata?: {
    beneficiaryId?: string;
    beneficiaryName?: string;
    beneficiaryEmail?: string;
    subscriptionType?: string;
    recipientId?: string;
    recipientName?: string;
    recipientEmail?: string;
  };
}

interface ActivationPricing {
  CLASSIQUE: number;
  CIBLE: number;
  UPGRADE: number;
}

type FilterType = 'all' | 'activatable' | 'upgradable';
type SubscriptionType = 'CLASSIQUE' | 'CIBLE' | 'UPGRADE';

function ActivationBalance() {
  const { user, refreshUser } = useAuth();

  // Check if user is admin or tester
  const isAdminOrTester = user?.role === 'admin' || user?.role === 'tester';

  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'history'>('overview');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal states
  const [showFundModal, setShowFundModal] = useState(false);
  const [showP2PModal, setShowP2PModal] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ActivationReferral | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query: Get activation balance summary
  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery({
    queryKey: ['activation-balance'],
    queryFn: async () => {
      const response = await sbcApiService.getActivationBalance();
      return handleApiResponse(response);
    },
    staleTime: 30000,
  });

  // Query: Get pricing
  const { data: pricingData } = useQuery({
    queryKey: ['activation-pricing'],
    queryFn: async () => {
      const response = await sbcApiService.getActivationPricing();
      return handleApiResponse(response);
    },
    staleTime: 60000 * 5, // Cache for 5 minutes
  });

  // Query: Get referrals with infinite scroll
  const {
    data: referralsData,
    isLoading: referralsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchReferrals,
  } = useInfiniteQuery({
    queryKey: ['activation-referrals', filter, debouncedSearch],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await sbcApiService.getActivationReferrals(filter, pageParam, 20);
      return handleApiResponse(response);
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      return currentPage < lastPage.pages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: activeTab === 'referrals',
  });

  // Query: Get activation transaction history (all activation balance transactions)
  const {
    data: historyData,
    isLoading: historyLoading,
    fetchNextPage: fetchNextHistoryPage,
    hasNextPage: hasNextHistoryPage,
    isFetchingNextPage: isFetchingNextHistoryPage,
  } = useInfiniteQuery({
    queryKey: ['activation-transaction-history'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await sbcApiService.getActivationTransactionHistory(pageParam, 20);
      // Don't use handleApiResponse here as it only returns the transactions array
      // We need the full response body including pagination
      if (!response.isSuccessByStatusCode) {
        throw new Error(response.body?.message || response.message || 'Failed to fetch history');
      }
      return response.body;
    },
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = lastPage?.pagination?.totalPages || lastPage?.totalPages || lastPage?.pages || 1;
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: activeTab === 'history',
  });

  // Intersection observer for infinite scroll
  const lastReferralRef = useRef<HTMLDivElement>(null);
  const lastHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (lastReferralRef.current) {
      observer.observe(lastReferralRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, referralsData]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextHistoryPage && !isFetchingNextHistoryPage) {
          fetchNextHistoryPage();
        }
      },
      { threshold: 0.1 }
    );

    if (lastHistoryRef.current) {
      observer.observe(lastHistoryRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextHistoryPage, isFetchingNextHistoryPage, fetchNextHistoryPage, historyData]);

  const pricing: ActivationPricing = pricingData?.pricing || { CLASSIQUE: 2150, CIBLE: 5300, UPGRADE: 3150 };
  const minimumTransfer = pricingData?.minimumTransfers?.toActivation || 100;
  const activationBalance = balanceData?.activationBalance || 0;
  const totalSponsored = balanceData?.totalSponsored || 0;
  const sponsoredCount = balanceData?.sponsoredCount || 0;
  const mainBalance = user?.balance || 0;

  const allReferrals: ActivationReferral[] = referralsData?.pages?.flatMap(page => page.referrals) || [];
  const allHistory: ActivationTransaction[] = historyData?.pages?.flatMap(page => page.transactions || page.activations || []) || [];

  // Filter referrals by search
  const filteredReferrals = debouncedSearch
    ? allReferrals.filter(r =>
      r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
    : allReferrals;

  const handleSponsorClick = (referral: ActivationReferral) => {
    setSelectedReferral(referral);
    setShowSponsorModal(true);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchBalance(), refetchReferrals(), refreshUser()]);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 relative">
        {/* Teaser overlay for non-admin/tester users */}
        {!isAdminOrTester && (
          <>
            {/* Blur overlay */}
            <div className="absolute inset-0 z-40 backdrop-blur-md bg-white/30" />

            {/* Teaser message - centered */}
            <div className="absolute inset-0 z-50 flex items-center justify-center px-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 max-w-md text-center shadow-xl border border-white/50"
              >
                <div className="text-6xl mb-4">🎁</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Bientôt disponible !
                </h2>
                <p className="text-gray-600 mb-6">
                  La fonctionnalité Solde d'Activation sera disponible très prochainement.
                  Sponsorisez vos filleuls et aidez-les à rejoindre la communauté.
                </p>
                <div className="bg-white rounded-xl p-4 mb-6">
                  <p className="text-sm text-gray-500 mb-2">Fonctionnalités à venir :</p>
                  <ul className="text-left text-sm text-gray-700 space-y-1">
                    <li>✅ Alimenter votre solde d'activation</li>
                    <li>✅ Sponsoriser vos filleuls (niveaux 1, 2 et 3)</li>
                    <li>✅ Transférer du solde à d'autres utilisateurs</li>
                    <li>✅ Historique des activations</li>
                  </ul>
                </div>
                <button
                  onClick={() => window.history.back()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Retour
                </button>
              </motion.div>
            </div>
          </>
        )}

        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="p-4 flex items-center">
            <BackButton />
            <h3 className="text-xl font-semibold text-center w-full text-gray-900">Solde d'Activation</h3>
          </div>
        </div>

        <div className="p-4">
          {/* Balance Card - Blue Primary */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm opacity-80">Solde d'Activation</h4>
                {balanceLoading ? (
                  <Skeleton width="w-32" height="h-8" className="bg-white/20" />
                ) : (
                  <p className="text-3xl font-bold">{activationBalance.toLocaleString('fr-FR')} F</p>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <FaGift size={28} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-xs opacity-70">Total sponsorisé</p>
                <p className="text-lg font-semibold">{totalSponsored.toLocaleString('fr-FR')} F</p>
              </div>
              <div>
                <p className="text-xs opacity-70">Filleuls sponsorisés</p>
                <p className="text-lg font-semibold">{sponsoredCount}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions - Green secondary, Orange tertiary */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setShowFundModal(true)}
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl shadow transition-colors"
            >
              <FaWallet size={18} />
              <span className="font-medium">Alimenter</span>
            </button>
            <button
              onClick={() => setShowP2PModal(true)}
              className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl shadow transition-colors"
            >
              <FaExchangeAlt size={18} />
              <span className="font-medium">Transférer</span>
            </button>
          </div>

          {/* Pricing Info */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <h4 className="font-semibold text-gray-800 mb-3">Tarifs d'activation</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">CLASSIQUE</span>
                <span className="font-semibold text-gray-900">{pricing.CLASSIQUE.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">CIBLE</span>
                <span className="font-semibold text-gray-900">{pricing.CIBLE.toLocaleString('fr-FR')} F</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">UPGRADE (CLASSIQUE → CIBLE)</span>
                <span className="font-semibold text-gray-900">{pricing.UPGRADE.toLocaleString('fr-FR')} F</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-200 rounded-xl p-1 mb-4">
            {[
              { key: 'overview', label: 'Aperçu', icon: FaWallet },
              { key: 'referrals', label: 'Filleuls', icon: FaUsers },
              { key: 'history', label: 'Historique', icon: FaHistory },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key
                  ? 'bg-white text-[#115CF6] shadow'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Info Cards */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <h5 className="font-semibold text-blue-800 mb-2">💡 À quoi sert le solde d'activation ?</h5>
                  <p className="text-sm text-blue-700">
                    Le solde d'activation vous permet de payer l'abonnement de vos filleuls (niveaux 1, 2 et 3).
                    C'est un excellent moyen d'aider votre réseau à démarrer !
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                  <h5 className="font-semibold text-yellow-800 mb-2">⚠️ Important</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Le solde d'activation ne peut pas être retiré</li>
                    <li>• Il ne peut être utilisé que pour sponsoriser vos filleuls</li>
                    <li>• Les commissions vont aux parrains du bénéficiaire</li>
                    <li>• Transfert minimum : {minimumTransfer.toLocaleString('fr-FR')} F</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h5 className="font-semibold text-green-800 mb-2">✅ Avantages</h5>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Aidez vos filleuls à rejoindre la communauté</li>
                    <li>• Renforcez votre réseau de parrainage</li>
                    <li>• Transférez du solde d'activation à d'autres utilisateurs</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'referrals' && (
              <motion.div
                key="referrals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Search & Filter */}
                <div className="mb-4 space-y-3">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un filleul..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                      { key: 'all', label: 'Tous' },
                      { key: 'activatable', label: 'À activer' },
                      { key: 'upgradable', label: 'À upgrader' },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key as FilterType)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f.key
                          ? 'bg-[#115CF6] text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Referrals List */}
                {referralsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} height="h-20" className="rounded-xl" />
                    ))}
                  </div>
                ) : filteredReferrals.length === 0 ? (
                  <div className="text-center py-12">
                    <FaUsers className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500">
                      {filter === 'all'
                        ? 'Aucun filleul trouvé'
                        : filter === 'activatable'
                          ? 'Aucun filleul à activer'
                          : 'Aucun filleul à upgrader'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredReferrals.map((referral, index) => (
                      <div
                        key={referral._id}
                        ref={index === filteredReferrals.length - 1 ? lastReferralRef : null}
                        className="bg-white rounded-xl p-4 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {referral.avatar ? (
                              <img src={referral.avatar} alt={referral.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              referral.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{referral.name}</p>
                            <p className="text-sm text-gray-500 truncate">{referral.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${referral.referralLevel === 1
                                ? 'bg-blue-100 text-blue-700'
                                : referral.referralLevel === 2
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                                }`}>
                                Niveau {referral.referralLevel}
                              </span>
                              {referral.currentSubscriptionType && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                  {referral.currentSubscriptionType}
                                </span>
                              )}
                            </div>
                          </div>
                          {!referral.hasActiveSubscription ? (
                            <button
                              onClick={() => handleSponsorClick(referral)}
                              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            >
                              <FaUserPlus size={14} />
                              Activer
                            </button>
                          ) : referral.canUpgrade ? (
                            <button
                              onClick={() => handleSponsorClick(referral)}
                              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                            >
                              <FaArrowRight size={14} />
                              Upgrade
                            </button>
                          ) : (
                            <span className="text-[#115CF6] text-sm font-medium flex items-center gap-1">
                              <FaCheck size={14} />
                              Actif
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {isFetchingNextPage && (
                      <div className="flex justify-center py-4">
                        <FaSpinner className="animate-spin text-amber-500" size={24} />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {historyLoading ? (
                  <div className="bg-[#192040] rounded-2xl p-4">
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} height="h-[60px]" className="rounded-lg bg-white/10" />
                      ))}
                    </div>
                  </div>
                ) : allHistory.length === 0 ? (
                  <div className="bg-[#192040] rounded-2xl p-8 text-center">
                    <FaHistory className="mx-auto text-gray-500 mb-4" size={48} />
                    <p className="text-gray-400">Aucun historique d'activation</p>
                  </div>
                ) : (
                  <div className="bg-[#192040] rounded-2xl p-4 shadow">
                    <div className="font-semibold mb-3 text-white">Historique des transactions</div>
                    {allHistory.map((item, index) => {
                      // Determine display based on transaction type
                      const getTransactionDisplay = () => {
                        switch (item.type) {
                          case 'activation_transfer_in':
                            return {
                              title: 'Alimentation du solde',
                              subtitle: 'Transfert depuis le solde principal',
                              icon: '💰',
                              iconBgClass: 'bg-green-100',
                              iconTextClass: 'text-green-700',
                              amountClass: 'text-green-400',
                              amountPrefix: '+',
                              titleClass: 'text-white',
                            };
                          case 'activation_transfer_out':
                            return {
                              title: item.metadata?.recipientName || 'Transfert P2P',
                              subtitle: item.metadata?.recipientEmail || 'Transfert vers un autre utilisateur',
                              icon: '💸',
                              iconBgClass: 'bg-orange-100',
                              iconTextClass: 'text-orange-700',
                              amountClass: 'text-red-400',
                              amountPrefix: '-',
                              titleClass: 'text-white',
                            };
                          case 'sponsor_activation':
                            return {
                              title: item.metadata?.beneficiaryName || 'Sponsoring',
                              subtitle: item.metadata?.subscriptionType || item.description || 'Activation sponsorisée',
                              icon: '🎁',
                              iconBgClass: item.metadata?.subscriptionType === 'UPGRADE'
                                ? 'bg-orange-100'
                                : item.metadata?.subscriptionType === 'CIBLE'
                                  ? 'bg-blue-100'
                                  : 'bg-green-100',
                              iconTextClass: 'text-blue-700',
                              amountClass: 'text-orange-400',
                              amountPrefix: '-',
                              titleClass: 'text-white',
                            };
                          default:
                            return {
                              title: item.description || 'Transaction',
                              subtitle: '',
                              icon: '💼',
                              iconBgClass: 'bg-gray-100',
                              iconTextClass: 'text-gray-700',
                              amountClass: 'text-gray-400',
                              amountPrefix: '',
                              titleClass: 'text-white',
                            };
                        }
                      };

                      const display = getTransactionDisplay();
                      const formattedDate = new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div
                          key={item._id}
                          ref={index === allHistory.length - 1 ? lastHistoryRef : null}
                          className="flex items-center justify-between py-3 border-b border-white/10 last:border-b-0 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`flex items-center justify-center size-10 rounded-full ${display.iconBgClass}`}>
                              <span className="text-xl">{display.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className={`font-bold text-sm truncate max-w-[160px] ${display.titleClass}`}>
                                {display.title}
                              </div>
                              <div className="text-xs text-gray-400">{formattedDate}</div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className={`font-bold text-sm ${display.amountClass}`}>
                              {display.amountPrefix}{item.amount.toLocaleString('fr-FR')} F
                            </div>
                            {display.subtitle && (
                              <div className="text-xs text-gray-500 truncate max-w-[100px]">
                                {display.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {isFetchingNextHistoryPage && (
                      <div className="flex justify-center py-4">
                        <FaSpinner className="animate-spin text-blue-400" size={24} />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fund Activation Modal */}
        <FundActivationModal
          isOpen={showFundModal}
          onClose={() => setShowFundModal(false)}
          mainBalance={mainBalance}
          minimumAmount={minimumTransfer}
          onSuccess={handleRefreshAll}
        />

        {/* P2P Transfer Modal */}
        <P2PTransferModal
          isOpen={showP2PModal}
          onClose={() => setShowP2PModal(false)}
          activationBalance={activationBalance}
          minimumAmount={minimumTransfer}
          onSuccess={handleRefreshAll}
        />

        {/* Sponsor Confirmation Modal */}
        <SponsorConfirmationModal
          isOpen={showSponsorModal}
          onClose={() => {
            setShowSponsorModal(false);
            setSelectedReferral(null);
          }}
          referral={selectedReferral}
          pricing={pricing}
          activationBalance={activationBalance}
          onSuccess={handleRefreshAll}
        />
      </div>
    </ProtectedRoute>
  );
}

// ==================== FUND ACTIVATION MODAL ====================
interface FundModalProps {
  isOpen: boolean;
  onClose: () => void;
  mainBalance: number;
  minimumAmount: number;
  onSuccess: () => void;
}

function FundActivationModal({ isOpen, onClose, mainBalance, minimumAmount, onSuccess }: FundModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum < minimumAmount) {
      setError(`Le montant minimum est de ${minimumAmount.toLocaleString('fr-FR')} F`);
      return;
    }
    if (amountNum > mainBalance) {
      setError('Solde principal insuffisant');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await sbcApiService.transferToActivationBalance(amountNum);
      handleApiResponse(response);
      setSuccess(true);
      onSuccess();
      setTimeout(() => {
        onClose();
        setAmount('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 w-[90vw] max-w-md shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="text-green-600" size={32} />
            </div>
            <h4 className="text-xl font-bold text-green-600 mb-2">Transfert réussi !</h4>
            <p className="text-gray-600">Votre solde d'activation a été alimenté.</p>
          </div>
        ) : (
          <>
            <h4 className="text-xl font-bold text-gray-900 mb-4">Alimenter le solde d'activation</h4>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Solde principal disponible</p>
              <p className="text-2xl font-bold text-gray-900">{mainBalance.toLocaleString('fr-FR')} F</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant à transférer (min. {minimumAmount.toLocaleString('fr-FR')} F)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="Ex: 5000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-yellow-700">
                ⚠️ Ce transfert est irréversible. Le solde d'activation ne peut pas être retiré.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !amount}
                className="flex-1 bg-[#115CF6] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : 'Transférer'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ==================== P2P TRANSFER MODAL ====================
interface SearchUser {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
}

interface P2PModalProps {
  isOpen: boolean;
  onClose: () => void;
  activationBalance: number;
  minimumAmount: number;
  onSuccess: () => void;
}

function P2PTransferModal({ isOpen, onClose, activationBalance, minimumAmount, onSuccess }: P2PModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search users when debounced query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (debouncedSearch.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const response = await sbcApiService.searchContacts({ search: debouncedSearch, limit: 3 });
        if (response.isSuccessByStatusCode && response.body) {
          const users = response.body.contacts || response.body.users || response.body.data || [];
          setSearchResults(users.slice(0, 3));
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    searchUsers();
  }, [debouncedSearch]);

  const handleSelectUser = (user: SearchUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setError('');
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      setError('Veuillez sélectionner un destinataire');
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum < minimumAmount) {
      setError(`Le montant minimum est de ${minimumAmount.toLocaleString('fr-FR')} F`);
      return;
    }
    if (amountNum > activationBalance) {
      setError('Solde d\'activation insuffisant');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use user ID as recipient identifier
      const response = await sbcApiService.transferActivationBalanceToUser(selectedUser._id, amountNum);
      handleApiResponse(response);
      setSuccess(true);
      onSuccess();
      setTimeout(() => {
        onClose();
        setSelectedUser(null);
        setSearchQuery('');
        setAmount('');
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUser(null);
    setSearchQuery('');
    setSearchResults([]);
    setAmount('');
    setError('');
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 w-[90vw] max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="text-green-600" size={32} />
            </div>
            <h4 className="text-xl font-bold text-green-600 mb-2">Transfert réussi !</h4>
            <p className="text-gray-600">Le solde d'activation a été transféré.</p>
          </div>
        ) : (
          <>
            <h4 className="text-xl font-bold text-gray-900 mb-4">Transférer du solde d'activation</h4>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600">Solde d'activation disponible</p>
              <p className="text-2xl font-bold text-[#115CF6]">{activationBalance.toLocaleString('fr-FR')} F</p>
            </div>

            {/* Selected User Display */}
            {selectedUser ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinataire sélectionné
                </label>
                <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      selectedUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{selectedUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={handleClearSelection}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FaTimes size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechercher un destinataire
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setError('');
                    }}
                    placeholder="Nom, email ou téléphone..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {searching && (
                    <FaSpinner className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                    {searchResults.map((user) => (
                      <button
                        key={user._id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="mt-2 text-sm text-gray-500 text-center">Aucun utilisateur trouvé</p>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant (min. {minimumAmount.toLocaleString('fr-FR')} F)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="Ex: 2000"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedUser || !amount}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : 'Transférer'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ==================== SPONSOR CONFIRMATION MODAL ====================
interface SponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  referral: ActivationReferral | null;
  pricing: ActivationPricing;
  activationBalance: number;
  onSuccess: () => void;
}

function SponsorConfirmationModal({ isOpen, onClose, referral, pricing, activationBalance, onSuccess }: SponsorModalProps) {
  const [selectedType, setSelectedType] = useState<SubscriptionType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Determine available subscription types
  const getAvailableTypes = (): { type: SubscriptionType; price: number; label: string }[] => {
    if (!referral) return [];

    if (referral.canUpgrade) {
      return [{ type: 'UPGRADE', price: pricing.UPGRADE, label: 'Upgrade vers CIBLE' }];
    }

    if (!referral.hasActiveSubscription) {
      return [
        { type: 'CLASSIQUE', price: pricing.CLASSIQUE, label: 'Abonnement CLASSIQUE' },
        { type: 'CIBLE', price: pricing.CIBLE, label: 'Abonnement CIBLE' },
      ];
    }

    return [];
  };

  const availableTypes = getAvailableTypes();
  const selectedPrice = selectedType ? pricing[selectedType] : 0;
  const canAfford = activationBalance >= selectedPrice;

  const handleSubmit = async () => {
    if (!referral || !selectedType) return;

    if (!canAfford) {
      setError('Solde d\'activation insuffisant');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await sbcApiService.sponsorReferralActivation(referral._id, selectedType);
      handleApiResponse(response);
      setSuccess(true);
      onSuccess();
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setError('');
    setSuccess(false);
    onClose();
  };

  // Reset selection when modal opens with new referral
  useEffect(() => {
    if (isOpen && referral) {
      const types = getAvailableTypes();
      if (types.length === 1) {
        setSelectedType(types[0].type);
      } else {
        setSelectedType(null);
      }
    }
  }, [isOpen, referral]);

  if (!isOpen || !referral) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="bg-white rounded-2xl p-6 w-[90vw] max-w-md shadow-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheck className="text-green-600" size={32} />
            </div>
            <h4 className="text-xl font-bold text-green-600 mb-2">Sponsoring réussi !</h4>
            <p className="text-gray-600">{referral.name} a été activé avec succès.</p>
          </div>
        ) : (
          <>
            <h4 className="text-xl font-bold text-gray-900 mb-4">Sponsoriser un filleul</h4>

            {/* Beneficiary Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {referral.avatar ? (
                    <img src={referral.avatar} alt={referral.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    referral.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{referral.name}</p>
                  <p className="text-sm text-gray-500">{referral.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${referral.referralLevel === 1
                    ? 'bg-blue-100 text-blue-700'
                    : referral.referralLevel === 2
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                    }`}>
                    Niveau {referral.referralLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Subscription Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type d'abonnement
              </label>
              <div className="space-y-2">
                {availableTypes.map(({ type, price, label }) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-colors ${selectedType === type
                      ? 'border-[#115CF6] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{label}</span>
                      <span className="font-bold text-[#115CF6]">{price.toLocaleString('fr-FR')} F</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Balance Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Solde d'activation</span>
                <span className={`font-bold ${canAfford || !selectedType ? 'text-[#115CF6]' : 'text-red-600'}`}>
                  {activationBalance.toLocaleString('fr-FR')} F
                </span>
              </div>
              {selectedType && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                  <span className="text-sm text-gray-600">Après sponsoring</span>
                  <span className={`font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                    {(activationBalance - selectedPrice).toLocaleString('fr-FR')} F
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {!canAfford && selectedType && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                <p className="text-yellow-700 text-sm">
                  ⚠️ Solde insuffisant. Alimentez d'abord votre solde d'activation.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedType || !canAfford}
                className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <FaSpinner className="animate-spin" /> : 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default ActivationBalance;
