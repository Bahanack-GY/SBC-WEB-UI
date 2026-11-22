/**
 * Security plan Phase 1 (signals): every call to our own API carries
 *   X-SBC-Device  a random ID for this browser (no personal data in it), and
 *   X-SBC-Client  'app' when SBC runs from the home screen (installed), else 'web'
 *                 (Phase 11 splits the activity figures by it).
 * The server keeps them only for members who accepted the privacy policy that
 * announces it. The ID lives in localStorage, so the 60-day storage sweep
 * (`sweepExpiredStorage`) renews it, in line with the APDP 60-day rule; logout
 * keeps it (a device is not a person).
 */
import { noteServerDate, signatureFor } from './requestSigning';
import { isProtectedAction, setRobotFetch, takeRobotAnswer } from './robotCheck';

export const DEVICE_ID_KEY = 'sbc_device_id';

const randomId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
};

/** This browser's device ID, created on first use. Null when storage is unavailable. */
export function deviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = randomId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

/** 'app' when SBC was opened from the home screen (installed PWA), else 'web'. */
export function clientKind(): 'app' | 'web' {
  try {
    const standalone = typeof window.matchMedia === 'function'
      && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches);
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    return standalone || iosStandalone ? 'app' : 'web';
  } catch {
    return 'web';
  }
}

/** Whether a request goes to our own API (same origin, /api/…). */
export function isOwnApi(url: string, origin: string = window.location.origin): boolean {
  try {
    const u = new URL(url, origin);
    return u.origin === origin && u.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

/** Signing waits at most this long; past it the request goes unsigned. */
const SIGN_BUDGET_MS = 300;

/**
 * Adds the two headers to calls to our own API, and (Security plan Phase 9)
 * the request signature (utils/requestSigning.ts). Installed once, in main.tsx.
 */
export function installDeviceSignals(): void {
  if (typeof window === 'undefined' || (window.fetch as { __sbcSignals?: boolean }).__sbcSignals) return;
  const original = window.fetch.bind(window);
  setRobotFetch(original);
  const send = (input: RequestInfo | URL, init: RequestInit) =>
    original(input, init).then(res => { noteServerDate(res.headers.get('date')); return res; });
  /**
   * Sensitive actions carry the anti-robot answer (utils/robotCheck.ts). If the gateway
   * refuses it (enforce mode: expired, already used…), one retry with a fresh answer, when
   * the body can be sent again (text).
   */
  const sendProtected = async (input: RequestInfo | URL, init: RequestInit, headers: Headers) => {
    const answer = await takeRobotAnswer().catch(() => null);
    if (answer) headers.set('X-SBC-Altcha', answer);
    const res = await send(input, { ...init, headers });
    if (res.status !== 403 || !(init.body === undefined || typeof init.body === 'string')) return res;
    const code = await res.clone().json().then((j: { code?: string }) => j?.code, () => undefined);
    if (code !== 'ROBOT_CHECK_FAILED') return res;
    const again = await takeRobotAnswer(15_000).catch(() => null);
    if (!again) return res;
    const retryHeaders = new Headers(headers);
    retryHeaders.set('X-SBC-Altcha', again);
    retryHeaders.delete('X-SBC-Signature'); // a new nonce is needed; signing again below
    const sig = await Promise.race([
      signatureFor(String(init.method ?? 'POST'), typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, retryHeaders.get('Authorization'), init.body),
      new Promise<null>(r => setTimeout(() => r(null), SIGN_BUDGET_MS)),
    ]).catch(() => null);
    if (sig) retryHeaders.set('X-SBC-Signature', sig);
    return send(input, { ...init, headers: retryHeaders });
  };
  const wrapped = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (isOwnApi(url)) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        const id = deviceId();
        if (id && !headers.has('X-SBC-Device')) headers.set('X-SBC-Device', id);
        if (!headers.has('X-SBC-Client')) headers.set('X-SBC-Client', clientKind());
        // A keepalive call (page closing) goes at once: waiting to sign could lose it.
        if (init?.keepalive) return original(input, { ...init, headers });
        const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
        const body = init?.body ?? (input instanceof Request && !/^(GET|HEAD)$/i.test(method) ? new Blob() : undefined);
        const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), SIGN_BUDGET_MS));
        return Promise.race([signatureFor(method, url, headers.get('Authorization'), body), timeout])
          .catch(() => null)
          .then(sig => {
            if (sig && !headers.has('X-SBC-Signature')) headers.set('X-SBC-Signature', sig);
            if (isProtectedAction(method, url) && !headers.has('X-SBC-Altcha')) return sendProtected(input, init ?? {}, headers);
            return send(input, { ...init, headers });
          });
      }
    } catch {
      /* never block a request for a signal */
    }
    return original(input, init);
  }) as typeof window.fetch & { __sbcSignals?: boolean };
  wrapped.__sbcSignals = true;
  window.fetch = wrapped;
}
