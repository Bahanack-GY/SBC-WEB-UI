import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel01Icon, ConnectIcon, Home01Icon, Store01Icon, Megaphone01Icon, Call02Icon,
  FavouriteIcon, Mail01Icon, Wallet01Icon, UserGroupIcon,
  ChampionIcon, CreditCardIcon, Coins01Icon, Message01Icon, User02Icon,
  HandshakeIcon, ArrowRight01Icon, StatusIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';

type Item = { label: string; to: string; icon: typeof Home01Icon; tint: string };

/**
 * Every entry points at a route that exists in App.tsx — verified, because a
 * drawer full of dead links is worse than a shorter drawer.
 */
const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Gagner',
    items: [
      { label: 'Classement', to: '/classement', icon: ChampionIcon, tint: 'bg-accent-soft text-accent' },
      { label: 'Mes filleuls', to: '/filleuls', icon: UserGroupIcon, tint: 'bg-primary-soft text-primary' },
      { label: 'Espace partenaire', to: '/partenaire', icon: HandshakeIcon, tint: 'bg-accent-soft text-accent' },
      { label: 'Ads Network', to: '/ads-network', icon: Megaphone01Icon, tint: 'bg-primary-soft text-primary' },
      // /ads-pack was only ever reachable from the bottom nav; it lost that
      // entry point when Publicité became SBC Statut, so it lives here now.
      { label: 'Packs publicité', to: '/ads-pack', icon: ConnectIcon, tint: 'bg-accent-soft text-accent' },
    ],
  },
  {
    title: 'Boutique',
    items: [
      { label: 'SBC Shop', to: '/marketplace', icon: Store01Icon, tint: 'bg-accent-soft text-accent' },
    ],
  },
  {
    title: 'Communauté',
    items: [
      { label: 'SBC Statut', to: '/chat?view=status', icon: StatusIcon, tint: 'bg-primary-soft text-primary' },
      { label: 'SBC Love', to: '/sbclove', icon: FavouriteIcon, tint: 'bg-danger-soft text-danger' },
      { label: 'Messages', to: '/chat', icon: Message01Icon, tint: 'bg-primary-soft text-primary' },
      { label: 'Contacts', to: '/contacts', icon: Call02Icon, tint: 'bg-success-soft text-success' },
      { label: 'Relance auto', to: '/relance', icon: Mail01Icon, tint: 'bg-accent-soft text-accent' },
    ],
  },
  {
    title: 'Compte',
    items: [
      { label: 'Portefeuille', to: '/wallet', icon: Wallet01Icon, tint: 'bg-success-soft text-success' },
      { label: "Solde d'activation", to: '/activation-balance', icon: Coins01Icon, tint: 'bg-accent-soft text-accent' },
      { label: 'Abonnement', to: '/abonnement', icon: CreditCardIcon, tint: 'bg-primary-soft text-primary' },
      { label: 'Mon profil', to: '/profile', icon: User02Icon, tint: 'bg-surface-2 text-ink-2' },
    ],
  },
];

function ServicesSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Esc closes, and the page behind must not scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const go = (to: string) => {
    onClose();
    if (to !== location.pathname) navigate(to);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Tous les services"
            className="fixed inset-y-0 left-0 z-[71] w-[82%] max-w-xs bg-surface border-r border-border flex flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div>
                <p className="font-bold text-ink">Tous les services</p>
                <p className="text-[11px] text-ink-3">Naviguez où vous voulez</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer le menu"
                className="size-9 grid place-items-center rounded-tile bg-surface-2 text-ink-2"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <button
                onClick={() => go('/')}
                className={cn(
                  'w-full flex items-center gap-3 rounded-card px-2.5 py-2.5 mb-3 text-left',
                  location.pathname === '/' ? 'bg-primary-soft' : 'hover:bg-surface-2',
                )}
              >
                <span className="size-9 grid place-items-center rounded-tile bg-primary text-white shrink-0">
                  <HugeiconsIcon icon={Home01Icon} size={18} />
                </span>
                <span className="font-semibold text-ink text-sm flex-1">Accueil</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} className="text-ink-3" />
              </button>

              {GROUPS.map((group, gi) => (
                <div key={group.title} className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-3 px-2.5 mb-1.5">
                    {group.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map((item, ii) => {
                      const active = location.pathname === item.to;
                      return (
                        <motion.li
                          key={item.to}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          // Staggered by absolute position so the list unfurls
                          // top-to-bottom rather than group-by-group.
                          transition={{ delay: 0.05 + (gi * 4 + ii) * 0.025, duration: 0.2 }}
                        >
                          <button
                            onClick={() => go(item.to)}
                            className={cn(
                              'w-full flex items-center gap-3 rounded-card px-2.5 py-2 text-left transition-colors',
                              active ? 'bg-primary-soft' : 'hover:bg-surface-2',
                            )}
                          >
                            <span className={cn('size-9 grid place-items-center rounded-tile shrink-0', item.tint)}>
                              <HugeiconsIcon icon={item.icon} size={18} />
                            </span>
                            <span className={cn('text-sm flex-1 truncate', active ? 'font-bold text-primary' : 'font-medium text-ink')}>
                              {item.label}
                            </span>
                            {active && <span className="size-1.5 rounded-pill bg-primary shrink-0" aria-hidden />}
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default ServicesSidebar;
