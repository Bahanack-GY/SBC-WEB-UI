import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdDeviceHub, MdHome, MdShoppingBasket } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { useMemo } from 'react';
import { useRelance } from '../../contexts/RelanceContext';

const baseNavItems = [
  { label: 'Publicité', icon: <MdDeviceHub size={24} />, path: '/ads-pack' },
  { label: 'Accueil', icon: <MdHome size={24} />, path: '/' },
  { label: 'Marketplace', icon: <MdShoppingBasket size={24} />, path: '/marketplace' },
];

function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRelanceSubscription } = useRelance();

  const navItems = useMemo(() => {
    if (hasRelanceSubscription) {
      return [
        ...baseNavItems,
        { label: 'Relance', icon: <FaWhatsapp size={24} />, path: '/relance' },
      ];
    }
    return baseNavItems;
  }, [hasRelanceSubscription]);

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-[#d7f699] rounded-full flex px-3 py-3 shadow-lg gap-2 mt-3"
      
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || (item.path === '/' && location.pathname === '/');
        return (
          <motion.button
            key={item.label}
            onClick={() => navigate(item.path)}
            whileTap={{ scale: 0.92 }}
            className={`flex items-center px-3 py-2 rounded-full transition-colors duration-200 focus:outline-none ${isActive ? 'bg-lime-400 text-green-900 font-bold shadow' : 'bg-green-700 text-white hover:bg-green-600'}`}
            aria-label={item.label}
            initial={false}
            animate={isActive ? { scale: 1.08 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {item.icon}
            {isActive && <span className="ml-1 text-sm">{item.label}</span>}
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default NavigationBar;


