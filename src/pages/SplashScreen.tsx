import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
// import { FiSmile, FiMonitor, FiUsers, FiLock } from 'react-icons/fi';
import splash1 from '../assets/img/splash-1.png';
import splash2 from '../assets/img/splash-2.png';
import splash3 from '../assets/img/splash-3.png';
import splash4 from '../assets/img/splash-4.jpg';

const steps = [
  {
    title: 'Bienvenue',
    description: "Découvre SBC, l’espace ultime pour élargir ton réseau professionnel, acquérir des compétences de pointe grâce à nos formations exclusives, et gagner jusqu’à 5 000 FCFA par jour ! ",
    icon: 'smile',
  },
  {
    title: 'Formations 100% Pratiques',
    description: 'Chez SBC, on a déclaré la guerre aux formations ennuyeuses et théoriques ! Nos coachs experts, qui sont en première ligne sur le terrain, tont préparé un cocktail explosif de compétences',
    icon: 'monitor',
  },
  {
    title: 'Opportunités Lucratives',
    description: 'Chez SBC, nous ne te promettons pas juste des revenus supplémentaires – nous t’offrons des solutions concrètes pour booster tes gains au quotidien.',
    icon: 'lock',
  },
  {
    title: 'Rejoins nous',
    description: 'Rejoins la meilleure communauté d\'afrique et bénéficiez d\'un accompagnement personnalisé. Ensemble contre tous',
    icon: 'users',
  },
  
];

const getSessionExpired = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sessionExpired') === '1';
  }
  return false;
};

function clearSessionExpired() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sessionExpired');
  }
}

const splashImages = [splash1, splash2, splash3, splash4];

function SplashScreen() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (getSessionExpired()) {
      setSessionExpired(true);
      clearSessionExpired();
    }
  }, []);

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };
  const handleSkip = () => setStep(steps.length - 1);
  const handleGetStarted = () => navigate('/connexion');

  return (
    <div className="flex flex-col min-h-screen w-full bg-white">
      <div className="flex flex-col flex-1 w-full h-full">
        {sessionExpired && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded shadow text-center font-semibold">
            Votre session a expiré. Veuillez vous reconnecter.
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, type: 'spring' }}
            className="flex flex-col flex-1 w-full h-full px-4"
          >
            <div className="flex flex-1 flex-col justify-center items-center w-full">
              <div className="mb-6">
                <img
                  src={splashImages[step]}
                  alt={`Splash ${step + 1}`}
                  className="w-40 h-40 object-contain"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">{steps[step].title}</h2>
              <p className="text-gray-500 text-center mb-8">{steps[step].description}</p>
            </div>
            <div className="flex items-center justify-between w-full mb-8 gap-2">
              {step < steps.length - 1 ? (
                <button onClick={handleSkip} className="text-gray-400 font-semibold">Ignorer</button>
              ) : <div />}
              {step < steps.length - 1 ? (
                <div className="flex justify-center flex-1">
                  {steps.map((_, i) => (
                    <span
                      key={i}
                      className={`mx-1 w-2 h-2 rounded-full ${i === step ? 'bg-[#115CF6]' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex-1" />
              )}
              {step < steps.length - 1 ? (
                <button onClick={handleNext} className="text-[#115CF6] font-bold">Suivant</button>
              ) : (
                <button onClick={handleGetStarted} className="bg-[#115CF6] text-white font-bold rounded-xl px-6 py-2 mx-auto transition-colors w-full hover:bg-blue-800">Rejoindre la communauté</button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SplashScreen;