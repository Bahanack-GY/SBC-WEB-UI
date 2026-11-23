/**
 * Picks up a new deploy in an app that stays open (an installed app on a phone
 * can run for days without reloading).
 *
 * Why (2026-11-23): the server retires routes when the app changes. An app left
 * open across a deploy kept running the old screens. On preprod (2026-11-20) a
 * member changed their MoMo number with the authenticator, then an old screen
 * still asked for the code sent by e-mail (410 APP_UPDATE_REQUIRED). At the prod
 * release every open app would do the same on the withdrawal and MoMo screens.
 *
 * Each build writes /version.json with its id (vite.config.ts). The app compares
 * it with its own id when it comes back to the foreground, and every 15 minutes
 * while visible. A newer build is loaded only at a safe moment, never in the
 * middle of a form (members complained of pages "refreshing by themselves"):
 *   - on the next page change that carries no in-memory state (`location.state`,
 *     e.g. the /otp page's withdrawal id, would be lost by a reload);
 *   - when the app comes back after at least 15 minutes in the background;
 *   - at once when the server answers APP_UPDATE_REQUIRED (the old screen
 *     cannot do that action anyway), at most once per build per minute.
 */
declare const __APP_BUILD__: string;

const CHECK_EVERY_MS = 15 * 60 * 1000;
const AWAY_LONG_ENOUGH_MS = 15 * 60 * 1000;
const RELOAD_GUARD_KEY = 'sbc_update_reload';

let latest: string | null = null;
let hiddenAt: number | null = null;
let started = false;

const currentBuild = () => (typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : '');

/** Whether a newer build than the running one has been seen. */
export const updateReady = () => !!latest && latest !== currentBuild();

/** Reads /version.json (never cached); null when unknown (dev server, offline…). */
export async function fetchLatestBuild(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const r = await fetcher(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const body = await r.json();
    return typeof body?.build === 'string' && body.build ? body.build : null;
  } catch {
    return null;
  }
}

export async function checkForUpdate(fetcher: typeof fetch = fetch): Promise<boolean> {
  const b = await fetchLatestBuild(fetcher);
  if (b) latest = b;
  return updateReady();
}

/** Reloads unless this build already reloaded for an update less than a minute ago (no loop). */
export function reloadForUpdate(reason: string): boolean {
  try {
    const raw = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const last = raw ? JSON.parse(raw) : null;
    if (last && last.build === currentBuild() && Date.now() - last.at < 60_000) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, JSON.stringify({ build: currentBuild(), at: Date.now(), reason }));
  } catch {
    // storage unavailable: still reload once
  }
  window.location.reload();
  return true;
}

/** Called on every page change (App): a safe moment to load a newer build. */
export function onRouteChange(hasState: boolean) {
  if (!hasState && updateReady()) reloadForUpdate('navigation');
}

/** The server said this screen is from an older app (410 APP_UPDATE_REQUIRED). */
export function onServerSaysUpdate() {
  reloadForUpdate('server');
}

/** Starts the checks; once, in the built app only. */
export function startUpdateWatch() {
  if (started || typeof window === 'undefined' || !currentBuild()) return;
  started = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    void checkForUpdate().then(ready => { if (ready && away >= AWAY_LONG_ENOUGH_MS) reloadForUpdate('foreground'); });
  });
  setInterval(() => { if (document.visibilityState === 'visible') void checkForUpdate(); }, CHECK_EVERY_MS);
  void checkForUpdate();
}

/** Tests only. */
export function __resetForTests() { latest = null; hiddenAt = null; started = false; }
