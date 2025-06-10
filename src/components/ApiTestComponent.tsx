import React, { useState } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

type ApiResult = {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  [key: string]: unknown;
};

const ApiTestComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string>('');

  const testGetProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await sbcApiService.getProducts();
      const data = handleApiResponse(response);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testGetSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await sbcApiService.getAppSettings();
      const data = handleApiResponse(response);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testGetSubscriptionPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await sbcApiService.getSubscriptionPlans();
      const data = handleApiResponse(response);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-bold mb-4">API Test Component</h3>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={testGetProducts}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Products API
        </button>
        
        <button
          onClick={testGetSettings}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Settings API
        </button>
        
        <button
          onClick={testGetSubscriptionPlans}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Subscription Plans
        </button>
      </div>

      {loading && (
        <div className="text-blue-600">Loading...</div>
      )}

      {error && (
        <div className="text-red-600 mb-2">Error: {error}</div>
      )}

      {result && (
        <div className="bg-white p-4 rounded border">
          <h4 className="font-semibold mb-2">Result:</h4>
          <pre className="text-sm overflow-auto max-h-64">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ApiTestComponent;
