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

function Connexion() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState(''); // Changed from email to identifier
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryInfo, setRecoveryInfo] = useState<any>(null);
  const [showNegativeBalanceNotification, setShowNegativeBalanceNotification] = useState(false);
  const [negativeBalanceMessage, setNegativeBalanceMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    let valid = true;
    const newErrors = { identifier: '', password: '' };
    
    // Validate identifier (email or phone)
    if (!identifier) {
      newErrors.identifier = 'Veuillez entrer votre email ou numéro de téléphone.';
      valid = false;
    } else if (!isEmail(identifier) && !isPhoneNumber(identifier)) {
      newErrors.identifier = 'Veuillez entrer un email ou numéro de téléphone valide.';
      valid = false;
    }
    
    if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères.';
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
          message: "Vos informations de compte ont été perdues, mais vos transactions peuvent être récupérées !",
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
      console.error('Recovery check error:', error);
      // Silently fail - don't show recovery modal if there's an error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      try {
        console.log('Connexion: Starting login process for', identifier);

        // Process the login through auth context (single API call)
        const result = await login(identifier, password);
        console.log('Connexion: Login result:', result);

        // Clear any cached signup data since user is now logging in
        clearSignupCacheWithFeedback();

        // Check for negative balance after successful login
        if (result.hasNegativeBalance && result.recoveryMessage) {
          console.log('Connexion: Negative balance detected, showing recovery message');
          setNegativeBalanceMessage(result.recoveryMessage);
          setShowNegativeBalanceNotification(true);
          // Still continue with normal flow after showing notification
        }

        if (result.requiresOtp) {
          console.log('Connexion: OTP required, redirecting to OTP page');
          // Redirect to OTP verification page
          navigate('/otp', {
            state: {
              userId: result.userId,
              email: result.email || identifier,
              fromLogin: true
            }
          });
        } else {
          console.log('Connexion: Direct login success, redirecting to home');
          // Direct login success - redirect to home
          navigate('/');
        }
      } catch (error: unknown) {
        console.error('Connexion: Login error:', error);
        
        // Fall back to general recovery check for 401/404 errors
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('404'))) {
          await checkRecoverableTransactions(identifier);
          setErrors({
            identifier: '',
            password: 'Email ou mot de passe incorrect'
          });
        } else {
          setErrors({
            identifier: '',
            password: error instanceof Error ? error.message : 'Login failed'
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
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Connexion</h1>
        <p className="text-gray-500 mb-8">Entrez votre email et votre mot de passe pour vous connecter</p>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email ou Numéro de téléphone</label>
            <input
              type="text"
              placeholder="Ex : jeanpierre@gmail.com ou 237670123456"
              className={`w-full border ${errors.identifier ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#115CF6] text-gray-700 placeholder-gray-400`}
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
            {errors.identifier && <div className="text-red-500 text-xs mt-1">{errors.identifier}</div>}
            <small className="text-gray-500 text-xs mt-1">
              Vous pouvez utiliser votre email (user@example.com) ou numéro de téléphone (237670123456)
            </small>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
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
              <button type="button" className="text-[#115CF6] text-sm font-medium hover:underline bg-transparent" onClick={() => navigate('/forgot-password')}>Mot de passe oublié ?</button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#115CF6] hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className="text-center text-md text-gray-500 mt-6">
          Pas de compte ?{' '}
          <button
            type="button"
            className="text-[#115CF6] font-semibold hover:underline bg-transparent"
            onClick={() => navigate('/signup')}
          >
            S'inscrire
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
