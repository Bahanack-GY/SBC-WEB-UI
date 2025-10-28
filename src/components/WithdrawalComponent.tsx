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
  const { user, updateProfile, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [selectedBalance, setSelectedBalance] = useState<'FCFA' | 'USD'>('FCFA');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoOperator, setMomoOperator] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checkingLimits, setCheckingLimits] = useState(false);
  const [withdrawalLimits, setWithdrawalLimits] = useState<{ allowed: boolean; remainingTransactions?: number; reason?: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [detectedCountry, setDetectedCountry] = useState<CountryOperator | null>(null);
  
  const balance = user?.balance || 0;
  const usdBalance = user?.usdBalance || 0;
  const availableBalance = selectedBalance === 'FCFA' ? balance : usdBalance;

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

  const handleCheckWithdrawalLimits = async () => {
    const withdrawalAmount = parseInt(amount);
    if (!withdrawalAmount || withdrawalAmount <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    if (!detectedCountry) {
      setError('Format de numéro mobile money invalide');
      return;
    }

    // For USD withdrawals, we need to convert to check minimum in local currency
    let effectiveAmount = withdrawalAmount;
    if (selectedBalance === 'USD' && detectedCountry) {
      // Convert USD to local currency for minimum check
      // USD to XAF rate is 500 (from balanceHelpers)
      effectiveAmount = withdrawalAmount * 500; // Assuming most countries use XAF-equivalent rates
    }
    
    if (effectiveAmount < detectedCountry.minAmount) {
      const minInSelectedCurrency = selectedBalance === 'USD' 
        ? (detectedCountry.minAmount / 500).toFixed(2)
        : detectedCountry.minAmount;
      setError(`Montant minimum pour ${detectedCountry.country}: ${minInSelectedCurrency} ${selectedBalance}`);
      return;
    }

    // Only require multiple of 5 for FCFA withdrawals
    if (selectedBalance === 'FCFA' && withdrawalAmount % 5 !== 0) {
      setError('Le montant FCFA doit être un multiple de 5');
      return;
    }

    setCheckingLimits(true);
    setError('');
    setWithdrawalLimits(null);

    try {
      const response = await sbcApiService.checkWithdrawalLimits(withdrawalAmount);
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
      setError('Erreur lors de la vérification des limites');
    } finally {
      setCheckingLimits(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.momoNumber || !user?.momoOperator) {
      setError('Veuillez d\'abord configurer vos détails mobile money.');
      return;
    }

    if (!withdrawalLimits || !withdrawalLimits.allowed) {
      setError('Limites de retrait non vérifiées ou dépassées');
      return;
    }

    const withdrawalAmount = parseInt(amount);

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let response;
      if (selectedBalance === 'USD') {
        // For USD withdrawals, we need to convert to FCFA first, then withdraw
        // This requires converting the USD amount to FCFA using the API
        const conversionResponse = await sbcApiService.convertUsdToXaf(withdrawalAmount);
        const conversionData = handleApiResponse(conversionResponse);
        
        if (conversionData && conversionResponse.isOverallSuccess) {
          // Now initiate withdrawal with the converted FCFA amount
          response = await sbcApiService.initiateWithdrawal(conversionData.convertedAmount);
        } else {
          throw new Error('Échec de la conversion USD vers FCFA');
        }
      } else {
        // Direct FCFA withdrawal
        response = await sbcApiService.initiateWithdrawal(withdrawalAmount);
      }
      
      const data = handleApiResponse(response);
      
      // Refresh user balances to show updated amounts
      await refreshUser();
      
      setSuccess(`Retrait initié avec succès! ID de transaction: ${data.transactionId}`);
      setAmount('');
      setWithdrawalLimits(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du retrait');
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

      {/* Balance Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold mb-3 text-gray-600">Choisir le solde à utiliser:</h4>
        
        {/* Balance Selection Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => {
              setSelectedBalance('FCFA');
              setAmount('');
              setWithdrawalLimits(null);
              setError('');
            }}
            className={`p-3 rounded-lg border transition-all ${
              selectedBalance === 'FCFA'
                ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-left">
              <div className="text-xs font-medium text-blue-600">Solde Principal</div>
              <div className="text-lg font-bold text-blue-800">{balance.toLocaleString('fr-FR')} F</div>
              <div className="text-xs text-blue-500 mt-1">
                {selectedBalance === 'FCFA' ? '✓ Sélectionné' : 'FCFA'}
              </div>
            </div>
          </button>
          
          <button
            onClick={() => {
              setSelectedBalance('USD');
              setAmount('');
              setWithdrawalLimits(null);
              setError('');
            }}
            className={`p-3 rounded-lg border transition-all ${
              selectedBalance === 'USD'
                ? 'bg-green-50 border-green-200 ring-2 ring-green-500'
                : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="text-left">
              <div className="text-xs font-medium text-green-600">Solde USD</div>
              <div className="text-lg font-bold text-green-800">${usdBalance.toFixed(2)}</div>
              <div className="text-xs text-green-500 mt-1">
                {selectedBalance === 'USD' ? '✓ Sélectionné' : 'USD'}
              </div>
            </div>
          </button>
        </div>
        
        {/* Information about selected balance */}
        <div className={`p-3 rounded-lg border ${
          selectedBalance === 'FCFA' 
            ? 'bg-blue-50 border-blue-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className={`text-xs ${
            selectedBalance === 'FCFA' ? 'text-blue-700' : 'text-green-700'
          }`}>
            <strong>Solde sélectionné:</strong> {selectedBalance === 'FCFA' ? 'Principal (FCFA)' : 'USD'}
            <br />
            <strong>Disponible:</strong> {selectedBalance === 'FCFA' 
              ? `${balance.toLocaleString('fr-FR')} F`
              : `$${usdBalance.toFixed(2)}`
            }
            {selectedBalance === 'USD' && (
              <>
                <br />
                <strong>Note:</strong> L'USD sera automatiquement converti en FCFA pour le Mobile Money
              </>
            )}
          </div>
        </div>
      </div>

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
              Montant ({selectedBalance})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setWithdrawalLimits(null);
                setError('');
              }}
              placeholder={`Montant en ${selectedBalance}`}
              min={selectedBalance === 'USD' ? '1' : (detectedCountry?.minAmount || 500)}
              step={selectedBalance === 'USD' ? '0.01' : '5'}
              max={availableBalance}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              <div>Disponible: {selectedBalance === 'FCFA' 
                ? `${balance.toLocaleString('fr-FR')} F`
                : `$${usdBalance.toFixed(2)}`
              }</div>
              {detectedCountry && selectedBalance === 'FCFA' && (
                <div>Minimum: {detectedCountry.minAmount} {detectedCountry.currency}, multiple de 5</div>
              )}
              {detectedCountry && selectedBalance === 'USD' && (
                <div>Minimum: ${(detectedCountry.minAmount / 500).toFixed(2)} USD (≈{detectedCountry.minAmount} {detectedCountry.currency})</div>
              )}
            </div>
          </div>

          {/* Check Limits Button */}
          <button
            type="button"
            onClick={handleCheckWithdrawalLimits}
            disabled={checkingLimits || !amount || !detectedCountry}
            className="w-full bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {checkingLimits ? 'Vérification...' : 'Vérifier les limites de retrait'}
          </button>

          {/* Withdrawal Limits Display */}
          {withdrawalLimits && (
            <div className={`mb-4 p-4 border rounded-md ${
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

          <button
            type="submit"
            disabled={loading || !amount || !user?.momoNumber || !withdrawalLimits?.allowed}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Traitement...' : 'Retirer'}
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
          <li>• Maximum 3 retraits réussis par 24h (tous types confondus)</li>
          <li>• Choisissez votre solde: FCFA (direct) ou USD (converti automatiquement)</li>
          <li>• Utilisez le format international complet (ex: 237675080477)</li>
          <li>• Les montants FCFA doivent être multiples de 5</li>
          <li>• Assurez-vous d'avoir un solde suffisant</li>
          <li>• Temps de traitement: 1-5 minutes</li>
          <li>• Pris en charge dans 9 pays africains</li>
        </ul>
      </div>
    </div>
  );
};

export default WithdrawalComponent;
