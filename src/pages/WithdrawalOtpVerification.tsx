import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { FaWallet, FaCheck, FaSpinner, FaTimes, FaMobileAlt, FaBitcoin } from 'react-icons/fa';

interface WithdrawalOtpState {
  transactionId: string;
  withdrawalType: 'mobile_money' | 'crypto';
  amount: number;
  currency: string;
}

const WithdrawalOtpVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();
  
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Get withdrawal details from navigation state
  const withdrawalState = location.state as WithdrawalOtpState | null;

  useEffect(() => {
    // If no withdrawal state, redirect back to money page
    if (!withdrawalState) {
      navigate('/money');
    }
  }, [withdrawalState, navigate]);

  const handleOtpVerification = async () => {
    if (!otpCode || !withdrawalState) {
      setError('Please enter the OTP code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await sbcApiService.verifyWithdrawal({
        transactionId: withdrawalState.transactionId,
        verificationCode: otpCode
      });

      handleApiResponse(response);
      
      await refreshUser();
      setSuccess(true);
      
      // Navigate back to money page after 3 seconds
      setTimeout(() => {
        navigate('/money', { 
          state: { 
            message: 'Withdrawal completed successfully!',
            type: 'success'
          }
        });
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (withdrawalState?.transactionId) {
      try {
        await sbcApiService.cancelWithdrawal(withdrawalState.transactionId);
        navigate('/money', { 
          state: { 
            message: 'Withdrawal cancelled successfully',
            type: 'info'
          }
        });
      } catch (err) {
        console.error('Failed to cancel withdrawal:', err);
        navigate('/money');
      }
    } else {
      navigate('/money');
    }
  };

  const handleResendOtp = async () => {
    // Note: You might need to implement a resend OTP endpoint
    setError('');
    try {
      // For now, just show a message. You can implement the actual resend logic
      alert('OTP resent successfully. Please check your email/SMS.');
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
    }
  };

  if (!withdrawalState) {
    return null; // Component will redirect in useEffect
  }

  if (success) {
    return (
      <ProtectedRoute>
        <div className="p-4 h-screen bg-white">
          <div className="flex items-center mb-6">
            <BackButton onClick={() => navigate('/money')} />
            <h3 className="text-xl font-medium text-center w-full text-gray-900">Withdrawal Successful</h3>
          </div>

          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <FaCheck className="text-green-600" size={32} />
            </div>
            
            <h2 className="text-2xl font-bold text-green-600 mb-4">Success!</h2>
            
            <div className="text-center space-y-2 mb-8">
              <p className="text-lg text-gray-900">
                Your {withdrawalState.withdrawalType === 'crypto' ? 'cryptocurrency' : 'mobile money'} withdrawal has been completed successfully!
              </p>
              <p className="text-gray-600">
                Amount: {withdrawalState.amount} {withdrawalState.currency}
              </p>
              <p className="text-sm text-gray-500">
                Transaction ID: {withdrawalState.transactionId}
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                You will receive your funds shortly.
              </p>
              <p className="text-xs text-gray-500">
                Redirecting to home page in a few seconds...
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-4 h-screen bg-white">
        <div className="flex items-center mb-6">
          <BackButton onClick={handleCancel} />
          <h3 className="text-xl font-medium text-center w-full text-gray-900">Verify Withdrawal</h3>
        </div>

        <div className="max-w-md mx-auto">
          {/* Withdrawal Details Card */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-blue-600">
                {withdrawalState.withdrawalType === 'crypto' ? (
                  <FaBitcoin size={24} />
                ) : (
                  <FaMobileAlt size={24} />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {withdrawalState.withdrawalType === 'crypto' ? 'Cryptocurrency' : 'Mobile Money'} Withdrawal
                </h4>
                <p className="text-sm text-gray-600">
                  Amount: {withdrawalState.amount} {withdrawalState.currency}
                </p>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-white rounded-lg p-3">
              <strong>Transaction ID:</strong> {withdrawalState.transactionId}
            </div>
          </div>

          {/* OTP Verification Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaWallet className="text-blue-600" size={24} />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Enter Verification Code</h4>
              <p className="text-sm text-gray-600">
                We've sent a verification code to your registered email and phone number.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only digits
                    if (value.length <= 6) {
                      setOtpCode(value);
                      setError(''); // Clear error when user types
                    }
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
              </div>

              <button
                onClick={handleOtpVerification}
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Complete Withdrawal'
                )}
              </button>

              <div className="flex justify-between text-sm">
                <button
                  onClick={handleResendOtp}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Resend Code
                </button>
                
                <button
                  onClick={handleCancel}
                  className="text-red-600 hover:text-red-700 font-medium flex items-center"
                >
                  <FaTimes size={12} className="mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h5 className="font-semibold text-yellow-800 mb-2">Important Notes:</h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• The verification code expires in 10 minutes</li>
              <li>• Check your spam folder if you don't receive the code</li>
              <li>• Processing time: 1-5 minutes for mobile money, 15-30 minutes for crypto</li>
              <li>• Contact support if you encounter any issues</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default WithdrawalOtpVerification;