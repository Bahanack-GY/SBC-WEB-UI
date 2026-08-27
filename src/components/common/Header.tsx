import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, User02Icon } from '@hugeicons/core-free-icons';
import logo from '../../assets/img/logo-sbc.png';
import ServicesSidebar from './ServicesSidebar';

function Header() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface border-b border-border">
        {/* Three equal columns so the logo is centred on the VIEWPORT, not
            merely between two buttons of unequal width. */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2">
          <motion.button
            onClick={() => setMenuOpen(true)}
            whileTap={{ scale: 0.9 }}
            aria-label="Ouvrir le menu des services"
            aria-expanded={menuOpen}
            className="size-9 grid place-items-center rounded-tile text-ink-2 hover:bg-surface-2 transition-colors"
          >
            <HugeiconsIcon icon={Menu01Icon} size={22} />
          </motion.button>

          <div className="flex justify-center min-w-0">
            <button onClick={() => navigate('/')} aria-label="Accueil">
              <img src={logo} alt="Sniper Business Center" className="w-24 max-w-full" />
            </button>
          </div>

          <motion.button
            onClick={() => navigate('/profile')}
            whileTap={{ scale: 0.9 }}
            aria-label="Mon profil"
            className="size-9 grid place-items-center rounded-tile text-ink-2 hover:bg-surface-2 transition-colors"
          >
            <HugeiconsIcon icon={User02Icon} size={22} />
          </motion.button>
        </div>
      </header>

      <ServicesSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

export default Header;
