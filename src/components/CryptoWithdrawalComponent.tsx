import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLoader, FiInfo } from 'react-icons/fi';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { 
  validateCryptoAmount, 
  formatBalance,
  CRYPTO_MINIMUMS 
} from '../utils/balanceHelpers';

interface CryptoWithdrawalProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawalComplete: () => void;
}

interface CryptoEstimate {
  cryptoAmount: number;
  currency: string;
  networkFee: number;
  exchangeRate: number;
  minimumAmount: number;
}

const CryptoWithdrawalComponent: React.FC<CryptoWithdrawalProps> = ({
  isOpen,
  onClose,
  onWithdrawalComplete,
}) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [usdAmount, setUsdAmount] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [supportedCryptos, setSupportedCryptos] = useState<string[]>([]);
  const [estimate, setEstimate] = useState<CryptoEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [checkingLimits, setCheckingLimits] = useState(false);
  const [withdrawalLimits, setWithdrawalLimits] = useState<{ allowed: boolean; remainingTransactions?: number; reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usdBalance = user?.usdBalance || 0;

  // Load supported cryptocurrencies on mount
  useEffect(() => {
    const loadSupportedCryptos = async () => {
      try {
        const response = await sbcApiService.getSupportedCryptocurrencies();
        const data = handleApiResponse(response);
        if (data && data.currencies) {
          setSupportedCryptos(data.currencies);
          setSelectedCrypto(data.currencies[0] || 'BTC');
        }
      } catch (err) {
        console.error('Failed to load supported cryptocurrencies:', err);
        // Fallback to common cryptos
        setSupportedCryptos(['BTC', 'LTC', 'XRP', 'TRX', 'USDTSOL', 'USDTBSC', 'BNBBSC']);
      }
    };

    if (isOpen) {
      loadSupportedCryptos();
    }
  }, [isOpen]);

  const handleCheckLimits = async () => {
    if (!usdAmount || Number(usdAmount) <= 0) {
      setError('Veuillez entrer un montant USD valide');
      return;
    }

    const validation = validateCryptoAmount(Number(usdAmount), selectedCrypto, usdBalance);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    setCheckingLimits(true);
    setError(null);
    setWithdrawalLimits(null);

    try {
      const response = await sbcApiService.checkCryptoWithdrawalLimits(Number(usdAmount));
      const data = handleApiResponse(response);
      
      if (data) {
        setWithdrawalLimits(data);
        if (!data.allowed) {
          setError(data.reason || 'Retrait non autorisé');
        }
      } else {
        setError('Impossible de vérifier les limites de retrait');
      }
    } catch (err) {
      console.error('Withdrawal limits check error:', err);
      setError('Erreur lors de la vérification des limites');
    } finally {
      setCheckingLimits(false);
    }
  };

  const handleGetEstimate = async () => {
    if (!withdrawalLimits || !withdrawalLimits.allowed) {
      setError('Veuillez d\'abord vérifier les limites de retrait');
      return;
    }

    setEstimating(true);
    setError(null);
    setEstimate(null);

    try {
      const response = await sbcApiService.getCryptoPayoutEstimate(Number(usdAmount), selectedCrypto);
      const data = handleApiResponse(response);
      
      if (data && data.estimate) {
        setEstimate(data.estimate);
      } else {
        setError('Impossible d\'obtenir l\'estimation crypto');
      }
    } catch (err) {
      console.error('Crypto estimate error:', err);
      setError('Erreur lors de l\'estimation crypto');
    } finally {
      setEstimating(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!estimate || !cryptoAddress) {
      setError('Veuillez remplir tous les champs et obtenir une estimation');
      return;
    }

    if (!withdrawalLimits || !withdrawalLimits.allowed) {
      setError('Limites de retrait non vérifiées ou dépassées');
      return;
    }

    setWithdrawing(true);
    setError(null);

    try {
      const payoutData = {
        amount: Number(usdAmount),
        cryptoCurrency: selectedCrypto,
        cryptoAddress: cryptoAddress,
        description: `${selectedCrypto} withdrawal`
      };

      const response = await sbcApiService.requestCryptoPayout(payoutData);
      const data = handleApiResponse(response);
      
      if (data && response.isOverallSuccess) {
        // Check if OTP verification is required
        if (data.status === 'pending_otp_verification' && data.transactionId) {
          // Navigate to OTP verification page
          navigate('/withdrawal-otp-verification', {
            state: {
              transactionId: data.transactionId,
              withdrawalType: 'crypto' as const,
              amount: Number(usdAmount),
              currency: selectedCrypto
            }
          });
          
          // Reset form and close modal
          setUsdAmount('');
          setCryptoAddress('');
          setEstimate(null);
          setWithdrawalLimits(null);
          setError(null);
          onClose();
        } else {
          // For other statuses, handle normally
          await refreshUser();
          onWithdrawalComplete();
          
          // Reset form
          setUsdAmount('');
          setCryptoAddress('');
          setEstimate(null);
          setWithdrawalLimits(null);
          setError(null);
          
          onClose();
        }
      } else {
        setError(data?.message || 'Erreur lors du retrait crypto');
      }
    } catch (err) {
      console.error('Crypto withdrawal error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erreur lors du retrait crypto');
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const minAmount = CRYPTO_MINIMUMS.USD;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-[90vw] max-w-md text-gray-900 relative shadow-lg max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2 }}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
              onClick={onClose}
            >
              <FiX size={22} />
            </button>

            <h2 className="text-xl font-bold mb-4 text-center">Retrait Crypto</h2>

            {/* USD Balance Display */}
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-sm font-semibold mb-2 text-green-600">Solde USD disponible:</h3>
              <div className="text-2xl font-bold text-green-800">
                ${formatBalance(usdBalance, 'USD').replace('$', '')}
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant USD à retirer
              </label>
              <input
                type="number"
                value={usdAmount}
                onChange={(e) => {
                  setUsdAmount(e.target.value);
                  setEstimate(null);
                  setWithdrawalLimits(null);
                  setError(null);
                }}
                placeholder={`Minimum $${minAmount} USD`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                min={minAmount}
                step="0.01"
              />
              <div className="text-xs text-gray-500 mt-1">
                Minimum: ${minAmount} USD
              </div>
            </div>

            {/* Cryptocurrency Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cryptomonnaie
              </label>
              <select
                value={selectedCrypto}
                onChange={(e) => {
                  setSelectedCrypto(e.target.value);
                  setEstimate(null);
                  setWithdrawalLimits(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {supportedCryptos.map(crypto => (
                  <option key={crypto} value={crypto}>{crypto}</option>
                ))}
              </select>
            </div>

            {/* Crypto Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse {selectedCrypto}
              </label>
              <input
                type="text"
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                placeholder={`Votre adresse ${selectedCrypto}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="text-xs text-yellow-600 mt-1 flex items-center">
                <FiInfo size={12} className="mr-1" />
                Vérifiez bien l'adresse avant de confirmer
              </div>
            </div>

            {/* Check Limits Button */}
            <div className="mb-4">
              <button
                onClick={handleCheckLimits}
                disabled={checkingLimits || !usdAmount || !selectedCrypto}
                className="w-full bg-purple-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {checkingLimits ? (
                  <FiLoader className="animate-spin mr-2" />
                ) : null}
                Vérifier les limites
              </button>
            </div>

            {/* Withdrawal Limits Display */}
            {withdrawalLimits && (
              <div className={`mb-4 p-4 border rounded-lg ${
                withdrawalLimits.allowed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <h4 className={`text-sm font-semibold mb-2 ${
                  withdrawalLimits.allowed ? 'text-green-800' : 'text-red-800'
                }`}>
                  Statut des limites de retrait
                </h4>
                {withdrawalLimits.allowed ? (
                  <div className="space-y-1 text-sm text-green-700">
                    <div>✅ Retrait autorisé</div>
                    {withdrawalLimits.remainingTransactions !== undefined && (
                      <div>Retraits restants aujourd'hui: {withdrawalLimits.remainingTransactions}/3</div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    ❌ {withdrawalLimits.reason}
                  </div>
                )}
              </div>
            )}

            {/* Get Estimate Button */}
            <div className="mb-4">
              <button
                onClick={handleGetEstimate}
                disabled={estimating || !withdrawalLimits?.allowed || !usdAmount || !selectedCrypto}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {estimating ? (
                  <FiLoader className="animate-spin mr-2" />
                ) : null}
                Obtenir l'estimation
              </button>
            </div>

            {/* Estimate Display */}
            {estimate && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">Estimation de retrait</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <div className="flex justify-between">
                    <span>Montant crypto:</span>
                    <span className="font-medium">{estimate.cryptoAmount} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frais réseau:</span>
                    <span className="font-medium">{estimate.networkFee} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taux de change:</span>
                    <span className="font-medium">${estimate.exchangeRate.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Confirm Withdrawal Button */}
            <button
              onClick={handleConfirmWithdrawal}
              disabled={withdrawing || !estimate || !cryptoAddress || !withdrawalLimits?.allowed}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {withdrawing ? (
                <FiLoader className="animate-spin mr-2" />
              ) : null}
              Confirmer le retrait
            </button>

            {/* Important Notes */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-semibold text-yellow-800 mb-2 text-sm">Important:</h5>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Minimum de retrait: $10 USD</li>
                <li>• Frais de retrait: 2.5% du montant</li>
                <li>• Maximum 3 retraits réussis par 24h (tous types)</li>
                <li>• Vérifiez l'adresse crypto avant de confirmer</li>
                <li>• Les retraits crypto utilisent votre solde USD</li>
                <li>• Temps de traitement: 30 minutes à 2 heures</li>
                <li>• Les frais réseau sont inclus dans l'estimation</li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CryptoWithdrawalComponent;