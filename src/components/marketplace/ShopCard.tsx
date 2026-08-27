import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { BUSINESS_TYPES } from './businessTypes';
import { cn } from '../../lib/utils';
import { isNewShop, type Shop } from '../../services/shopDirectory';

/** Deterministic tint per shop, so a card looks the same across reloads. */
const AVATAR_TINTS = [
  'bg-primary-soft text-primary',
  'bg-accent-soft text-accent',
  'bg-success-soft text-success',
  'bg-danger-soft text-danger',
  'bg-surface-2 text-ink-2',
];
const tintFor = (slug: string) =>
  AVATAR_TINTS[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length];

function ShopCard({ shop, index }: { shop: Shop; index: number }) {
  const meta = BUSINESS_TYPES[shop.businessType] ?? BUSINESS_TYPES.general;
  const initial = (shop.name.trim()[0] ?? '?').toUpperCase();

  return (
    <motion.a
      href={shop.url}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="h-full bg-surface border border-border rounded-card p-2 flex flex-col gap-2"
    >
      {/* Media. The directory serves no logos, so the tile is the shop's
          identity: deterministic tint + initial, with the trade icon behind. */}
      <span className={cn('relative aspect-[4/3] grid place-items-center rounded-tile overflow-hidden', tintFor(shop.slug))}>
        <HugeiconsIcon
          icon={meta.icon}
          size={64}
          className="absolute -right-3 -bottom-3 opacity-15"
        />
        <span className="relative font-bold text-3xl">{initial}</span>
        {isNewShop(shop) && (
          <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-pill bg-success text-white">
            Nouveau
          </span>
        )}
      </span>

      <span className="px-1 min-w-0 flex-1">
        <span className="block font-semibold text-ink text-sm leading-snug line-clamp-2">
          {shop.name}
        </span>
        {/* The slug IS the shop's address — it is what members share, so show it. */}
        <span className="block text-[11px] text-ink-3 truncate">{shop.slug}</span>
      </span>

      <span className="flex items-center gap-1 bg-surface-2 rounded-pill pl-3 pr-2 py-1.5">
        <span className="text-xs font-semibold text-ink-2">Visiter</span>
        <HugeiconsIcon icon={ArrowRight01Icon} size={15} className="text-ink-2 ml-auto" />
      </span>
    </motion.a>
  );
}

export default ShopCard;
