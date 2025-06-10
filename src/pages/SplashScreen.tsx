import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiSmile, FiUsers, FiMonitor, FiLock } from 'react-icons/fi';

const steps = [
  {
    title: 'Bienvenue',
    description: 'Bienvenue sur notre application. Découvrez une nouvelle façon de gérer vos transactions facilement et en toute sécurité.',
    icon: 'smile',
  },
  {
    title: 'Environnement de travail convivial',
    description: 'Profitez d\'un environnement de travail agréable et collaboratif pour atteindre vos objectifs.',
    icon: 'monitor',
  },
  {
    title: 'Rejoignez notre équipe',
    description: 'Faites partie de notre équipe et bénéficiez d\'un accompagnement personnalisé.',
    icon: 'users',
  },
  {
    title: 'Sécurité garantie',
    description: 'Vos données et transactions sont protégées grâce à nos technologies de sécurité avancées.',
    icon: 'lock',
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
                {steps[step].icon === 'smile' && <FiSmile className="text-[#115CF6]" size={80} />}
                {steps[step].icon === 'monitor' && <FiMonitor className="text-[#115CF6]" size={80} />}
                {steps[step].icon === 'users' && <FiUsers className="text-[#115CF6]" size={80} />}
                {steps[step].icon === 'lock' && <FiLock className="text-[#115CF6]" size={80} />}
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
                <button onClick={handleGetStarted} className="bg-[#115CF6] text-white font-bold rounded-xl px-6 py-2 mx-auto transition-colors w-full hover:bg-blue-800">Commencer</button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SplashScreen;