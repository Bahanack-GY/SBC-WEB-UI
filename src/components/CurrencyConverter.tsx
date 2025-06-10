import React, { useState } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

const CurrencyConverter: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('XAF');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'XAF', name: 'CFA Franc (Central Africa)' },
    { code: 'XOF', name: 'CFA Franc (West Africa)' },
    { code: 'GNF', name: 'Guinean Franc' },
    { code: 'CDF', name: 'Congolese Franc' }
  ];

  const handleConversion = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');
    setConvertedAmount(null);

    try {
      const response = await sbcApiService.convertCurrency(
        parseFloat(amount),
        fromCurrency,
        toCurrency
      );
      const data = handleApiResponse(response);

      // Handle different response formats
      if (typeof data === 'object' && data.amount !== undefined) {
        setConvertedAmount(data.amount);
      } else if (typeof data === 'number') {
        setConvertedAmount(data);
      } else {
        setError('Invalid response format from currency conversion');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Currency conversion failed');
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setConvertedAmount(null);
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-bold mb-4">Currency Converter</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} - {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleConversion}
            disabled={loading || !amount}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Converting...' : 'Convert'}
          </button>
          
          <button
            onClick={swapCurrencies}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            title="Swap currencies"
          >
            ⇄
          </button>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        {convertedAmount !== null && (
          <div className="bg-green-50 p-4 rounded-md">
            <div className="text-lg font-semibold text-green-800">
              {parseFloat(amount).toLocaleString()} {fromCurrency} = 
            </div>
            <div className="text-2xl font-bold text-green-900">
              {convertedAmount.toLocaleString()} {toCurrency}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrencyConverter;
