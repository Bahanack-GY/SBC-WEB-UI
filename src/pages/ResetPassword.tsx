import { FiLock } from 'react-icons/fi';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { useNavigate, useLocation } from 'react-router-dom';

function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || '';
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const mutation = useMutation({
        mutationFn: ({ email, newPassword }: { email: string, newPassword: string }) =>
            sbcApiService.resetPassword(email, '', newPassword),
        onSuccess: () => {
            setShowSuccessModal(true);
            setTimeout(() => {
                navigate('/connexion');
            }, 3000);
        }
    });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            setError('Veuillez remplir tous les champs.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }
        setError('');
        mutation.mutate({ email, newPassword });
    };
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-yellow-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                        <FiLock className="text-yellow-500" size={40} />
                    </div>
                    <p className="text-center text-gray-800 font-semibold mb-2">Définissez votre nouveau mot de passe.</p>
                </div>
                {mutation.isError && (
                    <div className="text-red-500 text-center mb-2">
                        {(mutation.error as Error)?.message || "Erreur lors de la réinitialisation."}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm mb-1">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Nouveau mot de passe"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 placeholder-gray-400`}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm mb-1">Confirmer le mot de passe</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirmer le mot de passe"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 placeholder-gray-400`}
                        />
                    </div>
                    {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
                        disabled={mutation.status === 'pending'}
                    >
                        {mutation.status === 'pending' ? 'Réinitialisation...' : 'Réinitialiser'}
                    </button>
                </form>
            </div>
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 relative animate-fadeIn flex flex-col items-center">
                        <FiLock className="text-green-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold mb-2 text-center">Mot de passe réinitialisé !</h3>
                        <p className="text-gray-700 text-center mb-2">Votre mot de passe a été changé avec succès.<br/>Vous allez être redirigé vers la page de connexion...</p>
                        <div className="text-gray-400 text-xs mt-2">Redirection dans 5 secondes...</div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ResetPassword; 