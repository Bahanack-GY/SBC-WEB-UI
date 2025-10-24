import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const currentLanguage = i18n.language || 'fr';

  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => changeLanguage('fr')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
          currentLanguage === 'fr'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        🇫🇷 FR
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
          currentLanguage === 'en'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        🇬🇧 EN
      </motion.button>
    </div>
  );
}

export default LanguageSwitcher;
