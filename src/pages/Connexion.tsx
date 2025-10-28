import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { isEmail, isPhoneNumber, safeRecoveryApiCall, extractCountryCode } from '../utils/recoveryHelpers';
import RecoveryModal from '../components/RecoveryModal';
import NegativeBalanceNotification from '../components/NegativeBalanceNotification';
import logo from '../assets/img/logo-sbc.png';
import { clearSignupCacheWithFeedback } from '../utils/signupHelpers';
import { useTranslation } from 'react-i18next';

function Connexion() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Changed from email to identifier
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryInfo, setRecoveryInfo] = useState<any>(null);
  const [showNegativeBalanceNotification, setShowNegativeBalanceNotification] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    let valid = true;
    const newErrors = { identifier: '', password: '' };

    // Validate identifier (email or phone)
    if (!identifier) {
      newErrors.identifier = t('pages.connexion.invalidEmailOrPhone');
      valid = false;
    } else if (!isEmail(identifier) && !isPhoneNumber(identifier)) {
      newErrors.identifier = t('pages.connexion.invalidEmailOrPhone');
      valid = false;
    }

    if (password.length < 6) {
      newErrors.password = t('pages.connexion.passwordMinLength');
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // Check for recoverable transactions on failed login or from API response
  const checkRecoverableTransactions = async (identifier: string, checkRecoveryHint?: { phoneNumber?: string; email?: string }) => {
    try {
      // If we have a hint from the API response, use it directly
      if (checkRecoveryHint) {
        const recoveryInfo = {
          totalTransactions: 0,
          totalAmount: 0,
          message: t('pages.connexion.recoveryMessage') || "Your account information has been lost, but your transactions can be recovered!",
          suggestedIdentifiers: {
            email: checkRecoveryHint.email,
            phoneNumber: checkRecoveryHint.phoneNumber,
            countryCode: checkRecoveryHint.phoneNumber ? extractCountryCode(checkRecoveryHint.phoneNumber) || 'CM' : 'CM'
          }
        };
        setRecoveryInfo(recoveryInfo);
        setShowRecoveryModal(true);
        return;
      }

      // Otherwise, try the recovery API
      const recoveryResponse = await safeRecoveryApiCall(
        () => sbcApiService.checkRecoveryLogin(identifier)
      );

      if (recoveryResponse) {
        const recoveryData = handleApiResponse(recoveryResponse);
        if (recoveryData && recoveryData.data) {
          setRecoveryInfo(recoveryData.data);
          setShowRecoveryModal(true);
        }
      }
    } catch (error) {
      // Silently fail - don't show recovery modal if there's an error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      try {
        // Process the login through auth context (single API call)
        const result = await login(identifier, password);

        // Clear any cached signup data since user is now logging in
        clearSignupCacheWithFeedback();

        // Check for negative balance after successful login
        if (result.hasNegativeBalance && result.recoveryMessage) {
          setShowNegativeBalanceNotification(true);
          // Still continue with normal flow after showing notification
        }

        if (result.requiresOtp) {
          // Redirect to OTP verification page
          navigate('/otp', {
            state: {
              userId: result.userId,
              email: result.email || identifier,
              fromLogin: true
            }
          });
        } else {
          // Direct login success - redirect to home
          navigate('/');
        }
      } catch (error: unknown) {
        
        // Fall back to general recovery check for 401/404 errors
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('404'))) {
          await checkRecoverableTransactions(identifier);
          setErrors({
            identifier: '',
            password: t('pages.connexion.checkCredentials')
          });
        } else {
          setErrors({
            identifier: '',
            password: error instanceof Error ? error.message : t('pages.connexion.loginFailed')
          });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <img src={logo} alt="logo" className=" mb-4 object-contain" />
        <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('pages.connexion.title')}</h1>
        <p className="text-gray-500 mb-8">{t('pages.connexion.loginHere')}</p>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block text-gray-700 font-medium mb-2">{t('pages.connexion.emailOrPhone')}</label>
            <input
              type="text"
              placeholder={t('pages.connexion.emailOrPhonePlaceholder')}
              className={`w-full border ${errors.identifier ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#115CF6] text-gray-700 placeholder-gray-400`}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
            {errors.identifier && <div className="text-red-500 text-xs mt-1">{errors.identifier}</div>}
            <small className="text-gray-500 text-xs mt-1">
              {t('pages.connexion.emailPhoneHint')}
            </small>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">{t('common.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('common.password')}
                className={`w-full border ${errors.password ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#115CF6] text-gray-700 placeholder-gray-400 pr-12`}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
            <div className="flex justify-end mt-2">
              <button type="button" className="text-[#115CF6] text-sm font-medium hover:underline bg-transparent" onClick={() => navigate('/forgot-password')}>{t('pages.connexion.forgotPassword')}</button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#115CF6] hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
          >
            {loading ? t('common.pleaseWait') : t('pages.connexion.connectButton')}
          </button>
        </form>
        <div className="text-center text-md text-gray-500 mt-6">
          {t('pages.connexion.noAccount')}{' '}
          <button
            type="button"
            className="text-[#115CF6] font-semibold hover:underline bg-transparent"
            onClick={() => navigate('/signup')}
          >
            {t('common.signup')}
          </button>
        </div>
      </div>

      {/* Recovery Modal */}
      {recoveryInfo && (
        <RecoveryModal 
          isOpen={showRecoveryModal}
          onClose={() => {
            setShowRecoveryModal(false);
            setRecoveryInfo(null);
          }}
          recoveryInfo={recoveryInfo}
          enteredPassword={password}
        />
      )}

      {/* Negative Balance Notification */}
      <NegativeBalanceNotification
        isOpen={showNegativeBalanceNotification}
        onClose={() => setShowNegativeBalanceNotification(false)}
        userReferralCode={''} // Will be handled by the component
        negativeBalance={0} // Will be handled by the component
      />
    </div>
  );
}

export default Connexion;
