import { sbcApiService } from '../services/SBCApiService';
import { handleApiResponse } from './apiHelpers';
import { APP_SW_PATH } from './cacheBuster';

/**
 * Web push in the phone's browser.
 *
 * Android (Chrome, Samsung Internet…) supports it in the browser itself.
 * iPhone only once SBC is added to the home screen (iOS 16.4+), so there the
 * parrain is told how instead of being shown a button that cannot work.
 */
export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function pushSupport(): PushSupport {
  const capable = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIos() && !isStandalone()) return 'ios-needs-install';
  return capable ? 'supported' : 'unsupported';
}

const keyBytes = (base64Url: string) => {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
};

const registration = async () =>
  (await navigator.serviceWorker.getRegistration(APP_SW_PATH)) ??
  (await navigator.serviceWorker.register(APP_SW_PATH, { scope: '/' }));

/** Whether this browser already receives SBC notifications. */
export async function isPushEnabled(): Promise<boolean> {
  if (pushSupport() !== 'supported' || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration(APP_SW_PATH);
  return !!(await reg?.pushManager.getSubscription());
}

export type EnableResult = 'enabled' | 'denied' | 'unavailable';

/** Asks permission (must run from a tap), subscribes this browser, and tells the server. */
export async function enablePush(): Promise<EnableResult> {
  if (pushSupport() !== 'supported') return 'unavailable';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const { publicKey } = handleApiResponse(await sbcApiService.pushGetPublicKey()) ?? {};
  if (!publicKey) return 'unavailable';
  const reg = await registration();
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  handleApiResponse(await sbcApiService.pushSubscribe(subscription.toJSON()));
  return 'enabled';
}
