import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sbcApiService } from '../services/SBCApiService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ChangePassword() {
    const { user } = useAuth();
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const mutation = useMutation({
        mutationFn: (email: string) => sbcApiService.requestPasswordResetOtp(email),
        onSuccess: () => {
            navigate(`/changer-mot-de-passe-otp?email=${encodeURIComponent(user?.email || '')}`);
        },
        onError: (err: unknown) => {
            if (err instanceof Error) setError(err.message);
            else setError('Erreur lors de l\'envoi du code OTP.');
        }
    });
    const handleSendOtp = () => {
        if (!user?.email) {
            setError('Utilisateur non authentifié.');
            return;
        }
        setError('');
        mutation.mutate(user.email);
    };
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                        <span className="text-blue-500 text-4xl">🔒</span>
                    </div>
                    <p className="text-center text-gray-800 font-semibold mb-2">Changer mon mot de passe</p>
                </div>
                {error && <div className="text-red-500 text-center mb-2">{error}</div>}
                <button
                    onClick={handleSendOtp}
                    className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
                    disabled={mutation.status === 'pending'}
                >
                    {mutation.status === 'pending' ? 'Envoi en cours...' : 'Recevoir le code OTP'}
                </button>
            </div>
        </div>
    );
}

export default ChangePassword;