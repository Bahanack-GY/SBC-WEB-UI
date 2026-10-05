import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());

// jsdom has no matchMedia; motion/react reads it for prefers-reduced-motion.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    // Report reduced motion: animations then finish instantly, so tests see
    // final values — the same path users who ask for less motion get.
    matches: /prefers-reduced-motion/.test(query), // motion asks "(prefers-reduced-motion)"
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;
}

// jsdom has no IntersectionObserver; motion's whileInView uses it.
if (!('IntersectionObserver' in window)) {
  (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */ }
    takeRecords() { return []; }
  };
}

// jsdom does not implement scrolling; some components scroll into view.
window.scrollTo = () => undefined;

// Recent Node ships a global localStorage that shadows jsdom's and, without a
// backing file, lacks the Storage methods. Tests get a plain in-memory one.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const store = new Map<string, string>();
  const memory: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    key: (i) => [...store.keys()][i] ?? null,
    removeItem: (k) => { store.delete(k); },
    setItem: (k, v) => { store.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memory, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: memory, configurable: true });
}
