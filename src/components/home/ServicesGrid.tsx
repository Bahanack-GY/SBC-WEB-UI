import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Book02Icon, Store01Icon, Megaphone01Icon, Call02Icon,
  FavouriteIcon, Task01Icon, Mail01Icon, ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';

interface Props {
  formationsCount: number | null;
  sbcloveOpen: boolean;
  hasRelanceAccess: boolean;
  relanceBadge?: number | null;
  onFormations: () => void;
  onRelance: () => void;
}

type Tile = {
  key: string;
  label: string;
  subtitle: string;
  icon: typeof Book02Icon;
  tint: string;
  onClick: () => void;
  dot?: boolean;
};

function ServicesGrid({
  formationsCount, sbcloveOpen, hasRelanceAccess, relanceBadge, onFormations, onRelance,
}: Props) {
  const navigate = useNavigate();

  // Every tile maps to a route that actually exists in App.tsx. "SBC Live" from
  // the reference design is deliberately absent: there is no /sbc-live route,
  // and a dead tile is worse than an absent one. Add it with the route.
  const tiles: Tile[] = [
    {
      key: 'formations', label: 'Formations',
      subtitle: formationsCount === null ? 'Chargement…' : `${formationsCount} formations`,
      icon: Book02Icon, tint: 'bg-primary-soft text-primary',
      onClick: onFormations, dot: (formationsCount ?? 0) > 0,
    },
    {
      key: 'shop', label: 'SBC Shop', subtitle: 'Boutiques & produits',
      icon: Store01Icon, tint: 'bg-accent-soft text-accent',
      onClick: () => navigate('/marketplace'),
    },
    {
      key: 'ads', label: 'Ads Network', subtitle: 'Gagnez en diffusant',
      icon: Megaphone01Icon, tint: 'bg-primary-soft text-primary',
      onClick: () => navigate('/ads-network'),
    },
    {
      key: 'contacts', label: 'Contacts', subtitle: 'Répertoire SBC',
      icon: Call02Icon, tint: 'bg-success-soft text-success',
      onClick: () => navigate('/contacts'),
    },
    ...(sbcloveOpen
      ? [{
          key: 'love', label: 'SBC Love', subtitle: 'Rencontres SBC',
          icon: FavouriteIcon, tint: 'bg-danger-soft text-danger',
          onClick: () => navigate('/sbclove'),
        } as Tile]
      : []),
    {
      key: 'produits', label: 'Mes produits', subtitle: 'Gérer mes annonces',
      icon: Task01Icon, tint: 'bg-surface-2 text-ink-2',
      onClick: () => navigate('/mes-produits'),
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-ink">Nos services</h2>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t, i) => (
          <motion.button
            key={t.key}
            onClick={t.onClick}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.2) }}
            className="relative text-left bg-surface border border-border rounded-card p-3 flex flex-col gap-2"
          >
            <span className={cn('size-10 grid place-items-center rounded-tile', t.tint)}>
              <HugeiconsIcon icon={t.icon} size={20} />
            </span>
            <span className="font-semibold text-ink text-sm">{t.label}</span>
            <span className="text-xs text-ink-3">{t.subtitle}</span>
            {t.dot && <span className="absolute top-3 right-3 size-2 rounded-pill bg-primary" aria-hidden />}
          </motion.button>
        ))}
      </div>

      {/* Relance keeps today's behaviour exactly: navigate if the user has
          credits, otherwise open the packs modal. */}
      <motion.button
        onClick={onRelance}
        whileTap={{ scale: 0.98 }}
        className="bg-surface border border-border rounded-card p-3 flex items-center gap-3 text-left"
      >
        <span className="size-10 grid place-items-center rounded-tile bg-accent-soft text-accent shrink-0">
          <HugeiconsIcon icon={Mail01Icon} size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink text-sm">Relance auto</span>
          <span className="block text-xs text-ink-3">
            {hasRelanceAccess ? 'Messages programmés' : 'Activer la relance'}
          </span>
        </span>
        {typeof relanceBadge === 'number' && relanceBadge > 0 && (
          <span className="shrink-0 min-w-6 h-6 px-1.5 grid place-items-center rounded-pill bg-accent text-white text-xs font-bold">
            {relanceBadge}
          </span>
        )}
        <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="text-ink-3 shrink-0" />
      </motion.button>
    </section>
  );
}

export default ServicesGrid;
