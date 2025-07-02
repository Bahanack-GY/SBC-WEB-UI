import { useState } from 'react';
import { motion } from 'framer-motion';
import { sbcApiService } from '../services/SBCApiService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/common/BackButton';

function ChangePassword() {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSendOtp = async () => {
        if (!user?.email) {
            setError('Utilisateur non authentifié.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await sbcApiService.requestPasswordResetOtp(user.email);
            // Note: handleApiResponse is not used here because the API always returns success for security

            setModalContent({
                type: 'success',
                message: 'Un code de vérification a été envoyé à votre email.'
            });
            setShowModal(true);

            // Navigate to OTP verification after a short delay
            setTimeout(() => {
                navigate('/otp', {
                    state: {
                        email: user.email,
                        flow: 'passwordReset'
                    }
                });
            }, 2000);

        } catch (error) {
            console.error('Password reset request error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'envoi du code OTP.';
            setModalContent({
                type: 'error',
                message: errorMessage
            });
            setShowModal(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
            {/* Header */}
            <div className="flex items-center mb-4 px-3 w-full max-w-sm">
                <BackButton />
                <h3 className="text-xl font-medium text-center w-full text-gray-900">Changer le mot de passe</h3>
            </div>

            <motion.div
                className="w-full max-w-sm mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                        <span className="text-blue-500 text-4xl">🔒</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Changer mon mot de passe</h2>
                    <p className="text-center text-gray-600 text-sm">
                        Un code de vérification sera envoyé à votre email
                    </p>
                </div>

                {error && <div className="text-red-500 text-center mb-4 text-sm">{error}</div>}

                <button
                    onClick={handleSendOtp}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    disabled={loading}
                >
                    {loading ? 'Envoi en cours...' : 'Recevoir le code OTP'}
                </button>
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
                        <h4 className={`text-lg font-bold mb-4 text-center ${modalContent.type === 'success' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {modalContent.type === 'success' ? 'Code envoyé' : 'Erreur'}
                        </h4>
                        <p className="text-sm text-gray-700 text-center mb-4">
                            {modalContent.message}
                        </p>
                        <button
                            type="button"
                            className={`w-full ${modalContent.type === 'success'
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                } text-white rounded-xl py-2 font-bold shadow transition-colors`}
                            onClick={() => setShowModal(false)}
                        >
                            {modalContent.type === 'success' ? 'Continuer' : 'Réessayer'}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}

export default ChangePassword;