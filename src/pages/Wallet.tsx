import BackButton from "../components/common/BackButton";
import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { FaArrowUp } from 'react-icons/fa';
import { FaMoneyBillWave } from 'react-icons/fa';
import { FiShare2, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/common/Skeleton';
import { FaMoneyBill1 } from "react-icons/fa6";
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import type { Transaction } from '../types/api';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useNavigate } from 'react-router-dom';
import { useApiCache } from '../hooks/useApiCache';
import { useAuth } from '../contexts/AuthContext';
import { correspondents, countryOptions } from './ModifierLeProfil'; // Assuming these are exported from ModifierLeProfil.tsx
import TourButton from '../components/common/TourButton';

// Define the TransactionStatus as a string union type to match both backend and frontend usages
export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'processing'
  | 'pending_otp_verification';

// Chart data type
interface ChartDataPoint {
  name: string;
  'Dépôt': number;
  'Retrait': number;
  'Dépôt_count': number;
  'Retrait_count': number;
}

// Helper to get day name from date (for chart)
const getDayName = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
  return date.toLocaleDateString('fr-FR', options);
};

// Helper to get month name from date (for chart)
const getMonthName = (dateString: string) => {
  const [year, month] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const options: Intl.DateTimeFormatOptions = { month: 'short' };
  return date.toLocaleDateString('fr-FR', options) + ' ' + year.slice(2);
};

// New: Function to get icon wrapper class based on status
const getStatusIconWrapperClasses = (status: string) => {
  let bgColor = 'bg-gray-100'; // Default subtle background
  let textColor = 'text-gray-700'; // Default text color

  if (status === 'failed') {
    bgColor = 'bg-red-200'; // Light red background for failed
    textColor = 'text-red-700'; // Matching text color for failed
  } else if (status === 'completed' || status === 'refunded') {
    bgColor = 'bg-green-100'; // Green background for successful transactions
    textColor = 'text-green-700';
  } else if (
    status === 'pending' ||
    status === 'processing' ||
    status === 'pending_otp_verification'
  ) {
    bgColor = 'bg-yellow-100'; // Yellow background for pending/processing/OTP
    textColor = 'text-yellow-700';
  }

  return `flex items-center justify-center size-10 rounded-full ${bgColor} ${textColor}`;
};

