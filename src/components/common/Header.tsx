import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Menu01Icon, User02Icon } from '@hugeicons/core-free-icons';
import logo from '../../assets/img/logo-sbc.png';
import ServicesSidebar from './ServicesSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { sbcApiService } from '../../services/SBCApiService';

function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Same resolution order the rest of the app uses: a direct URL, then a
  // settings file id, then nothing.
  const avatarUrl = user?.avatar
    ? user.avatar
    : user?.avatarId
      ? sbcApiService.generateSettingsFileUrl(user.avatarId)
      : '';
  const showAvatar = !!avatarUrl && !avatarFailed;

  return (
    <>
      {/* z-50 so the header stays above page content that uses z-10..z-40.
          The drawer (z-70+) and its backdrop still cover it, which is correct. */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border">
        {/* Three columns so the logo is centred on the VIEWPORT, not merely
            between two buttons of unequal width. */}
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
            className="size-9 rounded-pill overflow-hidden grid place-items-center bg-surface-2 text-ink-2 ring-2 ring-primary/20 hover:ring-primary/40 transition-shadow"
          >
            {showAvatar ? (
              // object-cover so a non-square photo fills the circle instead of
              // letterboxing inside it.
              <img
                src={avatarUrl}
                alt=""
                aria-hidden
                onError={() => setAvatarFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <HugeiconsIcon icon={User02Icon} size={20} />
            )}
          </motion.button>
        </div>
      </header>

      <ServicesSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

export default Header;
