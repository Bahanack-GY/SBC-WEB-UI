import { useState } from 'react';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkSquare01Icon } from '@hugeicons/core-free-icons';
import { BUSINESS_TYPES } from './businessTypes';
import { cn } from '../../lib/utils';
import { isNewShop, type Shop } from '../../services/shopDirectory';

/** Deterministic tint per shop, so a card looks the same across reloads. */
const TINTS = [
  'bg-primary-soft text-primary',
  'bg-accent-soft text-accent',
  'bg-success-soft text-success',
  'bg-danger-soft text-danger',
  'bg-surface-2 text-ink-2',
];
const tintFor = (slug: string) =>
  TINTS[[...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];

function ShopCard({ shop, index }: { shop: Shop; index: number }) {
  const meta = BUSINESS_TYPES[shop.businessType] ?? BUSINESS_TYPES.general;
  const tint = tintFor(shop.slug);

  // Two thirds of shops have no banner and 40% have no logo, so the fallback is
  // the common case, not the edge case. A URL can also 404 or be replaced
  // (re-uploading changes it), so a broken load falls back to the same place.
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const showBanner = !!shop.bannerUrl && !bannerFailed;
  const showLogo = !!shop.logoUrl && !logoFailed;

  return (
    <motion.a
      href={shop.url}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="block bg-surface border border-border rounded-card overflow-hidden"
    >
      {/* Banner strip. Always rendered so cards keep a uniform height in the
          grid; the image is the enhancement, the tint is the baseline. */}
      <div className={cn('relative h-24 w-full', !showBanner && tint)}>
        {showBanner ? (
          <img
            src={shop.bannerUrl!}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            onError={() => setBannerFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center opacity-40">
            <HugeiconsIcon icon={meta.icon} size={30} />
          </span>
        )}

        {isNewShop(shop) && (
          <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-pill bg-success text-white">
            Nouveau
          </span>
        )}
      </div>

      {/* Column, not a row: in a 2-up grid at phone width each card is ~175px,
          so a name sitting beside a 48px logo only gets ~91px and truncates to
          about ten characters. Stacked, it gets the full card width. */}
      <div className="p-3 pt-0 flex flex-col">
        {/* Logo sits on the banner seam, the way a storefront avatar does.
            When the shop has none (41% of them), the slot still reserves its
            height so every card in the grid stays the same size — but it draws
            nothing, so the banner is not covered by an empty plate. */}
        <span
          className={cn(
            'shrink-0 -mt-6 mb-1.5 size-12 rounded-tile overflow-hidden block',
            showLogo && 'border-2 border-surface bg-surface',
          )}
        >
          {showLogo && (
            <img
              src={shop.logoUrl!}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              onError={() => setLogoFailed(true)}
              // object-contain, NOT cover: most shop logos are wide wordmarks,
              // and covering a square tile crops them down to their middle
              // sliver — the logo reads as missing. Contain letterboxes it.
              className="h-full w-full object-contain p-1"
            />
          )}
        </span>

        <span className="min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-ink text-sm truncate">{shop.name}</span>
            <HugeiconsIcon icon={LinkSquare01Icon} size={13} className="text-ink-3 shrink-0" />
          </span>
          <span className="block text-xs text-ink-3 truncate">{shop.slug}</span>
          <span className={cn('mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-pill', meta.tint)}>
            <HugeiconsIcon icon={meta.icon} size={11} />
            {meta.label}
          </span>
        </span>
      </div>
    </motion.a>
  );
}

export default ShopCard;
