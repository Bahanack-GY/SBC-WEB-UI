import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { FaBitcoin, FaMobileAlt, FaTimes, FaCheck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { countrySupportsMomo, getCountryByCode } from '../utils/countriesData';
import { isOngoingWithdrawal, canCancelWithdrawal, getStatusDescription } from '../utils/transactionHelpers';

interface PendingWithdrawal {
  _id: string;
  transactionId?: string;
  amount: number;
  currency: string;
  status: string;
  withdrawalType?: 'mobile_money' | 'crypto';
  createdAt: string;
}

interface WithdrawalType {
  id: 'mobile_money' | 'crypto';
  name: string;
  icon: React.ReactNode;
  description: string;
  minAmount: number;
  currency: string;
  requirements: string[];
}

interface UnifiedWithdrawalComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onWithdrawalComplete: () => void;
}

const getWithdrawalTypes = (userCountrySupportsMomo: boolean): WithdrawalType[] => {
  const types: WithdrawalType[] = [];
  
  // Always add crypto option (available for all countries)
  types.push({
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: <FaBitcoin size={24} />,
    description: 'Withdraw to your crypto wallet',
    minAmount: 10,
    currency: 'USD',
    requirements: [
      'Minimum: $10 USD',
      'No multiple requirement',
      'Uses saved crypto wallet details',
      'Available in all African countries'
    ]
  });
  
  // Only add mobile money option if country supports it
  if (userCountrySupportsMomo) {
    types.push({
      id: 'mobile_money',
      name: 'Mobile Money',
      icon: <FaMobileAlt size={24} />,
      description: 'Withdraw to your mobile money account',
      minAmount: 500,
      currency: 'XAF',
      requirements: [
        'Minimum: 500 XAF',
        'Must be multiple of 5',
        'Uses saved mobile money details',
        'Available in your country'
      ]
    });
  }
  
  return types;
};

