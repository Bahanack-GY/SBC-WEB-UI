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
