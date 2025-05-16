import { FiLock, FiHelpCircle } from 'react-icons/fi';
import { useState } from 'react';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError('Veuillez entrer une adresse email valide.');
        } else {
            setError('');
            // Envoyer la demande de réinitialisation ici
        }
    };
    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-white px-4">
            <div className="w-full max-w-sm mx-auto">
                
                <div className="flex flex-col items-center mt-8 mb-6">
                    <div className="bg-yellow-100 rounded-full w-24 h-24 flex items-center justify-center mb-4">
                        <FiLock className="text-yellow-500" size={40} />
                        <FiHelpCircle className="text-yellow-500 absolute ml-8 mt-8" size={24} />
                    </div>
                    <p className="text-center text-gray-800 font-semibold mb-2">Veuillez entrer votre adresse email pour recevoir un code de vérification.</p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm mb-1">Adresse email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="Ex : jeanpierre@gmail.com"
                            className={`w-full border ${error ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 placeholder-gray-400`}
                        />
                        {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
                    >
                        Envoyer
                    </button>
                </form>
            </div>
        </div>
    )
}

export default ForgotPassword;