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
import { COOKIE_AUTH, noteServerDate, signatureFor } from './requestSigning';
import { csrfToken, isCookieSession, isSessionEndpoint, isUnsafeMethod, refreshSession } from './session';
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
    const sig = await sign(String(init.method ?? 'POST'), typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, retryHeaders, init.body);
    if (sig) retryHeaders.set('X-SBC-Signature', sig);
    return send(input, { ...init, headers: retryHeaders });
  };
  const sign = (method: string, url: string, headers: Headers, body: BodyInit | null | undefined) =>
    Promise.race([
      signatureFor(method, url, headers.get('Authorization') ?? (isCookieSession() ? COOKIE_AUTH : null), body),
      new Promise<null>(resolve => setTimeout(() => resolve(null), SIGN_BUDGET_MS)),
    ]).catch(() => null);
  /**
   * Security plan Phase 9 (utils/session.ts): every own-API call asks for a cookie session, and a
   * cookie-authenticated change carries the CSRF value. A 401 on a cookie session refreshes it once
   * (one refresh for the whole app) and sends the request again, signed anew.
   */
  const sessionHeaders = (headers: Headers, method: string) => {
    if (!headers.has('X-SBC-Session')) headers.set('X-SBC-Session', 'cookie');
    if (!headers.has('Authorization') && isUnsafeMethod(method)) {
      const csrf = csrfToken();
      if (csrf) headers.set('X-CSRF-Token', csrf);
    }
  };
  const replayable = (input: RequestInfo | URL, body: unknown) => !(input instanceof Request)
    && (body === undefined || body === null || typeof body === 'string' || body instanceof FormData || body instanceof URLSearchParams || body instanceof Blob);
  const dispatch = (input: RequestInfo | URL, init: RequestInit, headers: Headers, method: string, url: string) =>
    isProtectedAction(method, url) && !headers.has('X-SBC-Altcha') ? sendProtected(input, init, headers) : send(input, { ...init, headers });
  const wrapped = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (isOwnApi(url)) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        const id = deviceId();
        if (id && !headers.has('X-SBC-Device')) headers.set('X-SBC-Device', id);
        if (!headers.has('X-SBC-Client')) headers.set('X-SBC-Client', clientKind());
        const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
        sessionHeaders(headers, method);
        // A keepalive call (page closing) goes at once: waiting to sign could lose it.
        if (init?.keepalive) return original(input, { ...init, headers });
        const body = init?.body ?? (input instanceof Request && !/^(GET|HEAD)$/i.test(method) ? new Blob() : undefined);
        return sign(method, url, headers, body).then(async sig => {
          if (sig && !headers.has('X-SBC-Signature')) headers.set('X-SBC-Signature', sig);
          const res = await dispatch(input, init ?? {}, headers, method, url);
          if (res.status !== 401 || headers.has('Authorization') || !isCookieSession() || isSessionEndpoint(url) || !replayable(input, init?.body)) return res;
          if (!(await refreshSession(`${window.location.origin}/api`, original))) return res;
          const again = new Headers(headers);
          again.delete('X-SBC-Signature');
          again.delete('X-SBC-Altcha');
          again.delete('X-CSRF-Token');
          sessionHeaders(again, method);
          const sig2 = await sign(method, url, again, body);
          if (sig2) again.set('X-SBC-Signature', sig2);
          return dispatch(input, init ?? {}, again, method, url);
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
