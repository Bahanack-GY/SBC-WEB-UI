import { useEffect, useState } from 'react';

/** Chrome's non-standard install event. Not in lib.dom, so declared here. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa-install-dismissed-at';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari predates display-mode and uses this instead.
  (window.navigator as unknown as { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ reports itself as a Mac; the touch check separates it.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const wasRecentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * Install affordance for both platforms.
 *
 * Android/Chrome fires beforeinstallprompt, which must be captured and
 * replayed from a user gesture. iOS Safari has no such API at all — the only
 * route is Share -> "Sur l'écran d'accueil" — so there we show instructions
 * instead of a button that cannot work.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(wasRecentlyDismissed);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Suppress Chrome's own mini-infobar so ours is the only prompt.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return 'unavailable' as const;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use: Chrome will fire a fresh one if still eligible.
    setDeferred(null);
    if (outcome === 'accepted') setInstalled(true);
    return outcome;
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* private mode — the banner simply reappears next session */
    }
    setDismissed(true);
  };

  const ios = isIos();
  // Show when: not already installed, not snoozed, and either Chrome gave us a
  // prompt to replay or we are on iOS where instructions are the only option.
  const canShow = !installed && !dismissed && (!!deferred || ios);

  return { canShow, isIos: ios, canPromptNatively: !!deferred, install, dismiss, installed };
}
