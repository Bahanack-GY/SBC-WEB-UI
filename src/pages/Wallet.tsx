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
import { momoCorrespondents, countryOptions } from '../utils/countriesData';
import TourButton from '../components/common/TourButton';
import CurrencyConverterComponent from '../components/CurrencyConverterComponent';
import { useTranslation } from 'react-i18next';
import {
  getStatusColor,
  getStatusTranslationKey
} from '../utils/transactionHelpers';
import TransactionApprovalInfo from '../components/TransactionApprovalInfo';

// Use Transaction['status'] type from api.ts instead of defining a separate type

// Chart data type
interface ChartDataPoint {
  name: string;
  'Dépôt': number;
  'Retrait': number;
  'Dépôt_count': number;
  'Retrait_count': number;
  // Individual currency data for detailed tooltips
  depositXAF?: number;
  depositUSD?: number;
  withdrawalXAF?: number;
  withdrawalUSD?: number;
  depositCountXAF?: number;
  depositCountUSD?: number;
  withdrawalCountXAF?: number;
  withdrawalCountUSD?: number;
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

// Helper function to format currency amounts
const formatCurrency = (amount: number, currency: string): string => {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  } else {
    // Default to XAF/FCFA formatting
    return `${amount.toLocaleString('fr-FR')} F`;
  }
};

// Helper function to get currency symbol class for styling
const getCurrencyColorClass = (currency: string, isPositive: boolean): string => {
  const baseClass = isPositive ? 'text-green-400' : 'text-red-400';
  if (currency === 'USD') {
    return isPositive ? 'text-green-500' : 'text-red-500'; // Slightly different shade for USD
  }
  return baseClass;
};

// New: Function to get icon wrapper class based on status
const getStatusIconWrapperClasses = (status: string) => {
  let bgColor = 'bg-gray-100'; // Default subtle background
  let textColor = 'text-gray-700'; // Default text color

  if (status === 'failed' || status === 'rejected_by_admin') {
    bgColor = 'bg-red-200'; // Light red background for failed/rejected
    textColor = 'text-red-700'; // Matching text color for failed/rejected
  } else if (status === 'completed' || status === 'refunded') {
    bgColor = 'bg-green-100'; // Green background for successful transactions
    textColor = 'text-green-700';
  } else if (
    status === 'pending' ||
    status === 'processing' ||
    status === 'pending_otp_verification' ||
    status === 'pending_admin_approval'  // NEW
  ) {
    bgColor = 'bg-yellow-100'; // Yellow background for pending/processing/OTP/admin approval
    textColor = 'text-yellow-700';
  }

  return `flex items-center justify-center size-10 rounded-full ${bgColor} ${textColor}`;
};

