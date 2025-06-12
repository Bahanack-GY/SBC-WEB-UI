import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Security from '../assets/icon/Data-security.png';
import BackButton from '../components/common/BackButton';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';

function OTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp: authVerifyOtp } = useAuth();

  // Get data from navigation state, including withdrawalId, amount, and currency
  const { userId: userIdFromState, email: emailFromState, fromRegistration, fromLogin, withdrawalId, withdrawalAmount, withdrawalCurrency, flow } = location.state || {};
  // Prioritize email from state, then from search params (for legacy/direct links), then from userId for login/registration
  const currentEmail = emailFromState || new URLSearchParams(location.search).get('email') || (fromLogin || fromRegistration ? userIdFromState : '');
  const actualUserId = (fromLogin || fromRegistration) ? userIdFromState : undefined; // Only use userId for login/registration

  useEffect(() => {
    // If not from any known flow (registration, login, withdrawal, or passwordReset), redirect
    if (!actualUserId && !currentEmail && !withdrawalId && flow !== 'passwordReset') {
      navigate('/connexion'); // Or appropriate fallback
    }
  }, [actualUserId, currentEmail, withdrawalId, flow, navigate]);

  const handleChange = (i: number, val: string) => {
    if (!/^[a-zA-Z0-9]?$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[i] = val;
    setOtp(newOtp);
    if (val && i < 5) {
      inputs.current[i + 1]?.focus();
    }
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const paste = e.clipboardData.getData('text').slice(0, 6).split('');
    setOtp(paste.concat(Array(6 - paste.length).fill('')));
    setTimeout(() => {
      const next = paste.length < 6 ? paste.length : 5;
      inputs.current[next]?.focus();
    }, 10);
  };
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      setError('Veuillez entrer le code complet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (flow === 'passwordReset') { // Correctly handle password reset flow: just navigate
        navigate('/reset-password', { state: { email: currentEmail, otpCode: otpCode } });
      } else if (withdrawalId) { // Existing withdrawal flow
        const response = await sbcApiService.verifyWithdrawal({
          transactionId: withdrawalId,
          verificationCode: otpCode,
        });
        handleApiResponse(response);
        alert('Retrait vérifié. Votre paiement est en cours de traitement.');
        navigate('/transaction-confirmation', { state: { transactionId: withdrawalId, withdrawalAmount, withdrawalCurrency } });
      } else if (fromRegistration || fromLogin) { // Existing login/registration flow
        // For these flows, userId is indeed needed and comes from state
        await authVerifyOtp(actualUserId, otpCode);
        navigate('/');
      } else {
        // Fallback for unknown contexts
        setError('Contexte de vérification OTP inconnu. Veuillez recommencer le processus.');
        return;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');

    try {
      if (flow === 'passwordReset') { // Handle resending OTP for password reset
        const response = await sbcApiService.requestPasswordResetOtp(currentEmail);
        handleApiResponse(response);
        alert('Code renvoyé ! Veuillez vérifier votre email.');
      } else if (fromRegistration || fromLogin) { // Handle resending OTP for registration/login
        if (!actualUserId) {
          setError('Session expirée. Veuillez réessayer de vous connecter.');
          return;
        }
        const purpose = fromRegistration ? 'register' : 'login';
        const response = await sbcApiService.resendVerificationOtp(actualUserId, currentEmail, purpose);
        handleApiResponse(response);
        alert('Code renvoyé ! Veuillez vérifier votre email.');
      } else if (withdrawalId && withdrawalAmount !== undefined) { // Handle resending OTP for withdrawal
        const response = await sbcApiService.initiateWithdrawal(withdrawalAmount);
        const result = handleApiResponse(response);
        alert(result.message || 'Code de retrait renvoyé ! Veuillez vérifier votre téléphone.');
      } else {
        console.warn("Resend OTP called without clear purpose context or missing details.");
        setError('Impossible de renvoyer l\'OTP. Informations manquantes.');
        return;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Échec du renvoi de l\'OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center mb-4 px-3">
        <BackButton />
        <h3 className="text-xl font-medium text-center w-full text-gray-900">Verification</h3>
      </div>
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <img src={Security} alt="Analyse" className="size-44 mb-6 mx-auto" />
        <form onSubmit={handleVerify} className="w-full max-w-xs flex flex-col items-center">
          <div className="text-center mb-2 font-semibold text-lg text-gray-800">
            {fromLogin ? 'Connexion - Code de vérification' :
              withdrawalId ? 'Retrait - Code de vérification' :
                flow === 'passwordReset' ? 'Réinitialisation mot de passe - Code de vérification' :
                  'Entrez le code de vérification envoyé à'}
          </div>
          <div className="text-center text-gray-600 mb-1">{currentEmail || 'votre numéro enregistré'}</div>
          {(fromLogin || withdrawalId || flow === 'passwordReset') && ( // Updated condition to include passwordReset
            <div className="text-center text-sm text-gray-500 mb-2">
              Un code de vérification a été envoyé à votre {currentEmail ? 'email' : 'numéro de téléphone'} pour finaliser la {fromLogin ? 'connexion' : withdrawalId ? 'demande de retrait' : 'réinitialisation du mot de passe'}.
            </div>
          )}
          {error && (
            <div className="text-center text-red-500 text-sm mb-2">{error}</div>
          )}
          <div className="flex justify-center gap-2 my-4">
            {otp.map((val, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={val}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#115CF6] bg-white font-mono"
                autoFocus={i === 0}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 mb-4">
            Vous n'avez pas reçu le code ?
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-[#115CF6] font-semibold cursor-pointer hover:underline disabled:opacity-50 bg-transparent"
            >
              Renvoyer
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-bold shadow hover:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>
        </form>
      </div>
    </>
  );
}

export default OTP;