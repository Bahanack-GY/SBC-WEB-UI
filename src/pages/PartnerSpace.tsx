import { useQuery } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import Skeleton from '../components/common/Skeleton';
import { useState, useEffect, useRef } from 'react';
import { handleApiResponse } from '../utils/apiHelpers';
import BackButton from '../components/common/BackButton';
import TourButton from '../components/common/TourButton';
import { FaCrown, FaMedal, FaArrowDown, FaUsers, FaGift, } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' F';
}

// Updated interfaces based on API analysis
interface PartnerDetails {
  _id: string;
  user: string;
  pack: 'silver' | 'gold';
  isActive: boolean;
  amount: number;
  totalPartnerWithdrawals?: number;
  createdAt: string;
  updatedAt: string;
}

interface PartnerTransaction {
  _id: string;
  partnerId: string;
  user: string;
  pack: 'silver' | 'gold';
  transType: 'DEPOSIT' | 'WITHDRAWAL' | 'deposit' | 'withdrawal';
  message: string;
  amount: number;
  sourcePaymentSessionId?: string;
  sourceSubscriptionType?: string;
  referralLevelInvolved?: 1 | 2 | 3;
  createdAt: string;
  updatedAt: string;
}


const PartnerSpace = () => {
  const [isPartner, setIsPartner] = useState<boolean | null>(null);

  // States for the "All Transactions" modal
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
  const [allTransactions, setAllTransactions] = useState<PartnerTransaction[]>([]);
  const [allTransactionsPage, setAllTransactionsPage] = useState(1);
  const [allTransactionsHasMore, setAllTransactionsHasMore] = useState(true);
  const [allTransactionsLoadingMore, setAllTransactionsLoadingMore] = useState(false);
  const allTransactionsScrollRef = useRef<HTMLDivElement>(null);

  const {
    data: partnerData,
    isLoading: loadingDetails,
    error: errorDetails,
    refetch: refetchDetails
  } = useQuery({
    queryKey: ['partner-details'],
    queryFn: async () => {
      try {
        const response = await sbcApiService.getPartnerDetails();
        const result = handleApiResponse(response);

        // Handle the case where user is not a partner
        if (!result || result === null) {
          setIsPartner(false);
          return null;
        }

        setIsPartner(true);
        return result as PartnerDetails;
      } catch (error) {
        setIsPartner(false);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const {
    data: transactionsData,
    isLoading: loadingTx,
    error: errorTx,
    refetch: refetchTx,
    isFetching: isFetchingTx
  } = useQuery({
    queryKey: ['partner-transactions'],
    queryFn: async () => {
      try {
        const response = await sbcApiService.getPartnerTransactions();
        // Don't use handleApiResponse here since we need the full response structure
        if (response.isOverallSuccess && response.body) {
          return response.body; // Return the full response body with data and pagination
        }
        throw new Error('Failed to fetch partner transactions');
      } catch (error) {
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
    enabled: isPartner === true, // Only fetch if user is a partner
  });

  useEffect(() => {
    if (isPartner === true) {
      refetchDetails();
      refetchTx();
    }
  }, [isPartner]);

  // Helper functions
  const getPackIcon = (pack: string) => {
    return pack === 'gold' ? <FaCrown className="text-yellow-500" /> : <FaMedal className="text-gray-400" />;
  };

  const getPackColor = (pack: string) => {
    return pack === 'gold' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-gray-400 to-gray-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReferralBadge = (level?: number) => {
    if (!level) return null;
    const colors = {
      1: 'bg-blue-100 text-blue-800',
      2: 'bg-green-100 text-green-800',
      3: 'bg-purple-100 text-purple-800'
    } as const;
    const colorClass = colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        Niveau {level}
      </span>
    );
  };

  // Transaction formatting helpers (similar to Wallet.tsx)
  const formatTransactionIcon = (transaction: PartnerTransaction) => {
    switch (transaction.transType.toLowerCase()) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      default: return '💼';
    }
  };

  const formatTransactionName = (transaction: PartnerTransaction) => {
    // Truncate long messages for the compact view
    const message = transaction.message || `Commission ${transaction.transType}`;
    return message.length > 40 ? message.substring(0, 40) + '...' : message;
  };

  const formatCompactDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Modal handlers
  const openAllTransactionsModal = () => {
    setShowAllTransactionsModal(true);
  };

  const closeAllTransactionsModal = () => {
    setShowAllTransactionsModal(false);
  };

  // Effect to fetch all transactions for the modal with pagination
  useEffect(() => {
    if (!showAllTransactionsModal) return;

    const fetchAllTransactions = async () => {
      // Prevent fetching if no more data or already loading
      if (!allTransactionsHasMore || allTransactionsLoadingMore) return;

      setAllTransactionsLoadingMore(true);
      try {
        const response = await sbcApiService.getPartnerTransactions();
        if (response.isOverallSuccess && response.body) {
          const fetchedTxs = response.body.data || [];
          const paginationInfo = response.body.pagination;

          setAllTransactions(prev => [...prev, ...fetchedTxs]);

          // Update hasMore based on pagination info
          if (paginationInfo) {
            const totalPages = Math.ceil(paginationInfo.total / paginationInfo.limit);
            setAllTransactionsHasMore(paginationInfo.page < totalPages);
          } else {
            setAllTransactionsHasMore(fetchedTxs.length === 20);
          }
        }
      } catch (err) {
        setAllTransactionsHasMore(false);
      } finally {
        setAllTransactionsLoadingMore(false);
      }
    };

    fetchAllTransactions();
  }, [allTransactionsPage, showAllTransactionsModal]);

  // Infinite scroll logic for the modal
  useEffect(() => {
    if (!showAllTransactionsModal || !allTransactionsHasMore || allTransactionsLoadingMore) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const element = allTransactionsScrollRef.current;
        if (element) {
          const { scrollTop, scrollHeight, clientHeight } = element;
          if (scrollTop + clientHeight >= scrollHeight * 0.8 && !allTransactionsLoadingMore) {
            setAllTransactionsPage(prev => prev + 1);
          }
        }
      }, 100);
    };

    const currentRef = allTransactionsScrollRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showAllTransactionsModal, allTransactionsHasMore, allTransactionsLoadingMore]);

  // Reset modal state when closed
  useEffect(() => {
    if (!showAllTransactionsModal) {
      setAllTransactions([]);
      setAllTransactionsPage(1);
      setAllTransactionsHasMore(true);
      setAllTransactionsLoadingMore(false);
    }
  }, [showAllTransactionsModal]);

  // Non-partner view
  const BecomePartnerView = () => (
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
      <div className="mb-6">
        <FaUsers className="text-6xl text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Devenez Partenaire SBC</h2>
        <p className="text-gray-600">
          Rejoignez notre programme de partenariat et commencez à gagner des commissions sur les parrainages !
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 rounded-xl p-6">
          <FaMedal className="text-3xl text-gray-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2">Pack Silver</h3>
          <p className="text-gray-600 text-sm mb-4">Commissions de base sur vos filleuls</p>
          <ul className="text-left text-sm text-gray-600 space-y-1">
            <li>• Commission niveau 1</li>
            <li>• Tableau de bord basique</li>
            <li>• Support standard</li>
          </ul>
        </div>

        <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
          <FaCrown className="text-3xl text-yellow-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-2">Pack Gold</h3>
          <p className="text-gray-600 text-sm mb-4">Commissions maximales sur 3 niveaux</p>
          <ul className="text-left text-sm text-gray-600 space-y-1">
            <li>• Commission niveaux 1, 2, 3</li>
            <li>• Tableau de bord avancé</li>
            <li>• Support prioritaire</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold py-3 px-6 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all">
          Upgrade vers Gold
        </button>
        <button className="w-full bg-gradient-to-r from-gray-400 to-gray-600 text-white font-bold py-3 px-6 rounded-xl hover:from-gray-500 hover:to-gray-700 transition-all">
          Upgrade vers Silver
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center py-0">
      <div className="w-full max-w-4xl mx-auto p-4">
        <div className="flex items-center mb-6">
          <BackButton />
          <h2 className="text-2xl font-bold text-gray-800 text-center flex-1">Espace Partenaire</h2>
        </div>

        {/* Loading State */}
        {loadingDetails && isPartner === null && (
          <div className="space-y-4">
            <Skeleton width="w-full" height="h-40" rounded="rounded-2xl" />
            <Skeleton width="w-full" height="h-32" rounded="rounded-2xl" />
          </div>
        )}

        {/* Error State */}
        {errorDetails && !loadingDetails && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">Erreur lors du chargement des données partenaire</p>
            <p className="text-red-500 text-sm mt-2">{String(errorDetails)}</p>
            <button
              onClick={() => refetchDetails()}
              className="mt-4 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Non-Partner View */}
        {isPartner === false && !loadingDetails && <BecomePartnerView />}

        {/* Partner Dashboard */}
        {isPartner === true && partnerData && (
          <>
            {/* Partner Stats Overview */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {/* Current Balance */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Solde Actuel</h3>
                  <FaGift className="text-2xl text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-600">{formatFCFA(partnerData.amount || 0)}</p>
                <p className="text-gray-500 text-sm mt-1">Commissions disponibles</p>
              </div>

              {/* Partner Level */}
              <div className={`rounded-2xl shadow-lg p-6 text-white ${getPackColor(partnerData.pack)}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Niveau Partenaire</h3>
                  {getPackIcon(partnerData.pack)}
                </div>
                <p className="text-2xl font-bold capitalize">{partnerData.pack}</p>
                <p className="text-white/80 text-sm mt-1">
                  {partnerData.pack === 'gold' ? '3 niveaux de commission' : '1 niveau de commission'}
                </p>
              </div>

              {/* Total Withdrawn */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">Total Retiré</h3>
                  <FaArrowDown className="text-2xl text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {formatFCFA(partnerData.totalPartnerWithdrawals || 0)}
                </p>
                <p className="text-gray-500 text-sm mt-1">Depuis le début</p>
              </div>
            </div>

            {/* Partner Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Informations Partenaire</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm">ID Partenaire</p>
                  <p className="font-mono text-sm text-gray-800">{partnerData._id}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Statut</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${partnerData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {partnerData.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Membre depuis</p>
                  <p className="text-gray-800">{formatDate(partnerData.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Dernière mise à jour</p>
                  <p className="text-gray-800">{formatDate(partnerData.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Recent Transactions - Compact View like Wallet.tsx */}
            <div className="bg-[#192040] rounded-2xl p-4 shadow mb-6">
              <div className="font-semibold mb-2 text-white">Commissions récentes</div>
              {loadingTx || isFetchingTx ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} width="w-full" height="h-12" rounded="rounded-lg" />
                  ))}
                </div>
              ) : errorTx ? (
                <div className="text-center py-4">
                  <p className="text-red-400 text-sm mb-2">Erreur lors du chargement</p>
                  <button
                    onClick={() => refetchTx()}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-colors"
                  >
                    Réessayer
                  </button>
                </div>
              ) : transactionsData && transactionsData.data && transactionsData.data.length > 0 ? (
                transactionsData.data.slice(0, 5).map((tx: PartnerTransaction) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 cursor-pointer hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center size-10 rounded-full bg-blue-100 text-blue-700">
                        <span className="text-xl">{formatTransactionIcon(tx)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate max-w-[160px]">
                          {formatTransactionName(tx)}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-gray-300">{formatCompactDate(tx.createdAt)}</div>
                          {getReferralBadge(tx.referralLevelInvolved)}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold text-sm ${tx.transType.toLowerCase() === 'deposit' ? 'text-green-400' : 'text-red-400'} whitespace-nowrap ml-2 max-w-[110px] text-right truncate`}>
                      {tx.transType.toLowerCase() === 'deposit' ? '+' : '-'}{formatFCFA(tx.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Aucune commission récente
                </div>
              )}
            </div>

            {/* Button to open All Transactions Modal */}
            <div className="flex justify-center mb-20">
              <button
                onClick={openAllTransactionsModal}
                className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-colors"
              >
                Voir toutes les commissions
              </button>
            </div>
          </>
        )}
      </div>
      <TourButton />

      {/* All Transactions History Modal (Bottom Sheet) */}
      <AnimatePresence>
        {showAllTransactionsModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-[#192040] rounded-t-2xl p-4 w-full h-[80vh] text-white relative shadow-lg flex flex-col"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Historique des commissions</h2>
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={closeAllTransactionsModal}
                >
                  <FiX size={24} />
                </button>
              </div>
              <div ref={allTransactionsScrollRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {!allTransactions || allTransactions.length === 0 && !allTransactionsLoadingMore ? (
                  <div className="text-center py-8 text-gray-400">
                    Aucune commission trouvée.
                  </div>
                ) : (
                  allTransactions.map((tx: PartnerTransaction) => (
                    <div
                      key={tx._id}
                      className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 cursor-pointer hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center size-10 rounded-full bg-blue-100 text-blue-700">
                          <span className="text-xl">{formatTransactionIcon(tx)}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-sm truncate max-w-[200px]">
                            {tx.message || `Commission ${tx.transType}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-300">{formatDate(tx.createdAt)}</div>
                            {getReferralBadge(tx.referralLevelInvolved)}
                          </div>
                        </div>
                      </div>
                      <div className={`font-bold text-sm ${tx.transType.toLowerCase() === 'deposit' ? 'text-green-400' : 'text-red-400'} whitespace-nowrap ml-2 max-w-[110px] text-right truncate`}>
                        {tx.transType.toLowerCase() === 'deposit' ? '+' : '-'}{formatFCFA(tx.amount)}
                      </div>
                    </div>
                  ))
                )}
                {allTransactionsLoadingMore && allTransactionsHasMore && (
                  <div className="flex justify-center py-4">
                    <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                )}
                {!allTransactionsHasMore && allTransactions.length > 0 && !allTransactionsLoadingMore && (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    Toutes les commissions ont été chargées.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerSpace; 