const UnifiedWithdrawalComponent: React.FC<UnifiedWithdrawalComponentProps> = ({
  isOpen,
  onClose
}) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedType, setSelectedType] = useState<'mobile_money' | 'crypto' | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'select' | 'configure' | 'amount' | 'success' | 'pending'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isInitiating, setIsInitiating] = useState(false); // Prevent double-clicks

  // Mobile money states
  const [momoNumber, setMomoNumber] = useState('');
  const [momoOperator, setMomoOperator] = useState('');

  // Crypto states
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('BTC');

  // OTP states
  const [transactionId, setTransactionId] = useState('');

  // Pending withdrawal state
  const [pendingWithdrawal, setPendingWithdrawal] = useState<PendingWithdrawal | null>(null);
  const [checkingPending, setCheckingPending] = useState(false);
  

  const balance = user?.balance || 0;
  const usdBalance = user?.usdBalance || 0;
  
  // Check if user's country supports mobile money
  const userCountrySupportsMomo = useMemo(() => {
    if (!user?.country) return false;
    return countrySupportsMomo(user.country);
  }, [user?.country]);
  
  // Get available withdrawal types based on user's country
  const availableWithdrawalTypes = useMemo(() => {
    return getWithdrawalTypes(userCountrySupportsMomo);
  }, [userCountrySupportsMomo]);

  // Check for pending withdrawals
  const checkPendingWithdrawals = async () => {
    setCheckingPending(true);
    try {
      const response = await sbcApiService.getPendingWithdrawals();
      const data = handleApiResponse(response);

      if (data && data.transactions && data.transactions.length > 0) {
        // Find the first ongoing withdrawal
        const ongoing = data.transactions.find((t: PendingWithdrawal) => isOngoingWithdrawal(t.status));
        if (ongoing) {
          setPendingWithdrawal(ongoing);
          setStep('pending');
          return true;
        }
      }
      setPendingWithdrawal(null);
      return false;
    } catch (err) {
      // If we can't check, allow proceeding but show warning
      console.error('Failed to check pending withdrawals:', err);
      setPendingWithdrawal(null);
      return false;
    } finally {
      setCheckingPending(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedType(null);
      setAmount('');
      setError('');
      setSuccess('');
      setTransactionId('');
      setIsInitiating(false);
      setPendingWithdrawal(null);

      // Load saved user data
      if (user) {
        setMomoNumber(user.momoNumber || '');
        setMomoOperator(user.momoOperator || '');
        setCryptoAddress(user.cryptoWalletAddress || '');
        setCryptoCurrency(user.cryptoWalletCurrency || 'BTC');
      }

      // Check for pending withdrawals first
      checkPendingWithdrawals().then(hasPending => {
        if (!hasPending) {
          setStep('select');
        }
      });
    }
  }, [isOpen, user]);

  const handleTypeSelect = (type: 'mobile_money' | 'crypto') => {
    // Extra check: prevent mobile money selection if country doesn't support it
    if (type === 'mobile_money' && !userCountrySupportsMomo) {
      setError('Mobile Money is not available in your country. Please use cryptocurrency withdrawal.');
      return;
    }
    
    setSelectedType(type);
    setError('');
    
    // Check if user has required configuration
    if (type === 'mobile_money' && (!user?.momoNumber || !user?.momoOperator)) {
      setStep('configure');
    } else if (type === 'crypto' && (!user?.cryptoWalletAddress || !user?.cryptoWalletCurrency)) {
      setStep('configure');
    } else {
      setStep('amount');
    }
  };

  const handleConfigurationSave = async () => {
    if (!selectedType) return;

    setLoading(true);
    setError('');

    try {
      if (selectedType === 'mobile_money') {
        if (!momoNumber || !momoOperator) {
          setError('Please fill in all mobile money details');
          return;
        }
        await sbcApiService.updateMomoDetails(momoNumber, momoOperator);
      } else if (selectedType === 'crypto') {
        if (!cryptoAddress || !cryptoCurrency) {
          setError('Please fill in all crypto wallet details');
          return;
        }
        await sbcApiService.updateCryptoWallet({
          cryptoWalletAddress: cryptoAddress,
          cryptoWalletCurrency: cryptoCurrency
        });
      }

      await refreshUser();
      setStep('amount');
      setSuccess('Configuration saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (): boolean => {
    if (!selectedType || !amount) return false;

    const withdrawalType = availableWithdrawalTypes.find(t => t.id === selectedType)!;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (numAmount < withdrawalType.minAmount) {
      setError(`Minimum ${withdrawalType.name} withdrawal: ${withdrawalType.minAmount} ${withdrawalType.currency}`);
      return false;
    }

    // Check available balance
    const availableBalance = selectedType === 'crypto' ? usdBalance : balance;
    if (numAmount > availableBalance) {
      setError(`Insufficient balance. Available: ${availableBalance.toFixed(2)} ${withdrawalType.currency}`);
      return false;
    }

    // Mobile money specific validation
    if (selectedType === 'mobile_money' && numAmount % 5 !== 0) {
      setError('Mobile money amount must be a multiple of 5');
      return false;
    }

    return true;
  };

  const handleWithdrawalInitiate = async () => {
    // Prevent double-clicks
    if (isInitiating) return;
    if (!validateAmount() || !selectedType) return;

    setIsInitiating(true);
    setLoading(true);
    setError('');

    try {
      const response = await sbcApiService.initiateUnifiedWithdrawal(
        parseFloat(amount),
        selectedType
      );

      const data = handleApiResponse(response);

      if (data && data.transactionId) {
        // Check if OTP verification is required
        if (data.status === 'pending_otp_verification') {
          const withdrawalType = availableWithdrawalTypes.find(t => t.id === selectedType)!;
          navigate('/otp', {
            state: {
              withdrawalId: data.transactionId,
              withdrawalAmount: parseFloat(amount),
              withdrawalCurrency: withdrawalType.currency,
              flow: 'withdrawal'
            }
          });
          onClose();
        } else {
          // Handle other statuses - might be auto-processed
          onClose();
          // Could show a success message or handle differently based on status
        }
      } else {
        throw new Error('Failed to initiate withdrawal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate withdrawal');
      setIsInitiating(false); // Allow retry on error
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation to OTP page for pending withdrawal
  const handleContinuePendingWithdrawal = () => {
    if (!pendingWithdrawal) return;

    const txId = pendingWithdrawal.transactionId || pendingWithdrawal._id;

    if (pendingWithdrawal.status === 'pending_otp_verification') {
      navigate('/otp', {
        state: {
          withdrawalId: txId,
          withdrawalAmount: pendingWithdrawal.amount,
          withdrawalCurrency: pendingWithdrawal.currency,
          flow: 'withdrawal'
        }
      });
      onClose();
    }
  };

  // Handle cancellation of pending withdrawal
  const handleCancelPendingWithdrawal = async () => {
    if (!pendingWithdrawal) return;

    const txId = pendingWithdrawal.transactionId || pendingWithdrawal._id;

    // Check if cancellation is allowed
    if (!canCancelWithdrawal(pendingWithdrawal.status)) {
      setError('Cette transaction ne peut plus être annulée car elle est en cours de traitement par l\'administrateur.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sbcApiService.cancelWithdrawal(txId);
      setSuccess('Retrait annulé avec succès');
      setPendingWithdrawal(null);
      await refreshUser();

      // Allow new withdrawal after short delay
      setTimeout(() => {
        setStep('select');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'annulation');
    } finally {
      setLoading(false);
    }
  };

  

  const handleCancel = async () => {
    if (transactionId) {
      try {
        await sbcApiService.cancelWithdrawal(transactionId);
        setSuccess('Withdrawal cancelled successfully');
      } catch (err) {
        // Handle error silently
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const selectedTypeInfo = selectedType ? availableWithdrawalTypes.find(t => t.id === selectedType)! : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">
            {step === 'select' && 'Select Withdrawal Type'}
            {step === 'configure' && `Configure ${selectedTypeInfo?.name}`}
            {step === 'amount' && `${selectedTypeInfo?.name} Withdrawal`}
            {step === 'success' && 'Success!'}
            {step === 'pending' && 'Retrait en cours'}
          </h3>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Select Withdrawal Type */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-6">
                Choose your preferred withdrawal method:
              </p>

              {availableWithdrawalTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleTypeSelect(type.id)}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                >
                  <div className="flex items-start space-x-4">
                    <div className="text-blue-600 mt-1">{type.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{type.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{type.description}</p>
                      <div className="text-xs text-gray-500">
                        {type.requirements.map((req, index) => (
                          <div key={index}>• {req}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {/* Show message if mobile money is not available */}
              {!userCountrySupportsMomo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 text-xl">📱</div>
                    <div>
                      <div className="font-medium text-yellow-800 mb-1">Mobile Money non disponible</div>
                      <div className="text-sm text-yellow-700 mb-2">
                        Mobile Money n'est pas encore pris en charge pour votre pays. 
                        {user?.country ? ` (${getCountryByCode(user.country)?.value || user.country})` : ''}
                      </div>
                      <div className="text-sm text-yellow-600">
                        ✅ <strong>Alternative :</strong> Utilisez les retraits crypto qui sont disponibles dans tous les pays africains.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Balance Display */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-semibold text-gray-900 mb-2">Available Balances</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>FCFA Balance:</span>
                    <span className="font-medium">{balance.toLocaleString('fr-FR')} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>USD Balance:</span>
                    <span className="font-medium">${usdBalance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 'configure' && selectedTypeInfo && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-blue-600">{selectedTypeInfo.icon}</div>
                <h4 className="font-semibold text-gray-900">{selectedTypeInfo.name} Setup</h4>
              </div>

              {selectedType === 'mobile_money' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Money Number
                    </label>
                    <input
                      type="text"
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(e.target.value)}
                      placeholder="e.g., 237675080477"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include country code (e.g., 237 for Cameroon)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Money Operator
                    </label>
                    <select
                      value={momoOperator}
                      onChange={(e) => setMomoOperator(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Operator</option>
                      <option value="MTN">MTN</option>
                      <option value="ORANGE">Orange</option>
                      <option value="MOOV">Moov</option>
                      <option value="WAVE">Wave</option>
                      <option value="FREE">Free</option>
                      <option value="TMONEY">T-Money</option>
                      <option value="FLOOZ">Flooz</option>
                      <option value="MPESA">M-Pesa</option>
                      <option value="AIRTEL">Airtel</option>
                    </select>
                  </div>
                </>
              )}

              {selectedType === 'crypto' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Crypto Wallet Address
                    </label>
                    <input
                      type="text"
                      value={cryptoAddress}
                      onChange={(e) => setCryptoAddress(e.target.value)}
                      placeholder="Enter your wallet address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cryptocurrency
                    </label>
                    <select
                      value={cryptoCurrency}
                      onChange={(e) => setCryptoCurrency(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BTC">Bitcoin</option>
                      <option value="LTC">Litecoin</option>
                      <option value="XRP">Ripple</option>
                      <option value="TRX">TRON</option>
                      <option value="USDTSOL">USDT (Solana)</option>
                      <option value="USDTBSC">USDT (BSC-BEP20)</option>
                      <option value="BNBBSC">BNB (BSC-BEP20)</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={handleConfigurationSave}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <FaSpinner className="animate-spin mr-2" /> : null}
                Save Configuration
              </button>
            </div>
          )}

          {/* Step 3: Amount Entry */}
          {step === 'amount' && selectedTypeInfo && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-blue-600">{selectedTypeInfo.icon}</div>
                <h4 className="font-semibold text-gray-900">{selectedTypeInfo.name} Withdrawal</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({selectedTypeInfo.currency})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Minimum: ${selectedTypeInfo.minAmount} ${selectedTypeInfo.currency}`}
                  min={selectedTypeInfo.minAmount}
                  step={selectedType === 'mobile_money' ? '5' : '0.01'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  <div>Available: {selectedType === 'crypto' 
                    ? `$${usdBalance.toFixed(2)}`
                    : `${balance.toLocaleString('fr-FR')} F`
                  }</div>
                  <div>Minimum: {selectedTypeInfo.minAmount} {selectedTypeInfo.currency}</div>
                </div>
              </div>

              {/* Requirements */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h5 className="font-semibold text-gray-900 mb-2">Requirements:</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  {selectedTypeInfo.requirements.map((req, index) => (
                    <li key={index}>• {req}</li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleWithdrawalInitiate}
                disabled={loading || !amount || isInitiating}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {(loading || isInitiating) ? <FaSpinner className="animate-spin mr-2" /> : null}
                {isInitiating ? 'Traitement en cours...' : 'Initiate Withdrawal'}
              </button>
            </div>
          )}

          {/* Pending Withdrawal Step */}
          {step === 'pending' && pendingWithdrawal && (
            <div className="space-y-4">
              {/* Warning Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <FaExclamationTriangle className="text-orange-500" size={28} />
                </div>
              </div>

              <div className="text-center">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Vous avez un retrait en cours
                </h4>
                <p className="text-sm text-gray-600">
                  Vous devez compléter ou annuler cette transaction avant d'en initier une nouvelle.
                </p>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Montant:</span>
                  <span className="font-semibold text-gray-900">
                    {pendingWithdrawal.amount.toLocaleString('fr-FR')} {pendingWithdrawal.currency}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-semibold text-gray-900">
                    {pendingWithdrawal.withdrawalType === 'crypto' ? 'Crypto' : 'Mobile Money'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Statut:</span>
                  <span className={`font-semibold ${
                    pendingWithdrawal.status === 'pending_otp_verification' ? 'text-orange-600' :
                    pendingWithdrawal.status === 'pending_admin_approval' ? 'text-blue-600' :
                    pendingWithdrawal.status === 'processing' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {getStatusDescription(pendingWithdrawal.status)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-mono text-xs text-gray-500">
                    {(pendingWithdrawal.transactionId || pendingWithdrawal._id).slice(-8)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Continue to OTP - only if pending OTP verification */}
                {pendingWithdrawal.status === 'pending_otp_verification' && (
                  <button
                    onClick={handleContinuePendingWithdrawal}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                  >
                    {loading ? <FaSpinner className="animate-spin mr-2" /> : null}
                    Continuer la vérification OTP
                  </button>
                )}

                {/* Cancel button - only if cancellation is allowed */}
                {canCancelWithdrawal(pendingWithdrawal.status) ? (
                  <button
                    onClick={handleCancelPendingWithdrawal}
                    disabled={loading}
                    className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                  >
                    {loading ? <FaSpinner className="animate-spin mr-2" /> : null}
                    Annuler le retrait
                  </button>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-blue-700 text-sm text-center">
                      <strong>Information:</strong> Cette transaction est en cours de traitement par l'administrateur et ne peut plus être annulée.
                    </p>
                  </div>
                )}

                {/* Close button */}
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Checking for pending withdrawals */}
          {checkingPending && (
            <div className="flex flex-col items-center justify-center py-8">
              <FaSpinner className="animate-spin text-blue-600 mb-3" size={32} />
              <p className="text-gray-600 text-sm">Vérification des transactions en cours...</p>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCheck className="text-green-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Withdrawal Successful!</h4>
              <p className="text-sm text-gray-600">
                Your withdrawal has been processed successfully. You will receive your funds shortly.
              </p>
              <p className="text-xs text-gray-500">
                Transaction ID: {transactionId}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && !error && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Important Notes */}
          {step === 'select' && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-semibold text-yellow-800 mb-2">Important Notes:</h5>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Maximum 3 successful withdrawals per 24 hours (all types combined)</li>
                <li>• Processing time: 1-5 minutes for mobile money, 15-30 minutes for crypto</li>
                <li>• All withdrawals require OTP verification via email/SMS</li>
                <li>• Ensure your saved payment details are correct before withdrawing</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedWithdrawalComponent;