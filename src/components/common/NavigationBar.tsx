import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Message01Icon,
  ShoppingBasket01Icon,
  StatusIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useMemo } from 'react';

interface NavItem {
  label: string;
  icon: typeof Home01Icon;
  path: string;
  /** Small unread/attention dot, as on the basket in the reference design. */
  dot?: boolean;
}

function NavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    // Always include chat buttons for all users
    // Relance is deliberately absent: it stays reachable from the services
    // sidebar, the Home services grid, Profile and AdsPack.
    const items: NavItem[] = [
      { label: 'Accueil', icon: Home01Icon, path: '/' },
      { label: 'Marketplace', icon: ShoppingBasket01Icon, path: '/marketplace', dot: true },
      { label: 'Wallet', icon: Wallet01Icon, path: '/wallet' },
      { label: 'SBC Statut', icon: StatusIcon, path: '/chat?view=status' },
      { label: 'Messages', icon: Message01Icon, path: '/chat' },
    ];
    return items;
  }, []);

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="app-nav fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-surface border border-border rounded-pill flex items-center px-2 py-2 gap-1"
    >
      {navItems.map((item) => {
        // Handle chat page with query params
        const currentPath = location.pathname + location.search;
        const isActive = currentPath === item.path ||
                        (item.path === '/' && location.pathname === '/') ||
                        (item.path === '/wallet' && location.pathname === '/wallet') ||
                        (item.path === '/chat' && location.pathname === '/chat' && !location.search) ||
                        (item.path === '/chat?view=status' && location.pathname === '/chat' && location.search.includes('view=status'));

        return (
          <motion.button
            key={item.label}
            onClick={() => navigate(item.path)}
            whileTap={{ scale: 0.92 }}
            className={`relative flex items-center rounded-pill transition-colors duration-200 focus:outline-none ${isActive ? 'px-3.5 py-2 text-white font-semibold' : 'px-2.5 py-2.5 text-ink-3 hover:text-ink-2'}`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* One shared layoutId slides the pill between tabs — this is why
                the app consolidated on a single motion instance. */}
            {isActive && (
              <motion.span
                layoutId="navPill"
                className="absolute inset-0 bg-primary rounded-pill"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center">
              <HugeiconsIcon icon={item.icon} size={22} />
              {isActive && <span className="ml-1.5 text-sm">{item.label}</span>}
            </span>
            {item.dot && !isActive && (
              <span className="absolute top-1 right-1 size-2 rounded-pill bg-accent" />
            )}
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default NavigationBar;
