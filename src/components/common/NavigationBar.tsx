import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MdDeviceHub, MdHome, MdShoppingBasket } from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import { useMemo } from 'react';
import { useRelance } from '../../contexts/RelanceContext';

// WhatsApp-style status icon component
const StatusIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRelanceSubscription } = useRelance();

  const navItems = useMemo(() => {
    // Always include chat buttons for all users
    let items: NavItem[] = [
      { label: 'Publicité', icon: <MdDeviceHub size={24} />, path: '/ads-pack' },
      { label: 'Messages', icon: <HiChatBubbleLeftRight size={24} />, path: '/chat' },
      { label: 'Statuts', icon: <StatusIcon size={24} />, path: '/chat?view=status' },
      { label: 'Accueil', icon: <MdHome size={24} />, path: '/' },
      { label: 'Marketplace', icon: <MdShoppingBasket size={24} />, path: '/marketplace' },
    ];

    // Add relance button if user has subscription
    if (hasRelanceSubscription) {
      items = [
        ...items,
        { label: 'Relance', icon: <FaWhatsapp size={24} />, path: '/relance' },
      ];
    }

    return items;
  }, [hasRelanceSubscription]);

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-[#d7f699] rounded-full flex px-3 py-3 shadow-lg gap-2 mt-3"
    >
      {navItems.map((item) => {
        // Handle chat page with query params
        const currentPath = location.pathname + location.search;
        const isActive = currentPath === item.path ||
                        (item.path === '/' && location.pathname === '/') ||
                        (item.path === '/chat' && location.pathname === '/chat' && !location.search) ||
                        (item.path === '/chat?view=status' && location.pathname === '/chat' && location.search.includes('view=status'));

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
