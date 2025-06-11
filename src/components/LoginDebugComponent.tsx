import React, { useState } from 'react';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

type LoginTestResult = {
  rawResponse: unknown;
  processedData: unknown;
  analysis: {
    hasToken: boolean;
    hasUserId: boolean;
    hasUser: boolean;
    requiresOtp: boolean;
  };
} | null;

const LoginDebugComponent: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LoginTestResult>(null);
  const [error, setError] = useState<string>('');

  const testLogin = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      console.log('Testing login with:', { email, password });
      const response = await sbcApiService.loginUser(email, password);
      console.log('Raw API Response:', response);
      
      const data = handleApiResponse(response);
      console.log('Processed Data:', data);
      
      setResult({
        rawResponse: response,
        processedData: data,
        analysis: {
          hasToken: !!data.token,
          hasUserId: !!(data.userId || data.id),
          hasUser: !!data.user,
          requiresOtp: data.requiresOtp || data.otpRequired || data.needsVerification || 
                      (!data.token && (data.userId || data.id)) || 
                      data.status === 'pending_verification'
        }
      });
    } catch (err) {
      console.error('Login test error:', err);
      setError(err instanceof Error ? err.message : 'Login test failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 m-4">
      <h3 className="text-lg font-bold mb-4">Login Debug Component</h3>
      
      <div className="flex flex-col gap-3 mb-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 border rounded"
        />
        
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 border rounded"
        />
        
        <button
          onClick={testLogin}
          disabled={loading || !email || !password}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing Login...' : 'Test Login API'}
        </button>
      </div>

      {error && (
        <div className="text-red-600 mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="bg-white p-4 rounded border">
          <h4 className="font-semibold mb-2">Login Test Results:</h4>
          
          <div className="mb-4">
            <h5 className="font-medium text-green-600">Analysis:</h5>
            <ul className="text-sm">
              <li>Has Token: {result.analysis.hasToken ? '✅' : '❌'}</li>
              <li>Has User ID: {result.analysis.hasUserId ? '✅' : '❌'}</li>
              <li>Has User Data: {result.analysis.hasUser ? '✅' : '❌'}</li>
              <li>Requires OTP: {result.analysis.requiresOtp ? '✅' : '❌'}</li>
            </ul>
          </div>
          
          <div className="mb-4">
            <h5 className="font-medium text-blue-600">Processed Data:</h5>
            <pre className="text-xs overflow-auto max-h-32 bg-gray-100 p-2 rounded">
              {JSON.stringify(result.processedData, null, 2)}
            </pre>
          </div>
          
          <div>
            <h5 className="font-medium text-purple-600">Raw Response:</h5>
            <pre className="text-xs overflow-auto max-h-32 bg-gray-100 p-2 rounded">
              {(() => {
                if (result && typeof result.rawResponse === 'object' && result.rawResponse !== null) {
                  const raw = result.rawResponse as { statusCode?: unknown; body?: unknown; isOverallSuccess?: unknown };
                  return JSON.stringify({
                    statusCode: raw.statusCode,
                    body: raw.body,
                    isOverallSuccess: raw.isOverallSuccess
                  }, null, 2);
                }
                return '';
              })()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginDebugComponent;
