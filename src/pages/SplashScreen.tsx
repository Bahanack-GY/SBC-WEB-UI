import { useState, useEffect } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import splash1 from '../assets/img/splash-1.png';
import splash2 from '../assets/img/splash-2.png';
import splash3 from '../assets/img/splash-3.png';
import splash4 from '../assets/img/splash-4.jpg';
import logo from '../assets/img/logo-sbc.png';

const slides = [
  {
    title: 'Bienvenue sur SBC',
    description: "L'espace ultime pour élargir ton réseau professionnel, acquérir des compétences de pointe et gagner jusqu'à 5 000 FCFA par jour.",
    image: splash1,
  },
  {
    title: 'Formations 100% pratiques',
    description: 'Fini les formations théoriques ennuyeuses. Nos coachs experts, en première ligne sur le terrain, t\'offrent un cocktail explosif de compétences directement applicables.',
    image: splash2,
  },
  {
    title: 'Opportunités lucratives',
    description: "Pas juste des revenus supplémentaires : nous t'offrons des solutions concrètes pour booster tes gains au quotidien.",
    image: splash3,
  },
  {
    title: 'Rejoins la communauté',
    description: "Bénéficie d'un accompagnement personnalisé au sein de la meilleure communauté d'Afrique. Ensemble, contre tous.",
    image: splash4,
  },
];

const getSessionExpired = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sessionExpired') === '1';
  }
  return false;
};

const clearSessionExpired = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sessionExpired');
  }
};

const SWIPE_THRESHOLD = 50;

function SplashScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (getSessionExpired()) {
      setSessionExpired(true);
      clearSessionExpired();
    }
  }, []);

  const goNext = () => {
    if (step < slides.length - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    setDirection(1);
    setStep(slides.length - 1);
  };

  const handleGetStarted = () => navigate('/connexion');
  const handleSignup = () => navigate('/signup');
  const handleLogin = () => navigate('/connexion');

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      goNext();
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      goPrev();
    }
  };

  const slide = slides[step];
  const isLast = step === slides.length - 1;

  // Slide animation variants — keep movement subtle so the layout doesn't shake
  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -32 }),
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#eaf2ff] via-white to-[#eaffea]">
      {/* Decorative blobs (purely visual) */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#115CF6]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#25D366]/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 max-w-md mx-auto">
        {/* Top bar: back button (when not on first slide) + logo + login */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                onClick={goPrev}
                aria-label="Précédent"
                className="h-9 w-9 flex items-center justify-center rounded-full bg-white/80 text-gray-700 shadow-sm hover:bg-white transition-colors"
              >
                <FiArrowLeft size={20} />
              </button>
            ) : (
              <div className="h-9 w-9" /> /* placeholder to keep logo centered */
            )}
            <img src={logo} alt="SBC" className="h-9 w-9 object-contain" />
          </div>
          <button
            onClick={handleLogin}
            className="text-sm font-semibold text-[#115CF6] hover:underline"
          >
            Se connecter
          </button>
        </div>

        {sessionExpired && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700 font-medium">
            Votre session a expiré. Veuillez vous reconnecter.
          </div>
        )}

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-6" role="progressbar" aria-valuenow={step + 1} aria-valuemax={slides.length}>
          {slides.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden"
            >
              <motion.div
                className="h-full bg-[#115CF6]"
                initial={{ width: '0%' }}
                animate={{ width: i < step ? '100%' : i === step ? '100%' : '0%' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          ))}
        </div>

        {/* Swipeable slide area — fixed-height to avoid layout shake */}
        <motion.div
          className="flex-1 flex flex-col items-center justify-center"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full flex flex-col items-center"
            >
              {/* Image — fixed-aspect container so heights stay consistent */}
              <div className="w-full flex items-center justify-center mb-6" style={{ height: 'min(45vh, 280px)' }}>
                <img
                  src={slide.image}
                  alt=""
                  className="max-h-full max-w-full object-contain drop-shadow-lg"
                />
              </div>

              {/* Text — reserved min-height prevents the layout from shaking
                  when descriptions vary in length between slides */}
              <div className="text-center px-2" style={{ minHeight: 170 }}>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{slide.title}</h2>
                <p className="text-gray-600 leading-relaxed">{slide.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Bottom action area */}
        <div className="mt-6 flex flex-col gap-3">
          {!isLast ? (
            <div className="flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Ignorer
              </button>
              <button
                onClick={goNext}
                className="bg-[#115CF6] hover:bg-blue-700 text-white font-bold rounded-xl px-6 py-3 shadow-md transition-colors"
              >
                Suivant
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleGetStarted}
                className="w-full bg-[#115CF6] hover:bg-blue-700 text-white font-bold rounded-xl py-3 shadow-md transition-colors"
              >
                Se connecter
              </button>
              <button
                onClick={handleSignup}
                className="w-full bg-white border-2 border-[#115CF6] text-[#115CF6] font-bold rounded-xl py-3 hover:bg-blue-50 transition-colors"
              >
                Créer un compte
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