function Wallet() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([{ name: '', 'Dépôt': 0, 'Retrait': 0, 'Dépôt_count': 0, 'Retrait_count': 0 }]);
  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily'); // New state for chart timeframe

  // States for the "All Transactions" modal
  const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allTransactionsPage, setAllTransactionsPage] = useState(1);
  const [allTransactionsHasMore, setAllTransactionsHasMore] = useState(true);
  const [allTransactionsLoadingMore, setAllTransactionsLoadingMore] = useState(false);
  const allTransactionsScrollRef = useRef<HTMLDivElement>(null);

  const {
    data: transactionsData,
    loading: transactionsLoading,
    error: transactionsError
  } = useApiCache(
    'transaction-history',
    async () => {
      const response = await sbcApiService.getTransactionHistory({ limit: 10 });
      const result = handleApiResponse(response) || response;
      return (Array.isArray(result) ? result : []).map((tx: Record<string, unknown>) => ({
        ...tx,
        id: (tx._id as string) || (tx.transactionId as string) || (tx.id as string) || '',
        status: (tx.status as TransactionStatus) || 'pending',
        type: (tx.type as Transaction['type']) || 'deposit',
        amount: (typeof tx.amount === 'number' ? tx.amount : Number(tx.amount)) || 0,
        createdAt: (tx.createdAt as string) || '',
        description: (tx.description as string) || '',
        reference: (tx.reference as string) || '',
        userId: (tx.userId as string) || '',
        currency: (tx.currency as string) || '',
        updatedAt: (tx.updatedAt as string) || '',
      } as Transaction));
    },
    { staleTime: 15000 } // 15 seconds
  );

  console.log("transactionsData", transactionsData);

  // This line defines 'transactions' for use in your JSX
  const transactions = transactionsData;

  const {
    data: stats,
    loading: statsLoading,
    error: statsError
  } = useApiCache(
    'transaction-stats',
    async () => {
      const response = await sbcApiService.getTransactionStats();
      const result = handleApiResponse(response) || response;
      // result is already the stats object
      return result || {};
    },
    { staleTime: 30000 } // 30 seconds
  );


  console.log("stats", stats);
  // Generate chart data from stats
  useEffect(() => {
    if (!stats) {
      setChartData([]);
      return;
    }

    let dataToProcess: Record<string, unknown> = {};
    let formatLabel: (key: string) => string;

    switch (chartTimeframe) {
      case 'daily':
        dataToProcess = stats.daily || {};
        formatLabel = getDayName;
        break;
      case 'weekly':
        dataToProcess = stats.weekly || {};
        formatLabel = (key: string) => `Semaine ${key.split(' ')[1]}`;
        break;
      case 'monthly':
        dataToProcess = stats.monthly || {};
        formatLabel = getMonthName;
        break;
      default:
        dataToProcess = {};
        formatLabel = (key: string) => key;
    }

    const processedData = Object.keys(dataToProcess)
      .sort() // Ensure chronological order
      .map(key => {
        const value = dataToProcess[key] as Record<string, unknown>;
        const deposit = value?.deposit as { totalAmount?: number; count?: number } | undefined;
        const withdrawal = value?.withdrawal as { totalAmount?: number; count?: number } | undefined;
        return {
          name: formatLabel(key),
          'Dépôt': Number(deposit?.totalAmount || 0),
          'Retrait': Number(withdrawal?.totalAmount || 0),
          'Dépôt_count': Number(deposit?.count || 0),
          'Retrait_count': Number(withdrawal?.count || 0),
        };
      });

    setChartData(processedData.length > 0 ? processedData : [{ name: '', 'Dépôt': 0, 'Retrait': 0, 'Dépôt_count': 0, 'Retrait_count': 0 }]);
  }, [stats, chartTimeframe]); // Depend on stats and new timeframe

  const loading = transactionsLoading || statsLoading;
  const error = transactionsError || statsError; // Don't include wallet error as it's optional
  // Use balance from user context
  const balance = user?.balance || 0;

  const fetchWalletData = () => {
    // This function can be used to manually refresh data if needed
    window.location.reload();
  };

  const [chartType, setChartType] = useState('Reçu');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const openModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setSelectedTx(null);
  };
  const handleShare = () => {
    if (selectedTx) {
      const shareText = `Transaction ID: ${selectedTx.id}\nType: ${selectedTx.type}\nMontant: ${selectedTx.amount} F\nDescription: ${selectedTx.description}\nDate: ${selectedTx.createdAt}`;
      if (navigator.share) {
        navigator.share({ text: shareText });
      } else {
        navigator.clipboard.writeText(shareText);
        alert('Transaction copiée dans le presse-papier !');
      }
    }
  };
  const handleWithdraw = () => {
    setShowWithdrawForm((v) => !v);
  };
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount && Number(withdrawAmount) > 0) {
      try {
        // Determine currency based on user's country
        const userCountryName = user?.country; // e.g., 'Cameroun'
        const userCountryDetails = countryOptions.find((c: { value: string; code: string; }) => c.value === userCountryName);
        const userCountryCode = userCountryDetails?.code; // This would be 'CM', 'BJ' etc.

        let currency = 'XAF'; // Default for Central African CFA franc
        if (userCountryCode && correspondents[userCountryCode] && correspondents[userCountryCode].currencies.length > 0) {
          currency = correspondents[userCountryCode].currencies[0];
        } else {
          console.warn(`Could not determine specific currency for country: ${userCountryName} (code: ${userCountryCode}). Defaulting to XAF.`);
        }

        const response = await sbcApiService.initiateWithdrawal(Number(withdrawAmount));
        const data = handleApiResponse(response); // This assumes handleApiResponse throws on !success

        console.log("data", data);
        console.log("response", response);

        if (data && response.isOverallSuccess) {
          // Handle success based on status from API response
          if (data.status === 'pending_otp_verification' && data.transactionId) {
            alert(data.message || 'Demande de retrait initiée. Un code OTP a été envoyé à votre numéro de téléphone. Veuillez le vérifier.');
            navigate('/otp', {
              state: {
                fromWithdrawal: true,
                withdrawalId: data.transactionId,
                withdrawalAmount: Number(withdrawAmount),
                withdrawalCurrency: currency,
              }
            });
            setWithdrawAmount(''); // Clear the input after initiating/re-sending OTP
            setShowWithdrawForm(false); // Hide the form
            refreshUser(); // Refresh user context if needed for balance update or other state
          } else if (data.status === 'processing') {
            // New: Navigate directly to TransactionConfirmation page for PROCESSING status
            alert(data.message || 'Retrait initié et en cours de traitement. Votre solde sera mis à jour une fois le transfert confirmé.');
            navigate('/transaction-confirmation', {
              state: {
                transactionId: data.transactionId,
                withdrawalAmount: Number(withdrawAmount),
                withdrawalCurrency: currency,
              }
            });
            setWithdrawAmount('');
            setShowWithdrawForm(false);
            refreshUser(); // Refresh user context to reflect potential balance changes
          } else if (data.status === 'pending') {
            // This covers a soft lock scenario where the status is 'pending' and no OTP is re-sent or needed at this point
            alert(data.message || 'Vous avez une demande de retrait en cours. Veuillez la compléter ou l\'annuler avant d\'en initier une nouvelle.');
            setWithdrawAmount('');
            setShowWithdrawForm(false);
            refreshUser(); // Refresh in case the existing transaction details are updated
          } else {
            alert(data.message || 'Une erreur inattendue est survenue lors de l\'initiation du retrait. Veuillez réessayer.');
          }
        } else {
          // This block is for cases where handleApiResponse doesn't throw but response.isOverallSuccess is false
          alert(data.message || 'Échec de l\'initiation du retrait.');
        }

      } catch (err) {
        console.error('Withdrawal initiation error:', err);
        let errorMessage = 'Échec de l\'initiation du retrait.';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string') {
          errorMessage = (err as { message: string }).message;
        }

        // Specific error handling based on API messages
        if (errorMessage.includes("Your account does not have registered Mobile Money details")) {
          alert("Votre profil n'a pas de détails Mobile Money enregistrés. Veuillez mettre à jour votre profil pour ajouter votre numéro et opérateur MoMo.");
          navigate('/modifier-le-profil'); // Direct user to update profile
        } else if (errorMessage.includes("You have reached your daily limit")) {
          alert(errorMessage);
        } else if (errorMessage.includes("Insufficient balance")) {
          alert(errorMessage);
        } else if (errorMessage.includes("ongoing withdrawal request")) {
          alert(errorMessage); // Soft lock message, already handled in success but duplicated for safety
        } else {
          alert(errorMessage);
        }

      }
    } else {
      alert("Veuillez entrer un montant de retrait valide.");
    }
  };

  const handleDeposit = () => {
    // Navigate to deposit page or show deposit modal
    navigate('/deposit');
  };

  const formatTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      case 'payment': return '💳';
      case 'refund': return '🔄';
      default: return '💼';
    }
  };

  const formatTransactionName = (transaction: Transaction) => {
    return transaction.description || `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        const response = await sbcApiService.getTransactionHistory({
          page: allTransactionsPage,
          limit: 20 // A larger limit for the modal
        });
        const result = handleApiResponse(response) || response; // Use the flexible handleApiResponse
        const fetchedTxs = (Array.isArray(result) ? result : []);
        const paginationInfo = response.body?.pagination; // Access pagination from the original response body

        setAllTransactions(prev => [...prev, ...fetchedTxs.map((tx: Record<string, unknown>) => ({
          ...tx,
          id: (tx._id as string) || (tx.transactionId as string) || (tx.id as string) || '',
          status: (tx.status as TransactionStatus) || 'pending',
          type: (tx.type as Transaction['type']) || 'deposit',
          amount: (typeof tx.amount === 'number' ? tx.amount : Number(tx.amount)) || 0,
          createdAt: (tx.createdAt as string) || '',
          description: (tx.description as string) || '',
          reference: (tx.reference as string) || '',
          userId: (tx.userId as string) || '',
          currency: (tx.currency as string) || '',
          updatedAt: (tx.updatedAt as string) || '',
        } as Transaction))]);
        // Update hasMore based on pagination info
        if (paginationInfo) {
          const totalPages = Math.ceil(paginationInfo.total / paginationInfo.limit);
          setAllTransactionsHasMore(paginationInfo.page < totalPages);
        } else {
          // Fallback if paginationInfo is missing (should not happen if API is consistent)
          setAllTransactionsHasMore(fetchedTxs.length === 20); // Still assume limit is 20
        }
      } catch (err) {
        console.error("Failed to fetch all transactions:", err);
        setAllTransactionsHasMore(false); // Stop trying to load more on error
      } finally {
        setAllTransactionsLoadingMore(false);
      }
    };

    fetchAllTransactions();
  }, [allTransactionsPage, showAllTransactionsModal]); // Depend on page and modal visibility

  // Infinite scroll logic for the modal
  useEffect(() => {
    if (!showAllTransactionsModal || !allTransactionsHasMore || allTransactionsLoadingMore) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null; // Declare a timeout ID

    const handleScroll = () => {
      // Clear any previous timeout to debounce the function
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set a new timeout to execute the logic after a short delay (e.g., 100ms)
      timeoutId = setTimeout(() => {
        const element = allTransactionsScrollRef.current;
        if (element) {
          const { scrollTop, scrollHeight, clientHeight } = element;
          // Load more when user is 80% down the scrollable area AND not currently loading
          if (scrollTop + clientHeight >= scrollHeight * 0.8 && !allTransactionsLoadingMore) {
            setAllTransactionsPage(prev => prev + 1);
          }
        }
      }, 100); // 100ms debounce time
    };

    const currentRef = allTransactionsScrollRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', handleScroll);
    }
    return () => {
      // Clean up event listener and any pending timeout when component unmounts or dependencies change
      if (currentRef) {
        currentRef.removeEventListener('scroll', handleScroll);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showAllTransactionsModal, allTransactionsHasMore, allTransactionsLoadingMore]); // Depend on page and modal visibility

  // Reset modal state when closed
  useEffect(() => {
    if (!showAllTransactionsModal) {
      setAllTransactions([]);
      setAllTransactionsPage(1);
      setAllTransactionsHasMore(true);
      setAllTransactionsLoadingMore(false);
    }
  }, [showAllTransactionsModal]);

  return (
    <ProtectedRoute>
      <div className="p-3 h-screen mb-36 bg-white text-white">
        <div className="flex items-center mb-4">
          <BackButton />
          <h3 className="text-xl font-medium text-center w-full text-gray-900">Portefeuille</h3>
        </div>
        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton height="h-32" rounded="rounded-2xl" />
            <div className="flex gap-3">
              <Skeleton width="w-24" height="h-16" rounded="rounded-2xl" />
              <Skeleton width="w-24" height="h-16" rounded="rounded-2xl" />
            </div>
            <Skeleton height="h-40" rounded="rounded-2xl" />
            <Skeleton height="h-32" rounded="rounded-2xl" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
            <p className="text-lg mb-2 text-red-500">Erreur lors du chargement</p>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={fetchWalletData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-500 to-green-600 p-5 mb-6 shadow-lg">
              <div className="text-sm opacity-80">Solde total</div>
              <div className="text-3xl font-bold mb-2">{balance.toLocaleString('fr-FR')} F</div>
              <div className="flex justify-between text-sm mt-2">
                <div>
                  <div className="opacity-80">Bénéfice</div>
                  <div className="font-bold">{(Number(stats?.overall?.deposit?.completed?.totalAmount) || 0).toLocaleString('fr-FR')} F</div>
                </div>
                <div>
                  <div className="opacity-80">Retraits</div>
                  <div className="font-bold">{(Number(stats?.overall?.withdrawal?.completed?.totalAmount) || 0).toLocaleString('fr-FR')} F</div>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleDeposit}
                className="flex-1 flex flex-col items-center justify-center bg-[#115CF6] rounded-2xl py-4 shadow hover:bg-blue-800 transition-colors"
              >
                <FaArrowUp size={24} className="mb-1" />
                <span className="text-xs font-semibold">Dépôt</span>
              </button>
              <button
                onClick={handleWithdraw}
                className="flex-1 flex flex-col items-center justify-center bg-[#94B027] rounded-2xl py-4 shadow hover:bg-green-700 transition-colors"
              >
                <FaMoneyBillWave size={24} className="mb-1" />
                <span className="text-xs font-semibold">Retrait</span>
              </button>
            </div>
            {showWithdrawForm && (
              <form onSubmit={handleWithdrawSubmit} className="mb-6 flex flex-col  gap-3 bg-gray-50 rounded-2xl p-4 shadow">
                <label className="text-gray-800 font-semibold">Montant à retirer</label>
                <div className="flex justify-between gap-2">
                  <input
                    type="number"
                    min="1"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-center font-bold"
                    placeholder="Montant en F"
                    required
                  />
                  <button type="submit" className="bg-[#115CF6] text-white rounded-full p-3 font-bold shadow hover:bg-blue-800 transition-colors"><FaMoneyBill1 size={24} /></button>
                </div>

              </form>
            )}
            {/* Bar Chart */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow text-gray-800 relative">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-[#115CF6]">Résumé des transactions</div>
                <div className="flex bg-gray-100 rounded-full p-1 gap-1">
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 ${chartType === 'Reçu' ? 'bg-[#115CF6] text-white' : 'text-[#115CF6]'}`}
                    onClick={() => setChartType('Reçu')}
                  >
                    Reçu
                  </button>
                  <button
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 ${chartType === 'Retrait' ? 'bg-[#115CF6] text-white' : 'text-[#115CF6]'}`}
                    onClick={() => setChartType('Retrait')}
                  >
                    Retrait
                  </button>
                </div>
              </div>
              {/* New: Chart Timeframe Selection */}
              <div className="flex bg-gray-100 rounded-full p-1 gap-1 mb-4">
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 ${chartTimeframe === 'daily' ? 'bg-green-700 text-white' : 'text-gray-700'}`}
                  onClick={() => setChartTimeframe('daily')}
                >
                  Journalier
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 ${chartTimeframe === 'weekly' ? 'bg-green-700 text-white' : 'text-gray-700'}`}
                  onClick={() => setChartTimeframe('weekly')}
                >
                  Hebdomadaire
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-150 ${chartTimeframe === 'monthly' ? 'bg-green-700 text-white' : 'text-gray-700'}`}
                  onClick={() => setChartTimeframe('monthly')}
                >
                  Mensuel
                </button>
              </div>
              <div className="relative w-full h-[160px]">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} barCategoryGap={chartTimeframe === 'daily' ? 30 : 10} barGap={8}>
                    <XAxis
                      dataKey="name"
                      stroke="#bbb"
                      fontSize={chartTimeframe === 'monthly' ? 10 : 14}
                      tickLine={false}
                      axisLine={false}
                      angle={0}
                      textAnchor="middle"
                      interval={0}
                      dy={10}
                    />
                    {chartType === 'Reçu' && (
                      <Bar dataKey="Dépôt" fill="#115CF6" radius={[20, 20, 20, 20]} barSize={32} isAnimationActive={true} />
                    )}
                    {chartType === 'Retrait' && (
                      <Bar dataKey="Retrait" fill="#FFB200" radius={[20, 20, 20, 20]} barSize={32} isAnimationActive={true} />
                    )}
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = chartData.find(d => d.name === label); // Find the full data point
                          return (
                            <div className="rounded-lg bg-gray-800 p-3 text-white shadow-lg text-sm">
                              <p className="font-bold mb-1">{label}</p>
                              <p className="text-blue-400">
                                Dépôt: {(dataPoint?.['Dépôt'] || 0).toLocaleString('fr-FR')} F (Nb: {dataPoint?.Dépôt_count || 0})
                              </p>
                              <p className="text-yellow-400">
                                Retrait: {(dataPoint?.['Retrait'] || 0).toLocaleString('fr-FR')} F (Nb: {dataPoint?.Retrait_count || 0})
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Recent Transactions */}
            <div className="bg-[#192040] rounded-2xl p-4 shadow">
              <div className="font-semibold mb-2 text-white">Transactions récentes</div>
              {!transactions || transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Aucune transaction récente
                </div>
              ) : (
                transactions.map((tx: Transaction) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 cursor-pointer hover:bg-white/10 rounded-lg transition-colors"
                    onClick={() => openModal(tx)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={getStatusIconWrapperClasses(String(tx.status))}>
                        <span className="text-2xl">{formatTransactionIcon(tx)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold ${String(tx.status) === 'completed' ? 'text-white' :
                          (String(tx.status) === 'pending' || String(tx.status) === 'processing' || String(tx.status) === 'pending_otp_verification') ? 'text-yellow-400' :
                            String(tx.status) === 'failed' ? 'text-red-400' : 'text-white'
                          } text-sm truncate max-w-[160px]`}>{formatTransactionName(tx)}</div>
                        <div className="text-xs text-gray-300">{formatDate(tx.createdAt)}</div>
                      </div>
                    </div>
                    <div className={`font-bold text-sm ${tx.type === 'withdrawal' || tx.type === 'payment' ? 'text-red-400' : 'text-green-400'} whitespace-nowrap ml-2 max-w-[110px] text-right truncate`}>
                      {tx.type === 'withdrawal' || tx.type === 'payment' ? '-' : '+'}{tx.amount.toLocaleString('fr-FR')} F
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Button to open All Transactions Modal */}
            <div className="flex justify-center mt-6 mb-20">
              <button
                onClick={openAllTransactionsModal}
                className="bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-colors"
              >
                Voir toutes les transactions
              </button>
            </div>
            {/* Modal */}
            <AnimatePresence>
              {modalOpen && selectedTx && (
                <motion.div
                  className="fixed inset-0 z-60 flex items-center justify-center bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', bounce: 0.2 }}
                  >
                    <button
                      className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                      onClick={closeModal}
                    >
                      <FiX size={22} />
                    </button>
                    <div className="mb-4">
                      <div className="text-xs text-gray-400 mb-1">ID de la transaction</div>
                      <div className="font-mono text-sm mb-2">{selectedTx.id}</div>
                      <div className="text-xs text-gray-400 mb-1">Type</div>
                      <div className="font-semibold mb-2">{selectedTx.type}</div>
                      <div className="text-xs text-gray-400 mb-1">Statut</div>
                      <div className={`font-semibold mb-2 ${String(selectedTx.status) === 'completed' ? 'text-green-600' :
                        (String(selectedTx.status) === 'pending' || String(selectedTx.status) === 'processing' || String(selectedTx.status) === 'pending_otp_verification') ? 'text-yellow-600' :
                          String(selectedTx.status) === 'failed' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                        {String(selectedTx.status) === 'completed' ? 'Terminé' :
                          String(selectedTx.status) === 'pending' ? 'En attente' :
                            String(selectedTx.status) === 'processing' ? 'En cours' :
                              String(selectedTx.status) === 'pending_otp_verification' ? 'En attente OTP' :
                                String(selectedTx.status) === 'failed' ? 'Échoué' : selectedTx.status}
                      </div>
                      <div className="text-xs text-gray-400 mb-1">Montant</div>
                      <div className={`font-bold text-lg mb-2 ${String(selectedTx.type) === 'withdrawal' || String(selectedTx.type) === 'payment' ? 'text-red-500' : 'text-green-600'
                        }`}>
                        {String(selectedTx.type) === 'withdrawal' || String(selectedTx.type) === 'payment' ? '-' : '+'}{selectedTx.amount.toLocaleString('fr-FR')} F
                      </div>
                      <div className="text-xs text-gray-400 mb-1">Description</div>
                      <div className="mb-2">{selectedTx.description || formatTransactionName(selectedTx as Transaction)}</div>
                      <div className="text-xs text-gray-400 mb-1">Date</div>
                      <div>{formatDate(selectedTx.createdAt)}</div>
                      {selectedTx.reference && (
                        <>
                          <div className="text-xs text-gray-400 mb-1 mt-2">Référence</div>
                          <div className="font-mono text-sm">{selectedTx.reference}</div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        className="flex-1 bg-[#115CF6] text-white rounded-xl py-2 font-bold shadow hover:bg-blue-800 transition-colors"
                        onClick={handleShare}
                      >
                        <FiShare2 className="inline mr-2" />Partager
                      </button>
                      <button
                        className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                        onClick={closeModal}
                      >
                        Fermer
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

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
                      <h2 className="text-xl font-bold">Historique des transactions</h2>
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
                          Aucune transaction trouvée.
                        </div>
                      ) : (
                        allTransactions.map((tx: Transaction) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 cursor-pointer hover:bg-white/10 rounded-lg transition-colors"
                            onClick={() => {
                              openModal(tx);
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={getStatusIconWrapperClasses(String(tx.status))}>
                                <span className="text-2xl">{formatTransactionIcon(tx)}</span>
                              </div>
                              <div className="min-w-0">
                                <div className={`font-bold ${String(tx.status) === 'completed' ? 'text-white' :
                                  (String(tx.status) === 'pending' || String(tx.status) === 'processing' || String(tx.status) === 'pending_otp_verification') ? 'text-yellow-400' :
                                    String(tx.status) === 'failed' ? 'text-red-400' : 'text-white'
                                  } text-sm truncate max-w-[160px]`}>{formatTransactionName(tx)}</div>
                                <div className="text-xs text-gray-300">{formatDate(tx.createdAt)}</div>
                              </div>
                            </div>
                            <div className={`font-bold text-sm ${tx.type === 'withdrawal' || tx.type === 'payment' ? 'text-red-400' : 'text-green-400'} whitespace-nowrap ml-2 max-w-[110px] text-right truncate`}>
                              {tx.type === 'withdrawal' || tx.type === 'payment' ? '-' : '+'}{tx.amount.toLocaleString('fr-FR')} F
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
                          Toutes les transactions ont été chargées.
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <TourButton />
      </div>
    </ProtectedRoute>
  )
}

export default Wallet;
