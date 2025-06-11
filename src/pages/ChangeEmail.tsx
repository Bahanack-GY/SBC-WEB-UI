import { FiEdit2 } from 'react-icons/fi';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ChangeEmail() {
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();
    const mutation = useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            // Step 1: Verify password by logging in with current user's email
            if (!user?.email) throw new Error('Utilisateur non authentifié.');
            await sbcApiService.loginUser(user.email, password); // Throws if password is wrong
            // Step 2: Request email change OTP
            return sbcApiService.requestEmailChangeOtp(email);
        },
        onSuccess: () => {
            navigate(`/verify-email-otp?email=${encodeURIComponent(newEmail)}`);
        },
        onError: (err: unknown) => {
            if (err instanceof Error) {
                setError(err.message);
            } else if (typeof err === 'string') {
                setError(err);
            } else {
                setError("Erreur lors de la vérification du mot de passe.");
            }
        }
    });
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            setError('Veuillez entrer une adresse email valide.');
        } else if (!password) {
            setError('Veuillez entrer votre mot de passe.');
        } else {
            setError('');
            mutation.mutate({ email: newEmail, password });
        }
    };
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                        <FiEdit2 className="text-blue-500" size={40} />
                    </div>
                    <p className="text-center text-gray-800 font-semibold mb-2">Modifier mon email</p>
                </div>
                {mutation.isError && (
                    <div className="text-red-500 text-center mb-2">
                        {(mutation.error as Error)?.message || "Erreur lors de l'envoi du code."}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm mb-1">Nouvel email</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            placeholder="Ex : nouvel@email.com"
                            className={`w-full border ${error && error.toLowerCase().includes('email') ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder-gray-400`}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm mb-1">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Votre mot de passe"
                            className={`w-full border ${error && error.toLowerCase().includes('passe') ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder-gray-400`}
                        />
                    </div>
                    {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
                        disabled={mutation.status === 'pending'}
                    >
                        {mutation.status === 'pending' ? 'Envoi en cours...' : 'Envoyer le code'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ChangeEmail; 