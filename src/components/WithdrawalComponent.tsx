import React, { useState, useEffect } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';

interface CountryOperator {
  country: string;
  countryCode: string;
  currency: string;
  operators: string[];
  minAmount: number;
}

const countryOperators: CountryOperator[] = [
  { country: 'Cameroun', countryCode: '237', currency: 'XAF', operators: ['MTN', 'ORANGE'], minAmount: 500 },
  { country: 'Côte d\'Ivoire', countryCode: '225', currency: 'XOF', operators: ['ORANGE', 'MTN', 'MOOV', 'WAVE'], minAmount: 200 },
  { country: 'Sénégal', countryCode: '221', currency: 'XOF', operators: ['ORANGE', 'FREE', 'WAVE'], minAmount: 200 },
  { country: 'Togo', countryCode: '228', currency: 'XOF', operators: ['TMONEY', 'FLOOZ'], minAmount: 150 },
  { country: 'Benin', countryCode: '229', currency: 'XOF', operators: ['MTN', 'MOOV'], minAmount: 500 },
  { country: 'Mali', countryCode: '223', currency: 'XOF', operators: ['ORANGE', 'MOOV'], minAmount: 500 },
  { country: 'Burkina Faso', countryCode: '226', currency: 'XOF', operators: ['ORANGE', 'MOOV'], minAmount: 500 },
  { country: 'Guinea', countryCode: '224', currency: 'GNF', operators: ['ORANGE', 'MTN'], minAmount: 1000 },
  { country: 'Congo (RDC)', countryCode: '243', currency: 'CDF', operators: ['ORANGE', 'MPESA', 'AIRTEL'], minAmount: 1000 },
  { country: 'Niger', countryCode: '227', currency: 'XOF', operators: ['ORANGE', 'MOOV'], minAmount: 500 },
  { country: 'Congo (Brazzaville)', countryCode: '242', currency: 'XAF', operators: ['AIRTEL', 'MTN'], minAmount: 500 },
  { country: 'Gabon', countryCode: '241', currency: 'XAF', operators: ['AIRTEL'], minAmount: 500 },
  { country: 'Kenya', countryCode: '254', currency: 'KES', operators: ['MPESA'], minAmount: 100 },
  { country: 'Ghana', countryCode: '233', currency: 'GHS', operators: ['MTN', 'VODAFONE'], minAmount: 10 }
];

const WithdrawalComponent: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoOperator, setMomoOperator] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detectedCountry, setDetectedCountry] = useState<CountryOperator | null>(null);

  useEffect(() => {
    if (user) {
      setMomoNumber(user.momoNumber || '');
      setMomoOperator(user.momoOperator || '');
    }
  }, [user]);

  useEffect(() => {
    // Auto-detect country from phone number
    if (momoNumber.length >= 3) {
      const detected = countryOperators.find(country =>
        momoNumber.startsWith(country.countryCode)
      );
      setDetectedCountry(detected || null);
    } else {
      setDetectedCountry(null);
    }
  }, [momoNumber]);

  const updateMomoDetails = async () => {
    if (!momoNumber || !momoOperator) {
      setError('Please enter both mobile money number and operator');
      return;
    }

    if (!detectedCountry) {
      setError('Please enter a valid mobile money number with country code (e.g., 237675080477)');
      return;
    }

    if (!detectedCountry.operators.includes(momoOperator)) {
      setError(`${momoOperator} is not supported in ${detectedCountry.country}`);
      return;
    }

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      const response = await sbcApiService.updateMomoDetails(momoNumber, momoOperator);
      handleApiResponse(response);

      // Update local user context
      await updateProfile({ momoNumber, momoOperator });

      setSuccess('Mobile money details updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mobile money details');
    } finally {
      setUpdating(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.momoNumber || !user?.momoOperator) {
      setError('Please configure your mobile money details first.');
      return;
    }

    if (!detectedCountry) {
      setError('Invalid mobile money number format');
      return;
    }

    const withdrawalAmount = parseInt(amount);
    if (withdrawalAmount < detectedCountry.minAmount) {
      setError(`Minimum withdrawal amount for ${detectedCountry.country} is ${detectedCountry.minAmount} ${detectedCountry.currency}`);
      return;
    }

    if (withdrawalAmount % 5 !== 0) {
      setError('Amount must be a multiple of 5');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await sbcApiService.initiateWithdrawal(withdrawalAmount);
      const data = handleApiResponse(response);

      setSuccess(`Withdrawal initiated successfully! Transaction ID: ${data.transactionId}`);
      setAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (number: string) => {
    // Remove any non-digit characters
    const cleaned = number.replace(/\D/g, '');
    return cleaned;
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-6">Mobile Money Withdrawal</h3>

      {/* Mobile Money Configuration */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-4">Configure Mobile Money Details</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Money Number
            </label>
            <input
              type="text"
              value={momoNumber}
              onChange={(e) => setMomoNumber(formatPhoneNumber(e.target.value))}
              placeholder="e.g., 237675080477"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., 237 for Cameroon)
            </p>
            {detectedCountry && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Detected: {detectedCountry.country} ({detectedCountry.currency})
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Money Operator
            </label>
            <select
              value={momoOperator}
              onChange={(e) => setMomoOperator(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Operator</option>
              {detectedCountry ? (
                detectedCountry.operators.map(operator => (
                  <option key={operator} value={operator}>{operator}</option>
                ))
              ) : (
                <>
                  <option value="MTN">MTN</option>
                  <option value="ORANGE">Orange</option>
                  <option value="MOOV">Moov</option>
                  <option value="WAVE">Wave</option>
                  <option value="FREE">Free</option>
                  <option value="TMONEY">T-Money</option>
                  <option value="FLOOZ">Flooz</option>
                  <option value="MPESA">M-Pesa</option>
                  <option value="AIRTEL">Airtel</option>
                </>
              )}
            </select>
          </div>

          <button
            onClick={updateMomoDetails}
            disabled={updating || !momoNumber || !momoOperator}
            className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Updating...' : 'Update Mobile Money Details'}
          </button>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold mb-4">Withdraw Funds</h4>

        <form onSubmit={handleWithdrawal} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount {detectedCountry && `(${detectedCountry.currency})`}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Minimum ${detectedCountry?.minAmount || 500}`}
              min={detectedCountry?.minAmount || 500}
              step="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {detectedCountry && (
              <p className="text-xs text-gray-500 mt-1">
                Minimum: {detectedCountry.minAmount} {detectedCountry.currency}, must be multiple of 5
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !amount || !user?.momoNumber}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Withdraw'}
          </button>
        </form>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      {/* Important Notes */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h5 className="font-semibold text-gray-800 mb-2">Important Notes:</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Use full international number format (e.g., 237675080477)</li>
          <li>• Amount must be multiple of 5</li>
          <li>• Ensure sufficient balance before withdrawal</li>
          <li>• Processing time: 1-5 minutes</li>
          <li>• Supported in 9 African countries</li>
        </ul>
      </div>
    </div>
  );
};

export default WithdrawalComponent;
