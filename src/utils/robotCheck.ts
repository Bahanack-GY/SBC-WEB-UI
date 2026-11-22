/**
 * Security plan Phase 9 rule 3: the anti-robot check on sensitive actions (sign-in, sign-up,
 * password reset, contact and payout changes, authenticator setup, withdrawal, the public
 * « Signaler un problème » form). Self-hosted ALTCHA (proof of work, no third party, no
 * cookie): the gateway hands out a signed challenge, the browser finds its answer with
 * Web Crypto (about a second on a phone), and the answer travels with the action in
 * `X-SBC-Altcha`. The gateway checks it (ROBOT_CHECK=log counts, enforce refuses).
 *
 * Nothing is shown to the member. One answer is solved ahead of time on the pages that
 * lead to these actions (`prepareRobotAnswer`), so the action itself does not wait.
 * When the check is off (the challenge route answers 204), nothing is solved or sent.
 */
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/web/sha';

/** Same list as the gateway's robot-check.middleware.ts (method POST). */
const PROTECTED = [
  /^\/api\/users\/login$/,
  /^\/api\/users\/register$/,
  /^\/api\/users\/request-password-reset(-otp)?$/,
  /^\/api\/users\/request-change-email$/,
  /^\/api\/users\/request-change-phone$/,
  /^\/api\/users\/me\/momo\/change$/,
  /^\/api\/users\/crypto\/wallet\/change$/,
  /^\/api\/users\/me\/authenticator\/setup\/request$/,
  /^\/api\/transactions\/withdrawal\/initiate$/,
  /^\/api\/support\/public\/tickets$/,
];

/** Pages from which one of those actions starts: an answer is solved when they open. */
const PREPARE_ON = /^\/(connexion|signup|forgot-password|signaler-un-probleme|modifier-email|change-phone|wallet|profile|modifier-le-profil)(\/|$)/;

export function isProtectedAction(method: string, url: string, origin: string = window.location.origin): boolean {
  if (method.toUpperCase() !== 'POST') return false;
  try {
    const path = new URL(url, origin).pathname.replace(/\/+$/, '').toLowerCase();
    return PROTECTED.some(r => r.test(path));
  } catch {
    return false;
  }
}

export const shouldPrepareOn = (pathname: string) => PREPARE_ON.test(pathname);

const CHALLENGE_URL = '/api/altcha/challenge';
/** A challenge lives 10 min on the server; an answer older than this is solved again. */
const FRESH_MS = 8 * 60_000;
/** After a 204 (check off), ask again only after this. */
const OFF_RECHECK_MS = 5 * 60_000;
const SOLVE_TIMEOUT_MS = 20_000;

let ready: { header: string; at: number } | null = null;
let solving: Promise<string | null> | null = null;
let offUntil = 0;
let rawFetch: typeof fetch | null = null;

/** The fetch to use for the challenge (the unwrapped one, set by deviceSignals). */
export function setRobotFetch(f: typeof fetch) { rawFetch = f; }

async function solveOne(): Promise<string | null> {
  if (Date.now() < offUntil) return null;
  if (typeof crypto === 'undefined' || !crypto.subtle) return null; // very old browser: nothing to send
  const f = rawFetch ?? fetch;
  const res = await f(CHALLENGE_URL, { cache: 'no-store', credentials: 'same-origin' });
  if (res.status === 204) { offUntil = Date.now() + OFF_RECHECK_MS; return null; }
  if (!res.ok) return null;
  const challenge = await res.json();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOLVE_TIMEOUT_MS);
  try {
    const solution = await solveChallenge({ challenge, deriveKey, controller });
    if (!solution) return null;
    return btoa(JSON.stringify({ challenge, solution }));
  } finally {
    clearTimeout(timer);
  }
}

/** Starts solving one answer in the background (no-op if one is ready or being solved). */
export function prepareRobotAnswer(): void {
  if (solving || (ready && Date.now() - ready.at < FRESH_MS) || Date.now() < offUntil) return;
  solving = solveOne()
    .then(h => { if (h) ready = { header: h, at: Date.now() }; return h; })
    .catch(() => null)
    .finally(() => { solving = null; });
}

/**
 * The header value for one protected action, or null (check off, or no answer in time).
 * Each answer is used once; the next one starts solving right after.
 */
export async function takeRobotAnswer(waitMs = 10_000): Promise<string | null> {
  if (ready && Date.now() - ready.at < FRESH_MS) {
    const h = ready.header;
    ready = null;
    return h;
  }
  ready = null;
  if (Date.now() < offUntil) return null;
  prepareRobotAnswer();
  const pending = solving;
  if (!pending) return null;
  const h = await Promise.race([pending, new Promise<null>(r => setTimeout(() => r(null), waitMs))]);
  // the background solve may have stored it as `ready` meanwhile: it is used now, so drop it
  const stored = ready as { header: string; at: number } | null;
  if (h && stored?.header === h) ready = null;
  return h;
}

/** For tests. */
export function _resetRobotCheck() { ready = null; solving = null; offUntil = 0; rawFetch = null; }
