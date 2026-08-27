import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mail01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { cn } from '../../lib/utils';

import formationImg from '../../assets/icon/Formation.png';
import shopImg from '../../assets/icon/SBCShop.png';
import adsImg from '../../assets/icon/ads.png';
import contactsImg from '../../assets/icon/Contacts.png';
import sbcloveImg from '../../assets/icon/sbclove.png';

interface Props {
  formationsCount: number | null;
  hasRelanceAccess: boolean;
  relanceBadge?: number | null;
  onFormations: () => void;
  onRelance: () => void;
}

type Tile = {
  key: string;
  label: string;
  subtitle: string;
  img: string;
  tint: string;
  onClick: () => void;
  dot?: boolean;
};

function ServicesGrid({
  formationsCount, hasRelanceAccess, relanceBadge, onFormations, onRelance,
}: Props) {
  const navigate = useNavigate();

  const tiles: Tile[] = [
    {
      key: 'formations', label: 'Formations',
      subtitle: formationsCount === null ? 'Chargement…' : `${formationsCount} formations`,
      img: formationImg, tint: 'bg-primary-soft',
      onClick: onFormations, dot: (formationsCount ?? 0) > 0,
    },
    {
      key: 'shop', label: 'SBC Shop', subtitle: 'Boutiques & produits',
      img: shopImg, tint: 'bg-accent-soft',
      onClick: () => navigate('/marketplace'),
    },
    {
      key: 'ads', label: 'Ads Network', subtitle: 'Gagnez en diffusant',
      img: adsImg, tint: 'bg-primary-soft',
      onClick: () => navigate('/ads-network'),
    },
    {
      key: 'contacts', label: 'Contacts', subtitle: 'Répertoire SBC',
      img: contactsImg, tint: 'bg-success-soft',
      onClick: () => navigate('/contacts'),
    },
    {
      key: 'love', label: 'SBC Love', subtitle: 'Rencontres SBC',
      img: sbcloveImg, tint: 'bg-danger-soft',
      onClick: () => navigate('/sbclove'),
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
            {/* The illustrations are full scenes with ratios from 0.92 to 1.99,
                so object-contain in a fixed box — object-cover would crop heads.
                They are also ~140KB each, hence lazy + async decode. */}
            <span className={cn('block w-full h-20 rounded-tile overflow-hidden', t.tint)}>
              {/* h-full w-full + object-contain, NOT max-h/max-w: inside a
                  sized box max-height:100% does not constrain, so the image
                  rendered at full width and got clipped (Contacts came out
                  218px tall in an 80px box). object-contain letterboxes it.

                  mix-blend-multiply because these PNGs carry an alpha channel
                  but an OPAQUE WHITE background (sampled 255,255,255,255), so
                  without it each one shows as a white rectangle inside its
                  tinted panel. Multiplying white against the tint drops it out. */}
              <img
                src={t.img}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain p-1.5 mix-blend-multiply"
              />
            </span>
            <span className="font-semibold text-ink text-sm">{t.label}</span>
            <span className="text-xs text-ink-3">{t.subtitle}</span>
            {t.dot && <span className="absolute top-2 right-2 size-2 rounded-pill bg-primary" aria-hidden />}
          </motion.button>
        ))}
      </div>

      {/* Relance keeps today's behaviour exactly: navigate if the user has
          credits, otherwise open the packs modal. No illustration was supplied
          for it, so it keeps its glyph. */}
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
