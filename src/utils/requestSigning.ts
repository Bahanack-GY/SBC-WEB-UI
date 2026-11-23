/**
 * Security plan Phase 9 (browser-only access): every call to our own API is
 * signed with a key this browser made at sign-in.
 *
 * - The key pair is ECDSA P-256 (WebCrypto). The private key is created
 *   NON-EXTRACTABLE and kept in IndexedDB: no script, extension or copy of
 *   localStorage can read it out, so a token copied into Postman is useless
 *   without this browser.
 * - Its public key is sent with the sign-in code (`devicePublicKey`), and the
 *   server binds it to the token it issues. A token issued before this release
 *   gets its key once, through `POST /users/me/session-key`.
 * - Each request carries
 *     X-SBC-Signature: v1;t=<ms>;n=<nonce>;b=<sha256 hex of the body | UNSIGNED>;s=<signature>
 *   over "v1\n<METHOD>\n<path?query>\n<t>\n<n>\n<b>". File uploads (FormData)
 *   are signed without their body (`UNSIGNED`).
 * - A browser without WebCrypto or IndexedDB sends `none;r=<reason>`.
 *
 * The server only records the result for now (log-only, 14 days); nothing is
 * refused. Signing never blocks a request: any failure sends it unsigned.
 */

const DB_NAME = 'sbc-keys';
const STORE = 'keys';
const SLOT = 'session';

interface Stored { pair: CryptoKeyPair | null; spki: string | null; tokenTag: string | null; createdAt: number }

const subtle = (): SubtleCrypto | null => {
  try { return typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null; } catch { return null; }
};
export const signingSupported = (): boolean => !!subtle() && typeof indexedDB !== 'undefined';

// ---------- IndexedDB ----------
let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}
async function idbPut(key: string, value: unknown): Promise<void> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- helpers ----------
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const b64 = (buf: ArrayBuffer) => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
const b64url = (buf: ArrayBuffer) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256Hex = async (data: BufferSource | string) =>
  hex(await subtle()!.digest('SHA-256', typeof data === 'string' ? new TextEncoder().encode(data) : data));

const tagCache = new Map<string, string>();
async function tokenTag(token: string): Promise<string> {
  const hit = tagCache.get(token);
  if (hit) return hit;
  const t = (await sha256Hex(token)).slice(0, 16);
  tagCache.clear();
  tagCache.set(token, t);
  return t;
}

let current: Stored | null = null; // in-memory copy of the IndexedDB slot
let pending: { pair: CryptoKeyPair; spki: string } | null = null; // made for a sign-in in progress

async function newPair(): Promise<{ pair: CryptoKeyPair; spki: string }> {
  const pair = await subtle()!.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) as CryptoKeyPair;
  const spki = b64(await subtle()!.exportKey('spki', pair.publicKey));
  return { pair, spki };
}

async function load(): Promise<Stored | null> {
  if (current) return current;
  try { current = (await idbGet<Stored>(SLOT)) ?? null; } catch { current = null; }
  return current;
}
async function save(s: Stored): Promise<void> {
  current = s;
  try { await idbPut(SLOT, s); } catch { /* memory copy still signs this page's requests */ }
}

// ---------- clock: the server's Date header, so a phone with a wrong clock still signs on time ----------
let clockOffsetMs = 0;
export function noteServerDate(dateHeader: string | null): void {
  if (!dateHeader) return;
  const server = Date.parse(dateHeader);
  if (Number.isFinite(server)) clockOffsetMs = server + 500 - Date.now();
}

// ---------- sign-in ----------
/** Before sending the sign-in code: a fresh key pair; its public key goes with the code. Null if unsupported. */
export async function prepareSignInKey(): Promise<string | null> {
  if (!signingSupported()) return null;
  try { pending = await newPair(); return pending.spki; } catch { pending = null; return null; }
}

/**
 * Marker for a cookie session (utils/session.ts): the app holds no token, so the key is not
 * tied to a token tag but to the session; the server binds it to every access token it issues.
 */
export const COOKIE_AUTH = 'Cookie';
const COOKIE_TAG = 'cookie';