function Wallet() {
  const { t } = useTranslation();
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
    error: transactionsError,
    refetch: invalidateTransactions
  } = useApiCache<Transaction[]>(
    'transaction-history',
    async () => {
      const response = await sbcApiService.getTransactionHistory({ limit: 10 });
      const result = handleApiResponse(response) || response;
      return (Array.isArray(result) ? result : []).map((tx: Record<string, unknown>) => ({
        ...tx,
        id: (tx._id as string) || (tx.transactionId as string) || (tx.id as string) || '',
        transactionId: (tx.transactionId as string) || (tx._id as string) || (tx.id as string) || '',
        status: (tx.status as Transaction['status']) || 'pending',
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

  // This line defines 'transactions' for use in your JSX
  const transactions = transactionsData;

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: invalidateStats
  } = useApiCache<Record<string, any>>(
    'transaction-stats',
    async () => {
      const response = await sbcApiService.getTransactionStats();
      const result = handleApiResponse(response) || response;
      return result || {};
    },
    { staleTime: 30000 } // 30 seconds
  );
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
        const deposit = value?.deposit as { totalAmount?: number; count?: number; currencies?: Record<string, any> } | undefined;
        const withdrawal = value?.withdrawal as { totalAmount?: number; count?: number; currencies?: Record<string, any> } | undefined;
        
        // Calculate combined amounts in FCFA equivalent for chart display
        // USD is converted to XAF using rate of 1:500
        const depositXAF = Number(deposit?.currencies?.XAF?.totalAmount || 0);
        const depositUSD = Number(deposit?.currencies?.USD?.totalAmount || 0);
        const depositTotal = depositXAF + (depositUSD * 500); // Convert USD to XAF for chart
        
        const withdrawalXAF = Number(withdrawal?.currencies?.XAF?.totalAmount || 0);
        const withdrawalUSD = Number(withdrawal?.currencies?.USD?.totalAmount || 0);
        const withdrawalTotal = withdrawalXAF + (withdrawalUSD * 500); // Convert USD to XAF for chart
        
        // Combined counts
        const depositCountXAF = Number(deposit?.currencies?.XAF?.count || 0);
        const depositCountUSD = Number(deposit?.currencies?.USD?.count || 0);
        const withdrawalCountXAF = Number(withdrawal?.currencies?.XAF?.count || 0);
        const withdrawalCountUSD = Number(withdrawal?.currencies?.USD?.count || 0);
        
        return {
          name: formatLabel(key),
          'Dépôt': depositTotal,
          'Retrait': withdrawalTotal,
          'Dépôt_count': depositCountXAF + depositCountUSD,
          'Retrait_count': withdrawalCountXAF + withdrawalCountUSD,
          // Store individual currency data for tooltip
          'depositXAF': depositXAF,
          'depositUSD': depositUSD,
          'withdrawalXAF': withdrawalXAF,
          'withdrawalUSD': withdrawalUSD,
          'depositCountXAF': depositCountXAF,
          'depositCountUSD': depositCountUSD,
          'withdrawalCountXAF': withdrawalCountXAF,
          'withdrawalCountUSD': withdrawalCountUSD,
        };
      });

    setChartData(processedData.length > 0 ? processedData : [{ name: '', 'Dépôt': 0, 'Retrait': 0, 'Dépôt_count': 0, 'Retrait_count': 0 }]);
  }, [stats, chartTimeframe]); // Depend on stats and new timeframe

  const loading = transactionsLoading || statsLoading;
  const error = transactionsError || statsError; // Don't include wallet error as it's optional
  // Use balance from user context
  const balance = user?.balance || 0;
  const usdBalance = user?.usdBalance || 0;

  const fetchWalletData = () => {
    // Refresh data by invalidating caches instead of full page reload
    invalidateTransactions();
    invalidateStats();
    refreshUser();
  };

  const [chartType, setChartType] = useState('Reçu');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [selectedBalanceType, setSelectedBalanceType] = useState<'FCFA' | 'USD'>('FCFA');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawalFee, setWithdrawalFee] = useState(0);
  const [totalDeduction, setTotalDeduction] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'success' | 'error' | 'confirm', message: string, onConfirm?: () => void } | null>(null);
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);

  // Calculate withdrawal fee and total deduction in real-time
  useEffect(() => {
    const amount = Number(withdrawAmount) || 0;
    console.log('Fee calculation triggered with withdrawAmount:', withdrawAmount, 'parsed as:', amount);
    let fee = 0;
    let total = 0;
    
    if (selectedBalanceType === 'FCFA') {
      fee = amount * 0.025; // 2.5% fee for FCFA/Mobile Money
      total = amount + fee;
    } else {
      // For USD crypto withdrawals, apply 2.5% fee
      fee = amount * 0.025; // 2.5% fee for crypto withdrawals
      total = amount + fee;
    }

    setWithdrawalFee(fee);
    setTotalDeduction(total);
  }, [withdrawAmount, selectedBalanceType]);

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
        setModalContent({ type: 'success', message: 'Transaction copiée dans le presse-papier !' });
        setShowModal(true);
      }
    }
  };
  const handleWithdraw = () => {
    setShowWithdrawForm((v) => {
      // Clear form data when closing
      if (v) {
        setWithdrawAmount('');
        setWithdrawalFee(0);
        setTotalDeduction(0);
        setSelectedBalanceType('FCFA');
      }
      return !v;
    });
  };
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount && Number(withdrawAmount) > 0 && !isNaN(Number(withdrawAmount))) {
      // Check if user has sufficient balance
      const currentBalance = selectedBalanceType === 'FCFA' ? balance : usdBalance;
      
      // Prevent withdrawal if balance is negative
      if (currentBalance < 0) {
        setModalContent({
          type: 'error',
          message: `Impossible d'effectuer un retrait avec un solde ${selectedBalanceType} négatif. Votre solde actuel est de ${selectedBalanceType === 'FCFA' ? `${currentBalance.toLocaleString('fr-FR')} F` : `$${currentBalance.toFixed(2)}`}.`
        });
        setShowModal(true);
        return;
      }
      
      const requiredAmount = totalDeduction; // Always use totalDeduction (amount + fee) for balance check
      
      if (currentBalance < requiredAmount) {
        const balanceText = selectedBalanceType === 'FCFA' 
          ? `${currentBalance.toLocaleString('fr-FR')} F`
          : `$${currentBalance.toFixed(2)}`;
        const requiredText = selectedBalanceType === 'FCFA'
          ? `${requiredAmount.toLocaleString('fr-FR')} F (montant + frais de 2.5%)`
          : `$${requiredAmount.toFixed(2)}`;
          
        setModalContent({
          type: 'error',
          message: `Solde ${selectedBalanceType} insuffisant. Vous avez ${balanceText} mais il faut ${requiredText}.`
        });
        setShowModal(true);
        return;
      }
      try {
        // Determine currency based on user's country
        const userCountryName = user?.country; // Could be either country name like 'Cameroun' or country code like 'TG'

        // First try to find by country name (value field)
        let userCountryDetails = countryOptions.find((c: { value: string; code: string; }) => c.value === userCountryName);

        // If not found, try to find by country code (code field) - in case user.country stores the code directly
        if (!userCountryDetails) {
          userCountryDetails = countryOptions.find((c: { value: string; code: string; }) => c.code === userCountryName);
        }

        const userCountryCode = userCountryDetails?.code; // This would be 'CM', 'BJ', 'TG' etc.

        let currency = 'XAF'; // Default for Central African CFA franc
        if (userCountryCode && momoCorrespondents[userCountryCode] && momoCorrespondents[userCountryCode].currencies.length > 0) {
          currency = momoCorrespondents[userCountryCode].currencies[0];
        } else {
          console.warn(`Could not determine specific currency for country: ${userCountryName} (code: ${userCountryCode}). Defaulting to XAF.`);
        }

        // NEW UNIFIED WITHDRAWAL SYSTEM
        console.log(`Initiating ${selectedBalanceType} withdrawal:`, Number(withdrawAmount));
        
        // For USD withdrawals, check if crypto wallet is set up
        if (selectedBalanceType === 'USD') {
          if (!user?.cryptoWalletAddress || !user?.cryptoWalletCurrency) {
            setModalContent({
              type: 'confirm',
              message: "Pour effectuer un retrait en USD (crypto), vous devez d'abord configurer votre portefeuille crypto dans votre profil. Voulez-vous aller à la page de modification du profil maintenant ?",
              onConfirm: () => navigate('/modifier-le-profil')
            });
            setShowModal(true);
            return;
          }
          
          // Check crypto withdrawal limits
          try {
            const limitsResponse = await sbcApiService.checkCryptoWithdrawalLimitsV2(Number(withdrawAmount), 'USD');
            const limitsData = handleApiResponse(limitsResponse);
            
            if (!limitsData?.allowed) {
              setModalContent({
                type: 'error',
                message: `Retrait USD non autorisé: ${limitsData?.reason || 'Limite atteinte'}`
              });
              setShowModal(true);
              return;
            }
          } catch (err) {
            console.warn('Could not check crypto limits, proceeding with withdrawal');
          }
        }
        
        // Use new unified withdrawal endpoint
        const withdrawalAmount = Math.round(Number(withdrawAmount));
        if (withdrawalAmount <= 0) {
          throw new Error('Montant invalide: doit être supérieur à 0');
        }
        
        console.log('Using new unified withdrawal endpoint');
        const response = await sbcApiService.initiateUnifiedWithdrawal(
          withdrawalAmount, 
          selectedBalanceType === 'FCFA' ? 'mobile_money' : 'crypto'
        );
        const data = handleApiResponse(response); // This assumes handleApiResponse throws on !success

        console.log("data", data);
        console.log("response", response);
        console.log("data.message:", data?.message);
        console.log("response.isOverallSuccess:", response.isOverallSuccess);

        if (data && response.isOverallSuccess) {
          // Handle crypto withdrawals with same flow as mobile money
          if (selectedBalanceType === 'USD') {
            // Check if crypto withdrawal requires OTP verification (same as momo)
            if (data.status === 'pending_otp_verification' && data.transactionId) {
              // Check if this is an existing pending transaction
              if (data.message && data.message.includes('ongoing withdrawal request')) {
                setModalContent({
                  type: 'error',
                  message: `Vous avez une demande de retrait crypto en attente (ID: ${data.transactionId}) qui nécessite une vérification OTP. Un nouveau code OTP a été envoyé à votre numéro enregistré. Vous pouvez valider cette transaction ou l'annuler dans la liste des transactions.`
                });
                setShowModal(true);
                setWithdrawAmount('');
                setWithdrawalFee(0);
                setTotalDeduction(0);
                setShowWithdrawForm(false);
                refreshUser();
              } else {
                // New crypto transaction - use same OTP flow as momo
                setModalContent({
                  type: 'success',
                  message: data.message || 'Demande de retrait crypto initiée. Un code OTP a été envoyé à votre numéro de téléphone. Veuillez le vérifier.',
                  onConfirm: () => {
                    navigate('/otp', {
                      state: {
                        fromWithdrawal: true,
                        withdrawalId: data.transactionId,
                        withdrawalAmount: Number(withdrawAmount),
                        withdrawalCurrency: 'USD',
                      }
                    });
                  }
                });
                setShowModal(true);
                setWithdrawAmount('');
                setWithdrawalFee(0);
                setTotalDeduction(0);
                setShowWithdrawForm(false);
              }
              return;
            } else {
              // Crypto withdrawal auto-processed (no OTP needed)
              setModalContent({
                type: 'success',
                message: `Retrait crypto initié avec succès! Montant: $${withdrawAmount} vers ${user?.cryptoWalletCurrency} (${user?.cryptoWalletAddress?.substring(0, 10)}...)`
              });
              setShowModal(true);
              setWithdrawAmount('');
              setWithdrawalFee(0);
              setTotalDeduction(0);
              setSelectedBalanceType('FCFA');
              setShowWithdrawForm(false);
              refreshUser();
              return;
            }
          }
          
          // For XAF/Mobile Money withdrawals, check for setup errors
          if (data.message && (
            data.message.includes("Mobile Money details") ||
            data.message.includes("registered Mobile Money") ||
            data.message.includes("mobile money") ||
            data.message.includes("MoMo details")
          )) {
            setModalContent({
              type: 'confirm',
              message: "Pour effectuer un retrait Mobile Money, vous devez d'abord ajouter votre numéro Mobile Money et choisir votre opérateur (MTN, Orange, etc.) dans votre profil. Voulez-vous aller à la page de modification du profil maintenant ?",
              onConfirm: () => navigate('/modifier-le-profil')
            });
            setShowModal(true);
            return;
          }

          // Handle success based on status from API response
          if (data.status === 'pending_otp_verification' && data.transactionId) {
            // Check if this is a new transaction or existing one
            if (data.message && data.message.includes('ongoing withdrawal request')) {
              // This is an existing pending transaction - show French message without navigating
              setModalContent({
                type: 'error',
                message: `Vous avez une demande de retrait en attente (ID: ${data.transactionId}) qui nécessite une vérification OTP. Un nouveau code OTP a été envoyé à votre numéro enregistré. Vous pouvez valider cette transaction ou l'annuler dans la liste des transactions.`
              });
              setShowModal(true);
              setWithdrawAmount(''); // Clear the input
              setWithdrawalFee(0); // Clear fee calculation
              setTotalDeduction(0); // Clear total deduction
              setShowWithdrawForm(false); // Hide the form
              refreshUser(); // Refresh user context
            } else {
              // This is a new transaction - proceed normally
              setModalContent({
                type: 'success',
                message: data.message || 'Demande de retrait initiée. Un code OTP a été envoyé à votre numéro de téléphone. Veuillez le vérifier.',
                onConfirm: () => {
                  navigate('/otp', {
                    state: {
                      fromWithdrawal: true,
                      withdrawalId: data.transactionId,
                      withdrawalAmount: Number(withdrawAmount),
                      withdrawalCurrency: currency,
                    }
                  });
                }
              });
              setShowModal(true);
              setWithdrawAmount(''); // Clear the input after initiating/re-sending OTP
              setWithdrawalFee(0); // Clear fee calculation
              setTotalDeduction(0); // Clear total deduction
              setShowWithdrawForm(false); // Hide the form
              refreshUser(); // Refresh user context if needed for balance update or other state
            }
          } else if (data.status === 'processing') {
            // Check if this is an existing ongoing transaction
            if (data.message && data.message.includes('ongoing')) {
              // This is an existing processing transaction - show message without navigation
              setModalContent({
                type: 'error',
                message: `Vous avez une demande de retrait en cours (ID: ${data.transactionId}) qui est actuellement en traitement. Veuillez la compléter ou l'annuler avant d'en initier une nouvelle.`
              });
              setShowModal(true);
              setWithdrawAmount(''); // Clear the input
              setWithdrawalFee(0); // Clear fee calculation
              setTotalDeduction(0); // Clear total deduction
              setShowWithdrawForm(false); // Hide the form
              refreshUser(); // Refresh user context
            } else {
              // This is a new transaction with processing status - navigate to OTP page
              setModalContent({
                type: 'success',
                message: data.message || 'Retrait initié et en cours de traitement. Un code OTP a été envoyé à votre numéro de téléphone. Veuillez le vérifier.',
                onConfirm: () => {
                  navigate('/otp', {
                    state: {
                      fromWithdrawal: true,
                      withdrawalId: data.transactionId,
                      withdrawalAmount: Number(withdrawAmount),
                      withdrawalCurrency: currency,
                    }
                  });
                }
              });
              setShowModal(true);
              setWithdrawAmount('');
              setWithdrawalFee(0);
              setTotalDeduction(0);
              setShowWithdrawForm(false);
              refreshUser(); // Refresh user context to reflect potential balance changes
            }
          } else if (data.status === 'pending') {
            // This is an existing pending transaction - show message without navigation
            setModalContent({
              type: 'error',
              message: `Vous avez une demande de retrait en attente (ID: ${data.transactionId}) qui est en cours de traitement. Veuillez la compléter ou l'annuler dans la liste des transactions avant d'en initier une nouvelle.`
            });
            setShowModal(true);
            setWithdrawAmount('');
            setWithdrawalFee(0);
            setTotalDeduction(0);
            setShowWithdrawForm(false);
            refreshUser(); // Refresh in case the existing transaction details are updated
          } else {
            setModalContent({ type: 'error', message: data.message || 'Une erreur inattendue est survenue lors de l\'initiation du retrait. Veuillez réessayer.' });
            setShowModal(true);
          }
        } else {
          // This block is for cases where handleApiResponse doesn't throw but response.isOverallSuccess is false
          const errorMessage = data?.message || 'Échec de l\'initiation du retrait.';

          // Check for Mobile Money details error in failed responses too
          if (errorMessage.includes("Mobile Money details") ||
            errorMessage.includes("registered Mobile Money") ||
            errorMessage.includes("mobile money") ||
            errorMessage.includes("MoMo details")) {
            setModalContent({
              type: 'confirm',
              message: "Pour effectuer un retrait, vous devez d'abord ajouter votre numéro Mobile Money et choisir votre opérateur (MTN, Orange, etc.) dans votre profil. Voulez-vous aller à la page de modification du profil maintenant ?",
              onConfirm: () => navigate('/modifier-le-profil')
            });
            setShowModal(true);
          } else {
            setModalContent({ type: 'error', message: errorMessage });
            setShowModal(true);
          }
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
          setModalContent({
            type: 'confirm',
            message: "Pour effectuer un retrait, vous devez d'abord ajouter votre numéro Mobile Money et choisir votre opérateur (MTN, Orange, etc.) dans votre profil. Voulez-vous aller à la page de modification du profil maintenant ?",
            onConfirm: () => navigate('/modifier-le-profil')
          });
          setShowModal(true);
        } else if (errorMessage.includes("You have reached your daily limit")) {
          setModalContent({ type: 'error', message: errorMessage });
          setShowModal(true);
        } else if (errorMessage.includes("Insufficient balance")) {
          setModalContent({ type: 'error', message: errorMessage });
          setShowModal(true);
        } else if (errorMessage.includes("ongoing withdrawal request")) {
          setModalContent({ type: 'error', message: errorMessage }); // Soft lock message, already handled in success but duplicated for safety
          setShowModal(true);
        } else {
          setModalContent({ type: 'error', message: errorMessage });
          setShowModal(true);
        }

      }
    } else {
      setModalContent({ type: 'error', message: "Veuillez entrer un montant de retrait valide." });
      setShowModal(true);
    }
  };

  const handleDeposit = () => {
    // Navigate to deposit page or show deposit modal
    navigate('/deposit');
  };

  const handleCancelTransaction = async (transactionId: string) => {
    try {
      const response = await sbcApiService.cancelWithdrawal(transactionId);
      const data = handleApiResponse(response);

      if (data && response.isOverallSuccess) {
        setModalContent({
          type: 'success',
          message: 'Transaction annulée avec succès.'
        });
        setShowModal(true);
        // Refresh transactions and user data without full page reload
        refreshUser();
        invalidateTransactions();
        invalidateStats();
        // Reset the all transactions modal data to force refresh
        setAllTransactions([]);
        setAllTransactionsPage(1);
        setAllTransactionsHasMore(true);
      } else {
        setModalContent({
          type: 'error',
          message: data?.message || 'Erreur lors de l\'annulation de la transaction.'
        });
        setShowModal(true);
      }
    } catch (err) {
      console.error('Transaction cancellation error:', err);
      let errorMessage = 'Erreur lors de l\'annulation de la transaction.';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setModalContent({ type: 'error', message: errorMessage });
      setShowModal(true);
    }
  };

  const formatTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💸';
      case 'payment': return '💳';
      case 'refund': return '🔄';
      case 'conversion': return '🔀'; // Currency conversion icon (shuffle/exchange arrows)
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
          status: (tx.status as Transaction['status']) || 'pending',
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
              <div className="text-sm opacity-80">Vos soldes</div>
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex justify-between items-center">
                  <div className={`text-2xl font-bold ${balance < 0 ? 'text-red-300' : ''}`}>
                    {balance.toLocaleString('fr-FR')} F
                  </div>
                  <div className="text-xs opacity-80">FCFA</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className={`text-xl font-bold ${usdBalance < 0 ? 'text-red-300' : ''}`}>
                    ${usdBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs opacity-80">USD</div>
                </div>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <div>
                  <div className="opacity-80">Bénéfices</div>
                  <div className="space-y-1">
                    {/* FCFA Deposits */}
                    <div className="font-bold text-xs">
                      {(Number(stats?.overall?.deposit?.completed?.currencies?.XAF?.totalAmount) || 0).toLocaleString('fr-FR')} F
                    </div>
                    {/* USD Deposits */}
                    {stats?.overall?.deposit?.completed?.currencies?.USD?.totalAmount > 0 && (
                      <div className="font-bold text-xs text-green-400">
                        ${(Number(stats?.overall?.deposit?.completed?.currencies?.USD?.totalAmount) || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="opacity-80">Retraits</div>
                  <div className="space-y-1">
                    {/* FCFA Withdrawals */}
                    <div className="font-bold text-xs">
                      {(Number(stats?.overall?.withdrawal?.completed?.currencies?.XAF?.totalAmount) || 0).toLocaleString('fr-FR')} F
                    </div>
                    {/* USD Withdrawals */}
                    {stats?.overall?.withdrawal?.completed?.currencies?.USD?.totalAmount > 0 && (
                      <div className="font-bold text-xs text-red-400">
                        ${(Number(stats?.overall?.withdrawal?.completed?.currencies?.USD?.totalAmount) || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={handleDeposit}
                className="flex-1 flex flex-col items-center justify-center bg-[#115CF6] rounded-2xl py-4 shadow hover:bg-blue-800 transition-colors"
              >
                <FaArrowUp size={20} className="mb-1" />
                <span className="text-xs font-semibold">Dépôt</span>
              </button>
              <button
                onClick={() => {
                  if (balance < 0 && usdBalance < 0) {
                    setModalContent({
                      type: 'error',
                      message: 'Impossible d\'effectuer un retrait avec des soldes négatifs. FCFA: ' + balance.toLocaleString('fr-FR') + ' F, USD: $' + usdBalance.toFixed(2)
                    });
                    setShowModal(true);
                  } else {
                    handleWithdraw();
                  }
                }}
                disabled={balance < 0 && usdBalance < 0}
                className={`flex-1 flex flex-col items-center justify-center rounded-2xl py-4 shadow transition-colors ${
                  balance < 0 && usdBalance < 0
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-[#94B027] hover:bg-green-700'
                }`}
              >
                <FaMoneyBillWave size={20} className="mb-1" />
                <span className="text-xs font-semibold">Retrait</span>
              </button>
              <button
                onClick={() => {
                  if (balance < 0 && usdBalance < 0) {
                    setModalContent({
                      type: 'error',
                      message: 'Impossible de convertir avec des soldes négatifs. FCFA: ' + balance.toLocaleString('fr-FR') + ' F, USD: $' + usdBalance.toFixed(2)
                    });
                    setShowModal(true);
                  } else {
                    setShowCurrencyConverter(true);
                  }
                }}
                disabled={balance < 0 && usdBalance < 0}
                className={`flex-1 flex flex-col items-center justify-center rounded-2xl py-4 shadow transition-colors text-white ${
                  balance < 0 && usdBalance < 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-semibold">Convertir</span>
              </button>
            </div>
            {showWithdrawForm && (
              <form onSubmit={handleWithdrawSubmit} className="mb-6 flex flex-col gap-3 bg-gray-50 rounded-2xl p-4 shadow">
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-600 font-medium mb-1">Retrait Mobile Money</div>
                  <div className="text-sm text-blue-700">
                    Choisissez votre solde. Les USD seront automatiquement convertis en FCFA pour le Mobile Money.
                  </div>
                </div>
                
                {/* Balance Selection */}
                <div className="mb-4">
                  <label className="text-gray-800 font-semibold mb-2 block">Solde à utiliser:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBalanceType('FCFA');
                        setWithdrawAmount('');
                      }}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        selectedBalanceType === 'FCFA'
                          ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xs font-medium text-blue-600">Solde Principal</div>
                      <div className={`text-lg font-bold ${balance < 0 ? 'text-red-600' : 'text-blue-800'}`}>
                        {balance.toLocaleString('fr-FR')} F
                      </div>
                      <div className="text-xs text-blue-500 mt-1">
                        {selectedBalanceType === 'FCFA' ? '✓ Sélectionné' : 'FCFA'}
                      </div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBalanceType('USD');
                        setWithdrawAmount('');
                      }}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        selectedBalanceType === 'USD'
                          ? 'bg-green-50 border-green-200 ring-2 ring-green-500'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="text-xs font-medium text-green-600">Solde USD</div>
                      <div className={`text-lg font-bold ${usdBalance < 0 ? 'text-red-600' : 'text-green-800'}`}>
                        ${usdBalance.toFixed(2)}
                      </div>
                      <div className="text-xs text-green-500 mt-1">
                        {selectedBalanceType === 'USD' ? '✓ Sélectionné' : 'USD'}
                      </div>
                    </button>
                  </div>
                </div>
                
                <label className="text-gray-800 font-semibold">Montant à retirer ({selectedBalanceType})</label>
                
                {/* Show warning if balance is negative */}
                {((selectedBalanceType === 'FCFA' && balance < 0) || (selectedBalanceType === 'USD' && usdBalance < 0)) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-3">
                    ⚠️ Impossible d'effectuer un retrait avec un solde négatif. 
                    Solde actuel: {selectedBalanceType === 'FCFA' 
                      ? `${balance.toLocaleString('fr-FR')} F` 
                      : `$${usdBalance.toFixed(2)}`}
                  </div>
                )}
                
                <div className="flex justify-between gap-2">
                  <input
                    type="number"
                    min="1"
                    value={withdrawAmount}
                    onChange={e => {
                      console.log('Input value changed to:', e.target.value);
                      setWithdrawAmount(e.target.value);
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-gray-900 text-center font-bold ${
                      ((selectedBalanceType === 'FCFA' && balance < 0) || (selectedBalanceType === 'USD' && usdBalance < 0))
                        ? 'border-red-300 bg-red-50 cursor-not-allowed' 
                        : 'border-gray-300'
                    }`}
                    placeholder={`Montant en ${selectedBalanceType}`}
                    step={selectedBalanceType === 'USD' ? '0.01' : '1'}
                    max={selectedBalanceType === 'FCFA' ? Math.max(0, balance) : Math.max(0, usdBalance)}
                    disabled={((selectedBalanceType === 'FCFA' && balance < 0) || (selectedBalanceType === 'USD' && usdBalance < 0))}
                    required
                  />
                  <button 
                    type="submit" 
                    disabled={((selectedBalanceType === 'FCFA' && balance < 0) || (selectedBalanceType === 'USD' && usdBalance < 0))}
                    className={`rounded-full p-3 font-bold shadow transition-colors ${
                      ((selectedBalanceType === 'FCFA' && balance < 0) || (selectedBalanceType === 'USD' && usdBalance < 0))
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-[#115CF6] text-white hover:bg-blue-800'
                    }`}
                  >
                    <FaMoneyBill1 size={24} />
                  </button>
                </div>

                {/* Fee calculation display */}
                {withdrawAmount && Number(withdrawAmount) > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-700">Montant à retirer:</span>
                      <span className="font-semibold text-gray-900">
                        {selectedBalanceType === 'FCFA' 
                          ? `${Number(withdrawAmount).toLocaleString('fr-FR')} F`
                          : `$${Number(withdrawAmount).toFixed(2)}`
                        }
                      </span>
                    </div>
                    {selectedBalanceType === 'FCFA' && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-700">Frais (2.5%):</span>
                        <span className="font-semibold text-orange-600">{withdrawalFee.toLocaleString('fr-FR')} F</span>
                      </div>
                    )}
                    {selectedBalanceType === 'USD' && (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-700">Méthode de retrait:</span>
                          <span className="font-semibold text-blue-600">
                            🪙 Crypto ({user?.cryptoWalletCurrency || 'Non configuré'})
                          </span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-700">Frais (2.5%):</span>
                          <span className="font-semibold text-orange-600">${withdrawalFee.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800">Total déduit du solde {selectedBalanceType}:</span>
                        <span className="font-bold text-red-600">
                          {selectedBalanceType === 'FCFA' 
                            ? `${totalDeduction.toLocaleString('fr-FR')} F`
                            : `$${totalDeduction.toFixed(2)}`
                          }
                        </span>
                      </div>
                    </div>
                    {((selectedBalanceType === 'FCFA' && balance < totalDeduction) || 
                      (selectedBalanceType === 'USD' && usdBalance < totalDeduction)) && (
                      <div className="mt-2 text-red-600 text-xs font-medium">
                        ⚠️ Solde {selectedBalanceType} insuffisant. Solde actuel: 
                        {selectedBalanceType === 'FCFA' 
                          ? `${balance.toLocaleString('fr-FR')} F`
                          : `$${usdBalance.toFixed(2)}`
                        }
                      </div>
                    )}
                  </div>
                )}
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
                              <div className="space-y-2">
                                <div>
                                  <p className="text-blue-400 font-semibold mb-1">Dépôts:</p>
                                  {dataPoint && (dataPoint.depositXAF || 0) > 0 && (
                                    <p className="text-blue-300 text-xs ml-2">
                                      FCFA: {(dataPoint.depositXAF || 0).toLocaleString('fr-FR')} F ({dataPoint.depositCountXAF || 0} tx)
                                    </p>
                                  )}
                                  {dataPoint && (dataPoint.depositUSD || 0) > 0 && (
                                    <p className="text-green-300 text-xs ml-2">
                                      USD: ${(dataPoint.depositUSD || 0).toFixed(2)} ({dataPoint.depositCountUSD || 0} tx)
                                    </p>
                                  )}
                                  <p className="text-blue-200 text-xs ml-2 font-medium">
                                    Total: {(dataPoint?.['Dépôt'] || 0).toLocaleString('fr-FR')} F ({dataPoint?.Dépôt_count || 0} tx)
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="text-yellow-400 font-semibold mb-1">Retraits:</p>
                                  {dataPoint && (dataPoint.withdrawalXAF || 0) > 0 && (
                                    <p className="text-yellow-300 text-xs ml-2">
                                      FCFA: {(dataPoint.withdrawalXAF || 0).toLocaleString('fr-FR')} F ({dataPoint.withdrawalCountXAF || 0} tx)
                                    </p>
                                  )}
                                  {dataPoint && (dataPoint.withdrawalUSD || 0) > 0 && (
                                    <p className="text-red-300 text-xs ml-2">
                                      USD: ${(dataPoint.withdrawalUSD || 0).toFixed(2)} ({dataPoint.withdrawalCountUSD || 0} tx)
                                    </p>
                                  )}
                                  <p className="text-yellow-200 text-xs ml-2 font-medium">
                                    Total: {(dataPoint?.['Retrait'] || 0).toLocaleString('fr-FR')} F ({dataPoint?.Retrait_count || 0} tx)
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-2 border-t border-gray-600 pt-2">
                                💡 USD converti à 1:500 FCFA pour le graphique
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
              <div className="mt-2 text-xs text-gray-500 text-center">
                💡 Montants USD convertis en FCFA (1:500) pour l'affichage du graphique
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
                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => openModal(tx)}
                    >
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
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <div className={`font-bold text-sm ${getCurrencyColorClass(tx.currency || 'XAF', tx.type !== 'withdrawal' && tx.type !== 'payment')} whitespace-nowrap text-right truncate`}>
                          {tx.type === 'withdrawal' || tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency || 'XAF')}
                        </div>
                        {tx.currency === 'USD' && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            USD
                          </span>
                        )}
                      </div>
                      {(tx.status === 'pending_otp_verification' || tx.status === 'pending_admin_approval') && tx.type === 'withdrawal' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalContent({
                              type: 'confirm',
                              message: 'Êtes-vous sûr de vouloir annuler cette transaction de retrait ?',
                              onConfirm: () => handleCancelTransaction(tx.transactionId || tx.id)
                            });
                            setShowModal(true);
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                          title="Annuler la transaction"
                        >
                          Annuler
                        </button>
                      )}
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
                      <div className="font-semibold mb-2" style={{ color: getStatusColor(selectedTx.status) }}>
                        {t(getStatusTranslationKey(selectedTx.status))}
                      </div>

                      {/* NEW: Approval Info Section */}
                      <TransactionApprovalInfo transaction={selectedTx} />
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-400">Montant</div>
                        {selectedTx.currency && (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            selectedTx.currency === 'USD' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedTx.currency === 'USD' ? 'USD' : 'FCFA'}
                          </span>
                        )}
                      </div>
                      <div className={`font-bold text-lg mb-2 ${String(selectedTx.type) === 'withdrawal' || String(selectedTx.type) === 'payment' ? 'text-red-500' : 'text-green-600'
                        }`}>
                        {String(selectedTx.type) === 'withdrawal' || String(selectedTx.type) === 'payment' ? '-' : '+'}{formatCurrency(selectedTx.amount, selectedTx.currency || 'XAF')}
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
                      {(selectedTx.status === 'pending_otp_verification' || selectedTx.status === 'pending_admin_approval') && selectedTx.type === 'withdrawal' && (
                        <button
                          className="flex-1 bg-red-500 text-white rounded-xl py-2 font-bold shadow hover:bg-red-600 transition-colors"
                          onClick={() => {
                            setModalContent({
                              type: 'confirm',
                              message: 'Êtes-vous sûr de vouloir annuler cette transaction de retrait ?',
                              onConfirm: () => {
                                handleCancelTransaction(selectedTx.transactionId || selectedTx.id);
                                closeModal();
                              }
                            });
                            setShowModal(true);
                          }}
                        >
                          Annuler
                        </button>
                      )}
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
                            className="flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <div
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                              onClick={() => {
                                openModal(tx);
                              }}
                            >
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
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-end gap-1">
                                <div className={`font-bold text-sm ${getCurrencyColorClass(tx.currency || 'XAF', tx.type !== 'withdrawal' && tx.type !== 'payment')} whitespace-nowrap text-right truncate`}>
                                  {tx.type === 'withdrawal' || tx.type === 'payment' ? '-' : '+'}{formatCurrency(tx.amount, tx.currency || 'XAF')}
                                </div>
                                {tx.currency === 'USD' && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                    USD
                                  </span>
                                )}
                              </div>
                              {(tx.status === 'pending_otp_verification' || tx.status === 'pending_admin_approval') && tx.type === 'withdrawal' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setModalContent({
                                      type: 'confirm',
                                      message: 'Êtes-vous sûr de vouloir annuler cette transaction de retrait ?',
                                      onConfirm: () => handleCancelTransaction(tx.transactionId || tx.id)
                                    });
                                    setShowModal(true);
                                  }}
                                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                                  title="Annuler la transaction"
                                >
                                  Annuler
                                </button>
                              )}
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

            {/* New: Generic Info/Confirmation Modal */}
            {showModal && modalContent && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative shadow-lg"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0.2 }}
                >
                  <h4 className={`text-lg font-bold mb-4 text-center ${modalContent.type === 'success' ? 'text-green-600' :
                    modalContent.type === 'error' ? 'text-red-600' : 'text-gray-800'
                    }`}>
                    {modalContent.type === 'success' ? 'Succès' :
                      modalContent.type === 'error' ? 'Erreur' : 'Confirmation'}
                  </h4>
                  <p className="text-sm text-gray-700 text-center mb-4">
                    {modalContent.message}
                  </p>
                  {modalContent.type === 'confirm' ? (
                    <div className="flex gap-3 mt-2">
                      <button
                        type="button"
                        className="flex-1 bg-red-500 text-white rounded-xl py-2 font-bold shadow hover:bg-red-600 transition-colors"
                        onClick={() => {
                          modalContent.onConfirm?.();
                          setShowModal(false);
                        }}
                      >
                        Confirmer
                      </button>
                      <button
                        type="button"
                        className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                        onClick={() => setShowModal(false)}
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full bg-blue-500 text-white rounded-xl py-2 font-bold shadow hover:bg-blue-600 transition-colors"
                      onClick={() => {
                        modalContent.onConfirm?.();
                        setShowModal(false);
                      }}
                    >
                      Fermer
                    </button>
                  )}
                </motion.div>
              </motion.div>
            )}
          </>
        )}
        <TourButton />

        {/* Currency Converter Modal */}
        <CurrencyConverterComponent
          isOpen={showCurrencyConverter}
          onClose={() => setShowCurrencyConverter(false)}
          onConversionComplete={() => {
            // Just refresh user data, no page reload
            refreshUser();
          }}
        />
      </div>
    </ProtectedRoute>
  )
}

export default Wallet;
