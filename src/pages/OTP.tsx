import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Security from '../assets/icon/Data-security.png';
import BackButton from '../components/common/BackButton';
import { useAuth } from '../contexts/AuthContext';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import { motion } from 'framer-motion';

function OTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp: authVerifyOtp } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'success' | 'error' | 'confirm', message: string, onConfirm?: () => void } | null>(null);
  const [showMethodModal, setShowMethodModal] = useState(false);

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
      if (flow === 'passwordReset') { // Handle password reset flow: verify OTP and get reset token
        const response = await sbcApiService.verifyPasswordResetOtp(currentEmail, otpCode);
        const result = handleApiResponse(response);

        // Store the password reset token and navigate to reset password page
        const passwordResetToken = result.passwordResetToken;
        navigate('/reset-password', {
          state: {
            email: currentEmail,
            passwordResetToken: passwordResetToken
          }
        });
      } else if (withdrawalId) { // Existing withdrawal flow
        const response = await sbcApiService.verifyWithdrawal({
          transactionId: withdrawalId,
          verificationCode: otpCode,
        });
        handleApiResponse(response);
        setModalContent({ type: 'success', message: 'Retrait vérifié. Votre paiement est en cours de traitement.' });
        setShowModal(true);
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

  const handleResendOtp = () => {
    // Show method selection modal first
    setShowMethodModal(true);
  };

  const handleResendWithMethod = async (method: 'email' | 'whatsapp') => {
    setLoading(true);
    setError('');
    setShowMethodModal(false);

    try {
      if (flow === 'passwordReset') { // Handle resending OTP for password reset
        const response = await sbcApiService.requestPasswordResetOtp(currentEmail, method);
        handleApiResponse(response);
        const methodText = method === 'whatsapp' ? 'WhatsApp' : 'email';
        setModalContent({ type: 'success', message: `Code renvoyé via ${methodText} ! Veuillez vérifier.` });
        setShowModal(true);
      } else if (fromRegistration || fromLogin) { // Handle resending OTP for registration/login
        if (!actualUserId) {
          setError('Session expirée. Veuillez réessayer de vous connecter.');
          return;
        }
        const purpose = fromRegistration ? 'register' : 'login';
        const response = await sbcApiService.resendOtpEnhanced({
          userId: actualUserId,
          identifier: currentEmail,
          purpose,
          channel: method
        });
        handleApiResponse(response);
        const methodText = method === 'whatsapp' ? 'WhatsApp' : 'email';
        setModalContent({ type: 'success', message: `Code renvoyé via ${methodText} ! Veuillez vérifier.` });
        setShowModal(true);
      } else if (withdrawalId && withdrawalAmount !== undefined) { // Handle resending OTP for withdrawal
        // For withdrawal, we typically use WhatsApp, but we can still respect user choice
        const response = await sbcApiService.initiateWithdrawal(withdrawalAmount);
        const result = handleApiResponse(response);
        setModalContent({ type: 'success', message: result.message || 'Code de retrait renvoyé ! Veuillez vérifier votre téléphone.' });
        setShowModal(true);
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
      {showModal && modalContent && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2 }}
          >
            <h4 className={`text-lg font-bold mb-4 text-center ${modalContent.type === 'success' ? 'text-green-600' :
              modalContent.type === 'error' ? 'text-red-600' : 'text-gray-800'
              }`}>
              {modalContent.type === 'success' ? 'Succès' :
                modalContent.type === 'error' ? 'Erreur' : 'Confirmation'}
            </h4>
            <p className="text-sm text-gray-700 text-center mb-4">
              {modalContent.message}
            </p>
            {modalContent.type === 'confirm' ? (
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  className="flex-1 bg-red-500 text-white rounded-xl py-2 font-bold shadow hover:bg-red-600 transition-colors"
                  onClick={() => {
                    modalContent.onConfirm?.();
                    setShowModal(false);
                  }}
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full bg-blue-500 text-white rounded-xl py-2 font-bold shadow hover:bg-blue-600 transition-colors"
                onClick={() => setShowModal(false)}
              >
                Fermer
              </button>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Method Selection Modal */}
      {showMethodModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-[90vw] max-w-sm text-gray-900 relative shadow-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.2 }}
          >
            <h4 className="text-lg font-bold mb-4 text-center text-blue-600">
              📬 Choisir la méthode de réception
            </h4>
            <p className="text-sm text-gray-700 text-center mb-6">
              Comment souhaitez-vous recevoir le nouveau code OTP ?
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleResendWithMethod('email')}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">📧</span>
                <div className="text-left">
                  <div className="font-medium text-gray-800">Email</div>
                  <div className="text-sm text-gray-500">Recevoir le code par email</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleResendWithMethod('whatsapp')}
                disabled={loading}
                className="w-full flex items-center gap-3 p-4 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <div className="font-medium text-gray-800">WhatsApp</div>
                  <div className="text-sm text-gray-500">Recevoir le code via WhatsApp</div>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowMethodModal(false)}
              disabled={loading}
              className="w-full mt-4 bg-gray-200 text-gray-700 rounded-xl py-2 font-bold shadow hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

export default OTP;