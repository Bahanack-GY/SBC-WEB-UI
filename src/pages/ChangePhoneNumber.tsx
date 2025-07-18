import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPhone, FiLoader } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from '../utils/apiHelpers';
import BackButton from '../components/common/BackButton';
import ProtectedRoute from '../components/common/ProtectedRoute';

const countryCodes = [
  { value: 'Cameroun', label: '🇨🇲 +237', code: '+237' },
  { value: 'Bénin', label: '🇧🇯 +229', code: '+229' },
  { value: 'Congo-Brazzaville', label: '🇨🇬 +242', code: '+242' },
  { value: 'Congo-Kinshasa', label: '🇨🇩 +243', code: '+243' },
  { value: 'Ghana', label: '🇬🇭 +233', code: '+233' },
  { value: 'Côte d\'Ivoire', label: '🇨🇮 +225', code: '+225' },
  { value: 'Sénégal', label: '🇸🇳 +221', code: '+221' },
  { value: 'Togo', label: '🇹🇬 +228', code: '+228' },
  { value: 'Burkina Faso', label: '🇧🇫 +226', code: '+226' },
  { value: 'Mali', label: '🇲🇱 +223', code: '+223' },
  { value: 'Niger', label: '🇳🇪 +227', code: '+227' },
  { value: 'Guinée', label: '🇬🇳 +224', code: '+224' },
  { value: 'Gabon', label: '🇬🇦 +241', code: '+241' },
  { value: 'Kenya', label: '🇰🇪 +254', code: '+254' },
];

function ChangePhoneNumber() {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [selectedCode, setSelectedCode] = useState(countryCodes[0]);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const navigate = useNavigate();

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = countryCodes.find(c => c.value === e.target.value) || countryCodes[0];
    setSelectedCode(code);
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPhoneNumber.trim()) {
      setError('Veuillez entrer un numéro de téléphone');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhoneNumber = `${selectedCode.code}${newPhoneNumber}`;
      const response = await sbcApiService.requestPhoneChangeOtp(fullPhoneNumber);
      handleApiResponse(response);
      
      setModalContent({
        type: 'success',
        message: 'Code OTP envoyé à votre nouveau numéro via WhatsApp!'
      });
      setShowModal(true);
      setStep('verify');
    } catch (error) {
      console.error('Error requesting phone change OTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'envoi du code OTP';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode.trim()) {
      setError('Veuillez entrer le code OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPhoneNumber = `${selectedCode.code}${newPhoneNumber}`;
      const response = await sbcApiService.confirmPhoneChange(fullPhoneNumber, otpCode);
      handleApiResponse(response);
      
      setModalContent({
        type: 'success',
        message: 'Numéro de téléphone mis à jour avec succès!'
      });
      setShowModal(true);
      
      // Navigate back to profile after success
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (error) {
      console.error('Error confirming phone change:', error);
      const errorMessage = error instanceof Error ? error.message : 'Code OTP invalide ou numéro déjà utilisé';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');

    try {
      const fullPhoneNumber = `${selectedCode.code}${newPhoneNumber}`;
      const response = await sbcApiService.requestPhoneChangeOtp(fullPhoneNumber);
      handleApiResponse(response);
      
      setModalContent({
        type: 'success',
        message: 'Code OTP renvoyé!'
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error resending OTP:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du renvoi du code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
        {/* Header */}
        <div className="flex items-center mb-4 px-3 w-full max-w-sm">
          <BackButton />
          <h3 className="text-xl font-medium text-center w-full text-gray-900">
            Changer le numéro de téléphone
          </h3>
        </div>

        <motion.div
          className="w-full max-w-sm mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center mt-8 mb-6">
            <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
              <FiPhone className="text-blue-500" size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {step === 'request' ? 'Nouveau numéro' : 'Vérification'}
            </h2>
            <p className="text-center text-gray-600 text-sm">
              {step === 'request' 
                ? 'Entrez votre nouveau numéro de téléphone'
                : `Entrez le code envoyé à ${selectedCode.code}${newPhoneNumber}`
              }
            </p>
          </div>

          {step === 'request' ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1 font-medium">
                  Nouveau numéro de téléphone
                </label>
                <div className="flex gap-2">
                  <select
                    className="border rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    value={selectedCode.value}
                    onChange={handleCountryCodeChange}
                  >
                    {countryCodes.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={newPhoneNumber}
                    onChange={(e) => {
                      setNewPhoneNumber(e.target.value);
                      setError('');
                    }}
                    placeholder="Ex: 675090755"
                    className={`flex-1 border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder-gray-400`}
                    required
                  />
                </div>
                {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <FiLoader className="animate-spin" /> : <FiPhone />}
                {loading ? 'Envoi en cours...' : 'Envoyer le code via WhatsApp'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleConfirmChange} className="flex flex-col gap-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1 font-medium">
                  Code de vérification
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value);
                    setError('');
                  }}
                  placeholder="Entrez le code OTP"
                  className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder-gray-400`}
                  required
                />
                {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
              </div>

              <div className="text-xs text-gray-500 mb-4 text-center">
                Vous n'avez pas reçu le code ?
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="text-blue-500 font-semibold cursor-pointer hover:underline disabled:opacity-50 bg-transparent ml-1"
                >
                  Renvoyer
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? <FiLoader className="animate-spin" /> : null}
                {loading ? 'Vérification...' : 'Confirmer le changement'}
              </button>

              <button
                type="button"
                onClick={() => setStep('request')}
                className="w-full bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-lg shadow hover:bg-gray-300 transition-colors"
                disabled={loading}
              >
                Retour
              </button>
            </form>
          )}
        </motion.div>

        {/* Success/Error Modal */}
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
              <h4 className={`text-lg font-bold mb-4 text-center ${
                modalContent.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}>
                {modalContent.type === 'success' ? 'Succès' : 'Erreur'}
              </h4>
              <p className="text-sm text-gray-700 text-center mb-4">
                {modalContent.message}
              </p>
              <button
                type="button"
                className={`w-full ${
                  modalContent.type === 'success'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white rounded-xl py-2 font-bold shadow transition-colors`}
                onClick={() => setShowModal(false)}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default ChangePhoneNumber;