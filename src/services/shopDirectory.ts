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
