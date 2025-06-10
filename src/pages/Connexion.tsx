import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Connexion() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    let valid = true;
    const newErrors = { email: '', password: '' };
    // Email regex (simple)
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      newErrors.email = 'Veuillez entrer un email valide.';
      valid = false;
    }
    if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères.';
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setLoading(true);
      try {
        console.log('Connexion: Starting login process for', email);
        const result = await login(email, password);
        console.log('Connexion: Login result:', result);

        if (result.requiresOtp) {
          console.log('Connexion: OTP required, redirecting to OTP page');
          // Redirect to OTP verification page
          navigate('/otp', {
            state: {
              userId: result.userId,
              email: result.email || email,
              fromLogin: true
            }
          });
        } else {
          console.log('Connexion: Direct login success, redirecting to home');
          // Direct login success - redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('Connexion: Login error:', error);
        setErrors({
          email: '',
          password: error instanceof Error ? error.message : 'Login failed'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Connexion</h1>
        <p className="text-gray-500 mb-8">Entrez votre email et votre mot de passe pour vous connecter</p>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="Ex : Jeanpierre@gmail.com"
              className={`w-full border ${errors.email ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#115CF6] text-gray-700 placeholder-gray-400`}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                className={`w-full border ${errors.password ? 'border-red-400' : 'border-gray-300'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#115CF6] text-gray-700 placeholder-gray-400 pr-12`}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
            <div className="flex justify-end mt-2">
              <button type="button" className="text-[#115CF6] text-sm font-medium hover:underline bg-transparent" onClick={() => navigate('/forgot-password')}>Mot de passe oublié ?</button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#115CF6] hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-lg mt-2 shadow"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <div className="text-center text-sm text-gray-500 mt-6">
          Pas de compte ?{' '}
          <button
            type="button"
            className="text-[#115CF6] font-semibold hover:underline bg-transparent"
            onClick={() => navigate('/signup')}
          >
            S'inscrire
          </button>
        </div>
      </div>
    </div>
  );
}

export default Connexion;