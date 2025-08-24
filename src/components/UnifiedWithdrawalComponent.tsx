import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import { FaWallet, FaBitcoin, FaMobileAlt, FaTimes, FaCheck, FaSpinner } from 'react-icons/fa';

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

const WITHDRAWAL_TYPES: WithdrawalType[] = [
  {
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
      'Available in 14+ African countries'
    ]
  },
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: <FaBitcoin size={24} />,
    description: 'Withdraw to your crypto wallet',
    minAmount: 15,
    currency: 'USD',
    requirements: [
      'Minimum: $15 USD',
      'No multiple requirement',
      'Uses saved crypto wallet details',
      'Supports major cryptocurrencies'
    ]
  }
];

const UnifiedWithdrawalComponent: React.FC<UnifiedWithdrawalComponentProps> = ({
  isOpen,
  onClose,
  onWithdrawalComplete
}) => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedType, setSelectedType] = useState<'mobile_money' | 'crypto' | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'select' | 'configure' | 'amount' | 'success'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Mobile money states
  const [momoNumber, setMomoNumber] = useState('');
  const [momoOperator, setMomoOperator] = useState('');
  
  // Crypto states  
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState('USDT');
  
  // OTP states
  const [transactionId, setTransactionId] = useState('');
  

  const balance = user?.balance || 0;
  const usdBalance = user?.usdBalance || 0;

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedType(null);
      setStep('select');
      setAmount('');
      setError('');
      setSuccess('');
      setTransactionId('');
      setOtpCode('');
      
      // Load saved user data
      if (user) {
        setMomoNumber(user.momoNumber || '');
        setMomoOperator(user.momoOperator || '');
        setCryptoAddress(user.cryptoWalletAddress || '');
        setCryptoCurrency(user.cryptoWalletCurrency || 'USDT');
      }
    }
  }, [isOpen, user]);

  const handleTypeSelect = (type: 'mobile_money' | 'crypto') => {
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

    const withdrawalType = WITHDRAWAL_TYPES.find(t => t.id === selectedType)!;
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
    if (!validateAmount() || !selectedType) return;

    setLoading(true);
    setError('');

    try {
      const response = await sbcApiService.initiateUnifiedWithdrawal(
        parseFloat(amount),
        selectedType
      );
      
      const data = handleApiResponse(response);
      
      console.log('🔥 WITHDRAWAL DEBUG - Response data:', data);
      console.log('🔥 WITHDRAWAL DEBUG - Selected type:', selectedType);
      console.log('🔥 WITHDRAWAL DEBUG - Response status:', data?.status);
      console.log('🔥 WITHDRAWAL DEBUG - Transaction ID:', data?.transactionId);
      
      if (data && data.transactionId) {
        // Check if OTP verification is required
        if (data.status === 'pending_otp_verification') {
          const withdrawalType = WITHDRAWAL_TYPES.find(t => t.id === selectedType)!;
          console.log('🚀 NAVIGATING TO OTP - Currency:', withdrawalType.currency);
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
          console.log(`❌ NOT NAVIGATING - Status: ${data.status}`);
          onClose();
          // Could show a success message or handle differently based on status
        }
      } else {
        throw new Error('Failed to initiate withdrawal');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate withdrawal');
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
        console.error('Failed to cancel withdrawal:', err);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  const selectedTypeInfo = selectedType ? WITHDRAWAL_TYPES.find(t => t.id === selectedType)! : null;

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
          </h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 p-1"
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

              {WITHDRAWAL_TYPES.map((type) => (
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
                      <option value="USDT">USDT (Tether)</option>
                      <option value="USDC">USDC (USD Coin)</option>
                      <option value="BTC">Bitcoin</option>
                      <option value="ETH">Ethereum</option>
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
                disabled={loading || !amount}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? <FaSpinner className="animate-spin mr-2" /> : null}
                Initiate Withdrawal
              </button>
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