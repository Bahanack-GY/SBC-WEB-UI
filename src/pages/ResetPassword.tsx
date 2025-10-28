import { FiLock } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { sbcApiService } from '../services/SBCApiService';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleApiResponse } from '../utils/apiHelpers';
import BackButton from '../components/common/BackButton';

function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const { email, passwordResetToken } = location.state || {};

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalContent, setModalContent] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (!email || !passwordResetToken) {
            navigate('/forgot-password');
        }
    }, [email, passwordResetToken, navigate]);

    if (!email || !passwordResetToken) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newPassword || !confirmPassword) {
            setError('Veuillez remplir tous les champs.');
            return;
        }
        
        if (newPassword.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const response = await sbcApiService.resetPassword(email, passwordResetToken, newPassword);
            handleApiResponse(response);
            
            setModalContent({
                type: 'success',
                message: 'Votre mot de passe a été réinitialisé avec succès ! Vous allez être redirigé vers la page de connexion.'
            });
            setShowModal(true);
            
            setTimeout(() => {
                navigate('/connexion');
            }, 3000);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue lors de la réinitialisation de votre mot de passe.";
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
            <div className="flex items-center mb-4 px-3 w-full max-w-sm">
                <BackButton />
                <h3 className="text-xl font-medium text-center w-full text-gray-900">Nouveau mot de passe</h3>
            </div>

            <motion.div 
                className="w-full max-w-sm mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                        <FiLock className="text-green-500" size={40} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Définir un nouveau mot de passe</h2>
                    <p className="text-center text-gray-600 text-sm">
                        Choisissez un mot de passe sécurisé pour votre compte
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm mb-1 font-medium">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => {
                                setNewPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="Au moins 8 caractères"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-700 placeholder-gray-400`}
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-gray-700 text-sm mb-1 font-medium">Confirmer le mot de passe</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => {
                                setConfirmPassword(e.target.value);
                                setError('');
                            }}
                            placeholder="Répétez le mot de passe"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-700 placeholder-gray-400`}
                            required
                        />
                    </div>
                    
                    {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
                    
                    {newPassword && (
                        <div className="text-xs text-gray-500">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                <span>Au moins 8 caractères</span>
                            </div>
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        disabled={loading}
                    >
                        {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
                    </button>
                </form>
            </motion.div>

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
                        <div className="flex flex-col items-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                                modalContent.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                                <FiLock className={`${
                                    modalContent.type === 'success' ? 'text-green-500' : 'text-red-500'
                                }`} size={32} />
                            </div>
                            
                            <h4 className={`text-lg font-bold mb-4 text-center ${
                                modalContent.type === 'success' ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {modalContent.type === 'success' ? 'Mot de passe réinitialisé !' : 'Erreur'}
                            </h4>
                            
                            <p className="text-sm text-gray-700 text-center mb-4">
                                {modalContent.message}
                            </p>
                            
                            {modalContent.type === 'success' && (
                                <div className="text-gray-400 text-xs mt-2">Redirection dans 3 secondes...</div>
                            )}
                        </div>
                        
                        {modalContent.type === 'error' && (
                            <button
                                type="button"
                                className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl py-2 font-bold shadow transition-colors"
                                onClick={() => setShowModal(false)}
                            >
                                Réessayer
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}

export default ResetPassword; 