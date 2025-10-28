import { FiLock, FiHelpCircle } from 'react-icons/fi';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { sbcApiService } from '../services/SBCApiService';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/common/BackButton';

function ForgotPassword() {
    const [identifier, setIdentifier] = useState('');
    const [channel, setChannel] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showChannelOptions, setShowChannelOptions] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!identifier.trim()) {
            setError('Veuillez entrer votre email ou numéro de téléphone.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await sbcApiService.requestPasswordResetOtp(identifier, channel as 'email' | 'whatsapp' || undefined);
            
            const channelText = channel || 'votre méthode préférée';
            setModalContent({
                type: 'success',
                message: `Un code de vérification a été envoyé via ${channelText}.`
            });
            setShowModal(true);

            // Navigate to OTP verification after a short delay
            setTimeout(() => {
                navigate('/otp', {
                    state: {
                        email: identifier,
                        flow: 'passwordReset'
                    }
                });
            }, 2000);

        } catch (error) {
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
                <h3 className="text-xl font-medium text-center w-full text-gray-900">Mot de passe oublié</h3>
            </div>

            <motion.div
                className="w-full max-w-sm mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-yellow-100 rounded-full w-24 h-24 flex items-center justify-center mb-4 relative">
                        <FiLock className="text-yellow-500" size={40} />
                        <FiHelpCircle className="text-yellow-500 absolute ml-8 mt-8" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Réinitialiser le mot de passe</h2>
                    <p className="text-center text-gray-600 text-sm">
                        Entrez votre email ou numéro de téléphone pour recevoir un code de vérification
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm mb-1 font-medium">Email ou numéro de téléphone</label>
                        <input
                            type="text"
                            value={identifier}
                            onChange={e => {
                                setIdentifier(e.target.value);
                                setError(''); // Clear error when user types
                            }}
                            placeholder="Ex : jeanpierre@gmail.com ou +237675090755"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 placeholder-gray-400`}
                            required
                        />
                        {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
                    </div>

                    {/* Optional: Channel override */}
                    <div className="channel-options">
                        <button 
                            type="button"
                            onClick={() => setShowChannelOptions(!showChannelOptions)}
                            className="text-yellow-500 text-sm font-medium hover:underline bg-transparent"
                        >
                            ⚙️ Options avancées
                        </button>
                        
                        {showChannelOptions && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                                <label className="block text-gray-700 text-sm mb-1 font-medium">
                                    Forcer la méthode de livraison pour cette demande:
                                </label>
                                <select 
                                    value={channel} 
                                    onChange={(e) => setChannel(e.target.value)}
                                    className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white text-sm"
                                >
                                    <option value="">Utiliser ma préférence</option>
                                    <option value="email">📧 Email</option>
                                    <option value="whatsapp">📱 WhatsApp</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        disabled={loading}
                    >
                        {loading ? 'Envoi en cours...' : 'Envoyer le code'}
                    </button>
                </form>

                <div className="text-center text-sm text-gray-500 mt-6">
                    Vous vous souvenez de votre mot de passe ?
                    <button
                        onClick={() => navigate('/connexion')}
                        className="text-yellow-500 font-semibold hover:underline ml-1 bg-transparent"
                    >
                        Se connecter
                    </button>
                </div>
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
                            {modalContent.type === 'success' ? 'Email envoyé' : 'Erreur'}
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

export default ForgotPassword;