/** After the sign-in was accepted: the pending key becomes this token's key (null = cookie session). */
export async function adoptSignInKey(token: string | null): Promise<void> {
  if (!pending) return;
  try { await save({ pair: pending.pair, spki: pending.spki, tokenTag: token ? await tokenTag(token) : COOKIE_TAG, createdAt: Date.now() }); } catch { /* unsigned */ }
  pending = null;
}

/** A Bearer token moved to a cookie session (session/adopt) whose server copy kept this browser's key. */
export async function retagKeyForCookieSession(token: string): Promise<void> {
  try {
    const s = await load();
    if (s?.pair && s.tokenTag === await tokenTag(token)) await save({ ...s, tokenTag: COOKIE_TAG });
  } catch { /* unsigned until the next sign-in */ }
}

/** Logout: this browser's key is forgotten (the server revokes it too). */
export async function clearSessionKey(): Promise<void> {
  current = null;
  try { await idbPut(SLOT, { pair: null, spki: null, tokenTag: null, createdAt: Date.now() }); } catch { /* ignore */ }
}

/**
 * At start-up: a signed-in member whose token has no key in this browser
 * (signed in before this release) binds one, once. If the server already has a
 * key for the token (made elsewhere, or browser data cleared), this browser
 * cannot sign until the next sign-in.
 */
export async function ensureSessionKey(token: string | null, baseUrl: string, fetchImpl: typeof fetch = fetch, cookieSession = false): Promise<void> {
  if ((!token && !cookieSession) || !signingSupported()) return;
  try {
    const tag = token ? await tokenTag(token) : COOKIE_TAG;
    const s = await load();
    if (s?.tokenTag === tag) return;
    const { pair, spki } = await newPair();
    // A cookie session sends no Authorization: the fetch wrapper adds the cookie headers (CSRF).
    const r = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/users/me/session-key`, {
      method: 'POST',
      headers: token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: spki }),
    });
    if (r.status === 201) await save({ pair, spki, tokenTag: tag, createdAt: Date.now() });
    else if (r.status === 409) await save({ pair: null, spki: null, tokenTag: tag, createdAt: Date.now() });
  } catch { /* try again on the next start */ }
}

// ---------- per request ----------
async function bodyHash(body: BodyInit | null | undefined): Promise<string> {
  if (body === undefined || body === null) return sha256Hex('');
  if (typeof body === 'string') return sha256Hex(body);
  if (body instanceof URLSearchParams) return sha256Hex(body.toString());
  if (body instanceof ArrayBuffer) return sha256Hex(body);
  if (ArrayBuffer.isView(body)) return sha256Hex(body as ArrayBufferView);
  return 'UNSIGNED'; // FormData, Blob, streams: uploads, signed without their body
}

const randomNonce = () => { const b = new Uint8Array(18); crypto.getRandomValues(b); return b64url(b.buffer); };

/**
 * The X-SBC-Signature value for one request, or null when it cannot be signed
 * (no member token or cookie session, no key for it). `authorization` is the Bearer header,
 * or COOKIE_AUTH for a cookie session. Never throws.
 */
export async function signatureFor(method: string, url: string, authorization: string | null, body: BodyInit | null | undefined): Promise<string | null> {
  const cookie = authorization === COOKIE_AUTH;
  if (!cookie && !authorization?.startsWith('Bearer ')) return null;
  if (!signingSupported()) return `none;r=${!subtle() ? 'nocrypto' : 'noidb'}`;
  try {
    const s = await load();
    if (!s?.pair || s.tokenTag !== (cookie ? COOKIE_TAG : await tokenTag(authorization!.slice(7)))) return null;
    const u = new URL(url, window.location.origin);
    const t = String(Date.now() + clockOffsetMs);
    const n = randomNonce();
    const b = await bodyHash(body);
    const text = `v1\n${method.toUpperCase()}\n${u.pathname}${u.search}\n${t}\n${n}\n${b}`;
    const sig = await subtle()!.sign({ name: 'ECDSA', hash: 'SHA-256' }, s.pair.privateKey, new TextEncoder().encode(text));
    return `v1;t=${t};n=${n};b=${b};s=${b64url(sig)}`;
  } catch {
    return null;
  }
}

/** For tests. */
export const _resetSigning = () => { current = null; pending = null; clockOffsetMs = 0; tagCache.clear(); dbPromise = null; };
