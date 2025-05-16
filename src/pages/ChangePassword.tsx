import { useState } from 'react';
import { FiLock, FiCheckCircle, FiEye, FiEyeOff } from 'react-icons/fi';

function ChangePassword() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères.');
        } else if (password !== confirm) {
            setError('Les mots de passe ne correspondent pas.');
        } else {
            setError('');
            // Envoyer la demande de changement ici
        }
    };
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-yellow-100 rounded-full w-24 h-24 flex items-center justify-center mb-4 relative">
                        <FiLock className="text-yellow-500" size={40} />
                        <FiCheckCircle className="text-yellow-500 absolute ml-8 mt-8" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Créer un nouveau mot de passe</h2>
                    <p className="text-center text-gray-700 mb-4">Votre nouveau mot de passe doit être différent de l'ancien.</p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                        <label className="block text-gray-700 text-sm mb-1">Nouveau mot de passe</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Nouveau mot de passe"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 placeholder-gray-400 pr-12`}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-9 -translate-y-1/2 text-gray-400"
                            onClick={() => setShowPassword(v => !v)}
                            tabIndex={-1}
                        >
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                    <div className="relative">
                        <label className="block text-gray-700 text-sm mb-1">Confirmer le mot de passe</label>
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="Confirmer le mot de passe"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 placeholder-gray-400 pr-12`}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-9 -translate-y-1/2 text-gray-400"
                            onClick={() => setShowConfirm(v => !v)}
                            tabIndex={-1}
                        >
                            {showConfirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>
                    {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
                    <button type="button" className="text-yellow-600 text-sm font-medium hover:underline bg-transparent mx-auto">Changer le mot de passe</button>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
                    >
                        Enregistrer
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ChangePassword;