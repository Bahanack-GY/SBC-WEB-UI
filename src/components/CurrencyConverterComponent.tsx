import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLoader, FiRefreshCw } from 'react-icons/fi';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import NotificationToast from './common/NotificationToast';
import { 
  parseBalanceConversionError, 
  validateConversionAmount, 
  formatBalance,
  formatConversionRate,
  calculateConversionPreview,
  EXCHANGE_RATES 
} from '../utils/balanceHelpers';

interface CurrencyConverterProps {
  isOpen: boolean;
  onClose: () => void;
  onConversionComplete: () => void;
}

interface NotificationState {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

const CurrencyConverterComponent: React.FC<CurrencyConverterProps> = ({
  isOpen,
  onClose,
  onConversionComplete,
}) => {
  const { user, refreshUser } = useAuth();
  const [fromCurrency, setFromCurrency] = useState<'FCFA' | 'USD'>('FCFA');
  const [toCurrency, setToCurrency] = useState<'FCFA' | 'USD'>('USD');
  const [amount, setAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  const balance = user?.balance || 0;
  const usdBalance = user?.usdBalance || 0;

  const maxAmount = fromCurrency === 'FCFA' ? balance : usdBalance;

  const handleCurrencySwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setAmount('');
    setConvertedAmount(null);
    setError(null);
  };

  const handlePreviewConversion = async () => {
    // Validate amount using helper function with correct signature
    const validation = validateConversionAmount(Number(amount), maxAmount, fromCurrency, toCurrency);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use client-side calculation with fixed rates from API guide
      const preview = calculateConversionPreview(Number(amount), fromCurrency, toCurrency);
      setConvertedAmount(preview.convertedAmount);
    } catch (err) {
      console.error('Conversion preview error:', err);
      const conversionError = parseBalanceConversionError(err);
      setError(conversionError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmConversion = async () => {
    if (!convertedAmount) {
      setError('Veuillez d\'abord prévisualiser la conversion');
      return;
    }

    // Re-validate before conversion
    const validation = validateConversionAmount(Number(amount), maxAmount, fromCurrency, toCurrency);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    setConverting(true);
    setError(null);

    try {
      // Use the proper internal conversion endpoints from API guide
      const response = await sbcApiService.convertUserBalance(
        Number(amount),
        fromCurrency,
        toCurrency
      );
      const data = handleApiResponse(response);
      
      if (data && response.isOverallSuccess) {
        // Refresh user data to get updated balances
        await refreshUser();
        onConversionComplete();
        
        // Show success notification
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Conversion réussie!',
          message: `${formatBalance(Number(amount), fromCurrency)} → ${formatBalance(convertedAmount!, toCurrency)}`
        });
        
        // Reset form
        setAmount('');
        setConvertedAmount(null);
        setError(null);
        
        onClose();
      } else {
        const conversionError = parseBalanceConversionError(new Error(data?.message || 'Conversion failed'));
        setError(conversionError.message);
        
        // Show error notification
        setNotification({
          isOpen: true,
          type: 'error',
          title: 'Échec de la conversion',
          message: conversionError.message
        });
      }
    } catch (err) {
      console.error('Conversion error:', err);
      const conversionError = parseBalanceConversionError(err);
      setError(conversionError.message);
      
      // Show error notification
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Erreur de conversion',
        message: conversionError.message
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-4 w-full max-w-sm text-gray-900 relative shadow-lg max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.2 }}
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                onClick={onClose}
              >
                <FiX size={20} />
              </button>

              <h2 className="text-lg font-bold mb-4 text-center pr-6">Convertir</h2>
              
              {/* Current Balances - Compact */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-600">FCFA</div>
                    <div className="font-bold text-blue-600">{balance.toLocaleString('fr-FR')} F</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">USD</div>
                    <div className="font-bold text-green-600">${usdBalance.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Exchange Rate Info - Compact */}
              <div className="mb-4 p-2 bg-blue-50 rounded-lg text-center">
                <div className="text-xs text-blue-600">
                  USD→FCFA: 1$ = {EXCHANGE_RATES.DISPLAY.USD_TO_XAF_RATE}F • FCFA→USD: {EXCHANGE_RATES.DISPLAY.XAF_TO_USD_RATE}F = 1$
                </div>
              </div>

              {/* Conversion Form - Compact */}
              <div className="space-y-3">
                {/* From Currency Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-700">De: {fromCurrency}</label>
                    <button
                      onClick={handleCurrencySwap}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Inverser"
                    >
                      <FiRefreshCw size={16} />
                    </button>
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setConvertedAmount(null);
                      setError(null);
                    }}
                    placeholder={`Montant en ${fromCurrency}`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    max={maxAmount}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Disponible: {maxAmount.toLocaleString('fr-FR')} {fromCurrency}
                  </div>
                </div>

                {/* To Currency Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vers: {toCurrency}</label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg min-h-[2.5rem] flex items-center">
                    {convertedAmount !== null ? (
                      <div className="w-full">
                        <div className="font-bold">
                          {formatBalance(convertedAmount, toCurrency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatConversionRate(Number(amount), fromCurrency, convertedAmount, toCurrency)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">Montant converti</span>
                    )}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-xs">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handlePreviewConversion}
                    disabled={loading || !amount}
                    className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? <FiLoader className="animate-spin mr-1" size={14} /> : null}
                    Prévisualiser
                  </button>
                  <button
                    onClick={handleConfirmConversion}
                    disabled={converting || !convertedAmount}
                    className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {converting ? <FiLoader className="animate-spin mr-1" size={14} /> : null}
                    Convertir
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <NotificationToast
        isOpen={notification.isOpen}
        onClose={() => setNotification(prev => ({ ...prev, isOpen: false }))}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </>
  );
};

export default CurrencyConverterComponent;