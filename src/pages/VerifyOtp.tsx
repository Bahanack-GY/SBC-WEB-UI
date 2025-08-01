import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Security from '../assets/icon/Data-security.png';
import BackButton from '../components/common/BackButton';
import { sbcApiService } from '../services/SBCApiService';

function VerifyOtp() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputs = useRef<(HTMLInputElement | null)[]>([]);
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const email = params.get('email') || '';

    useEffect(() => {
        if (!email) {
            navigate('/connexion');
        }
    }, [email, navigate]);

    const handleChange = (i: number, val: string) => {
        if (!/^[a-zA-Z0-9]?$/.test(val)) return;
        const newOtp = [...otp];
        newOtp[i] = val;
        setOtp(newOtp);
        if (val && i < 5) {
            inputs.current[i + 1]?.focus();
        }
    };
    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[i] && i > 0) {
            inputs.current[i - 1]?.focus();
        }
    };
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const paste = e.clipboardData.getData('text').slice(0, 6).split('');
        setOtp(paste.concat(Array(6 - paste.length).fill('')));
        setTimeout(() => {
            const next = paste.length < 6 ? paste.length : 5;
            inputs.current[next]?.focus();
        }, 10);
    };
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length !== 6) {
            setError('Veuillez entrer le code complet');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await sbcApiService.verifyOtp(email, otpCode);
            navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors de la vérification du code.');
        } finally {
            setLoading(false);
        }
    };
    const handleResendOtp = async () => {
        setLoading(true);
        setError('');
        try {
            await sbcApiService.requestPasswordResetOtp(email);
            alert('Code renvoyé ! Veuillez vérifier votre email.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Échec du renvoi de l\'OTP');
        } finally {
            setLoading(false);
        }
    };
    return (
        <>
            <div className="flex items-center mb-4 px-3">
                <BackButton />
                <h3 className="text-xl font-medium text-center w-full text-gray-900">Vérification</h3>
            </div>
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
                <img src={Security} alt="Analyse" className="size-44 mb-6 mx-auto" />
                <form onSubmit={handleVerify} className="w-full max-w-xs flex flex-col items-center">
                    <div className="text-center mb-2 font-semibold text-lg text-gray-800">
                        Connexion - Code de vérification
                    </div>
                    <div className="text-center text-gray-600 mb-1">{email}</div>
                    <div className="text-center text-sm text-gray-500 mb-2">
                        Un code de vérification a été envoyé à votre email pour finaliser la connexion.
                    </div>
                    {error && (
                        <div className="text-center text-red-500 text-sm mb-2">{error}</div>
                    )}
                    <div className="flex justify-center gap-2 my-4">
                        {otp.map((val, i) => (
                            <input
                                key={i}
                                ref={el => { inputs.current[i] = el; }}
                                type="text"
                                inputMode="text"
                                maxLength={1}
                                value={val}
                                onChange={e => handleChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                onPaste={handlePaste}
                                className="w-12 h-12 text-center text-2xl border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#115CF6] bg-white font-mono"
                                autoFocus={i === 0}
                            />
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                        Vous n'avez pas reçu le code ?
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={loading}
                            className="text-[#115CF6] font-semibold cursor-pointer hover:underline disabled:opacity-50 bg-transparent"
                        >
                            Renvoyer
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || otp.join('').length !== 6}
                        className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-bold shadow hover:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-lg"
                    >
                        {loading ? 'Vérification...' : 'Vérifier'}
                    </button>
                </form>
            </div>
        </>
    );
}

export default VerifyOtp; 