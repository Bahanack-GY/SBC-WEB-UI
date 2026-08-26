/**
 * SBC Shop directory — the public list of member shops.
 *
 * Fetched through a same-origin proxy path, NOT directly from
 * api.sniperbusinesscenter.shop. Two reasons, both load-bearing:
 *
 *  1. CORS. That host returns no Access-Control-Allow-Origin and its OPTIONS
 *     preflight 404s, so a browser fetch carrying an X-API-Key header is
 *     blocked outright.
 *  2. The key. Vite inlines VITE_* into the bundle, so shipping the key to the
 *     client would publish it. The proxy injects it server-side instead.
 *
 * Dev: handled by the '/shop-directory' proxy in vite.config.ts.
 * Prod: the host must forward /shop-directory/* to
 *       https://api.sniperbusinesscenter.shop/directory/* with the
 *       X-API-Key header attached. See DEPLOYMENT below.
 *
 * DEPLOYMENT (nginx):
 *   location /shop-directory/ {
 *     proxy_pass https://api.sniperbusinesscenter.shop/directory/;
 *     proxy_set_header X-API-Key "<key>";
 *     proxy_set_header Host api.sniperbusinesscenter.shop;
 *   }
 */
const DIRECTORY_PATH =
  import.meta.env.VITE_SHOP_DIRECTORY_PATH ?? '/shop-directory/shops';

/** Where a member goes to create or manage their own shop. */
export const SHOP_DASHBOARD_URL = 'https://sniperbusinesscenter.shop/dashboard/login';

/**
 * How recent a shop must be to show the "nouveau" badge.
 *
 * ponytail: 72h, not the conventional 7 days, because this directory added all
 * 32 of its shops in one week — a 7-day window currently badges every single
 * row, which says nothing. Widen it once the signup rate settles.
 */
export const NEW_SHOP_WINDOW_MS = 72 * 60 * 60 * 1000;

export const isNewShop = (shop: { createdAt: string }, now: number = Date.now()) => {
  const created = Date.parse(shop.createdAt);
  return Number.isFinite(created) && now - created <= NEW_SHOP_WINDOW_MS;
};

export type ShopBusinessType =
  | 'food' | 'apparel' | 'cosmetics' | 'jewelry' | 'electronics' | 'general' | 'digital';

export interface Shop {
  slug: string;
  name: string;
  businessType: ShopBusinessType;
  url: string;
  createdAt: string;
}

interface DirectoryResponse {
  count: number;
  shops: Shop[];
}

export async function fetchShops(signal?: AbortSignal): Promise<Shop[]> {
  const response = await fetch(DIRECTORY_PATH, { signal });
  if (!response.ok) {
    throw new Error(`Directory responded ${response.status}`);
  }
  const body = (await response.json()) as DirectoryResponse;
  return body.shops ?? [];
}
