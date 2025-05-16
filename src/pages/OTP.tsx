import { useState, useRef } from 'react';
import Security from '../assets/icon/Data-security.png';
import BackButton from '../components/common/BackButton';

const PHONE = '+31611133458';

function OTP() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

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
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // handle verification logic here
      
    window.location.href = '/transaction-confirmation';
  };

  return (
    <>
    <div className="flex items-center mb-4 px-3">
        <BackButton />
        <h3 className="text-xl font-medium text-center w-full text-gray-900">Verification</h3>
      </div>
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
    <img src={Security} alt="Analyse" className="size-44 mb-6 mx-auto" />
      <form onSubmit={handleVerify} className="w-full max-w-xs flex flex-col items-center">
        <div className="text-center mb-2 font-semibold text-lg text-gray-800">Entrez le code de vérification envoyé au</div>
        <div className="text-center text-gray-600 mb-1">{PHONE} <span className="text-xs text-blue-700 cursor-pointer ml-2">Numéro erroné ?</span></div>
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
        <div className="text-xs text-gray-500 mb-4">Vous n'avez pas reçu le code ? <span className="text-[#115CF6] font-semibold cursor-pointer">Renvoyer</span></div>
        <button type="submit" className="w-full bg-[#115CF6] text-white rounded-xl py-3 font-bold shadow hover:bg-blue-800 transition-colors text-lg">Vérifier</button>
      </form>
    </div>
    </>
  );
}

export default OTP;