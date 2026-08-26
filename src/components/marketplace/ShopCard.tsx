import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkSquare01Icon } from '@hugeicons/core-free-icons';
import { BUSINESS_TYPES } from './businessTypes';
import { cn } from '../../lib/utils';
import type { Shop } from '../../services/shopDirectory';

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
      className="bg-surface border border-border rounded-card p-3 flex items-center gap-3"
    >
      <span className={cn('size-11 shrink-0 grid place-items-center rounded-tile font-bold text-lg', tintFor(shop.slug))}>
        {initial}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink text-sm truncate">{shop.name}</span>
        {/* The slug IS the shop's address — it is what members share, so show it. */}
        <span className="block text-xs text-ink-3 truncate">{shop.slug}</span>
        <span className={cn('mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-pill', meta.tint)}>
          <HugeiconsIcon icon={meta.icon} size={11} />
          {meta.label}
        </span>
      </span>

      <HugeiconsIcon icon={LinkSquare01Icon} size={16} className="text-ink-3 shrink-0" />
    </motion.a>
  );
}

export default ShopCard;
