import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon, PlusSignIcon, Store01Icon, AlertCircleIcon, Cancel01Icon,
} from '@hugeicons/core-free-icons';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Header from '../components/common/Header';
import Skeleton from '../components/common/Skeleton';
import ShopCard from '../components/marketplace/ShopCard';
import { BUSINESS_TYPES } from '../components/marketplace/businessTypes';
import { useShops } from '../hooks/useShops';
import { useInfiniteReveal } from '../hooks/useInfiniteReveal';
import { SHOP_DASHBOARD_URL, type ShopBusinessType } from '../services/shopDirectory';
import { cn } from '../lib/utils';

function Marketplace() {
  const { data, isLoading, error, refetch } = useShops();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ShopBusinessType | 'all'>('all');

  const shops = useMemo(() => data ?? [], [data]);

  // Only offer filters for types that actually have shops — an empty chip is
  // a dead end.
  const availableTypes = useMemo(() => {
    const counts = new Map<ShopBusinessType, number>();
    for (const s of shops) counts.set(s.businessType, (counts.get(s.businessType) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [shops]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shops.filter(
      (s) =>
        (type === 'all' || s.businessType === type) &&
        (!q || s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)),
    );
  }, [shops, query, type]);

  // One fetch, cached — scrolling reveals more of what is already in memory
  // rather than hitting the API again.
  const { visible: shown, hasMore, sentinel } = useInfiniteReveal(visible, 12);

  return (
    <ProtectedRoute>
      <Header />
      <div className="p-4 pb-28 flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">SBC Shop</h1>
          <p className="text-xs text-ink-3">
            {isLoading ? 'Chargement des boutiques…' : `${shops.length} boutiques membres`}
          </p>
        </div>

        {/* Search */}
        <div className="relative search-bar">
          <HugeiconsIcon
            icon={Search01Icon}
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une boutique…"
            aria-label="Rechercher une boutique"
            className="w-full bg-surface border border-border rounded-pill pl-10 pr-10 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} />
            </button>
          )}
        </div>

        {/* Type filter */}
        {availableTypes.length > 1 && (
          <div className="category-filters flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
            <button
              onClick={() => setType('all')}
              className={cn(
                'shrink-0 text-xs font-semibold px-3 py-1.5 rounded-pill border transition-colors',
                type === 'all'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-ink-2 border-border',
              )}
            >
              Tout ({shops.length})
            </button>
            {availableTypes.map(([t, count]) => {
              const meta = BUSINESS_TYPES[t] ?? BUSINESS_TYPES.general;
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(active ? 'all' : t)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-pill border transition-colors',
                    active
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-ink-2 border-border',
                  )}
                >
                  <HugeiconsIcon icon={meta.icon} size={13} />
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height="h-56" rounded="rounded-card" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
            <HugeiconsIcon icon={AlertCircleIcon} size={26} className="text-danger" />
            <p className="text-sm font-semibold text-ink">Annuaire indisponible</p>
            <p className="text-xs text-ink-2">Impossible de charger les boutiques pour le moment.</p>
            <button
              onClick={() => refetch()}
              className="mt-1 bg-primary text-white text-sm font-semibold rounded-pill px-4 py-2"
            >
              Réessayer
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-surface border border-border rounded-card p-6 text-center flex flex-col items-center gap-2">
            <HugeiconsIcon icon={Store01Icon} size={30} className="text-ink-3" />
            <p className="text-sm font-semibold text-ink">
              {shops.length === 0 ? 'Aucune boutique pour le moment' : 'Aucun résultat'}
            </p>
            <p className="text-xs text-ink-2">
              {shops.length === 0
                ? 'Soyez le premier à ouvrir votre boutique SBC.'
                : 'Essayez un autre nom ou une autre catégorie.'}
            </p>
          </div>
        ) : (
          <>
            {/* Two per row everywhere, three on tablets. */}
            <ul className="product-grid grid grid-cols-2 lg:grid-cols-3 gap-2">
              {shown.map((shop, i) => (
                <li key={shop.slug} className="min-w-0">
                  <ShopCard shop={shop} index={i} />
                </li>
              ))}
            </ul>

            {hasMore && (
              <div ref={sentinel} className="grid grid-cols-2 lg:grid-cols-3 gap-2 pt-1" aria-hidden>
                <Skeleton height="h-56" rounded="rounded-card" />
                <Skeleton height="h-56" rounded="rounded-card" />
              </div>
            )}

            <p className="text-center text-xs text-ink-3 pt-1">
              {hasMore
                ? `${shown.length} sur ${visible.length} boutiques`
                : `${visible.length} boutique${visible.length > 1 ? 's' : ''} affichée${visible.length > 1 ? 's' : ''}`}
            </p>
          </>
        )}
      </div>

      {/* Create/manage a shop. Sits above the bottom nav pill. */}
      <motion.a
        href={SHOP_DASHBOARD_URL}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={{ scale: 0.92 }}
        aria-label="Créer ma boutique"
        className="add-product fixed bottom-24 right-4 z-40 size-14 grid place-items-center rounded-pill bg-primary text-white border border-primary"
      >
        <HugeiconsIcon icon={PlusSignIcon} size={26} />
      </motion.a>
    </ProtectedRoute>
  );
}

export default Marketplace;
