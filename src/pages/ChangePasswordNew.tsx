import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Security from '../assets/icon/Data-security.png';
import { sbcApiService } from '../services/SBCApiService';

function ChangePasswordNew() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const email = params.get('email') || '';
  const otp = params.get('otp') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sbcApiService.resetPassword(email, otp, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Erreur lors du changement de mot de passe.');
      setError('Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <img src={Security} alt="Analyse" className="size-44 mb-6 mx-auto" />
      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col items-center">
        <div className="text-center mb-2 font-semibold text-lg text-gray-800">
          Nouveau mot de passe
        </div>
        <div className="text-center text-gray-600 mb-1">{email}</div>
        {error && <div className="text-center text-red-500 text-sm mb-2">{error}</div>}
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Nouveau mot de passe"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder-gray-400"
        />
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Confirmer le mot de passe"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-bold shadow hover:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-lg"
        >
          {loading ? 'Changement...' : 'Changer le mot de passe'}
        </button>
      </form>
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-6 relative animate-fadeIn flex flex-col items-center">
            <img src={Security} alt="Success" className="size-20 mb-4" />
            <h3 className="text-xl font-bold mb-2 text-center">Mot de passe changé !</h3>
            <p className="text-gray-700 text-center mb-2">Votre mot de passe a été changé avec succès.<br/>Vous allez être redirigé vers votre profil...</p>
            <div className="text-gray-400 text-xs mt-2">Redirection dans 3 secondes...</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChangePasswordNew; 