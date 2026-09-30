import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Tests share the app's Vite setup (React, the `@` alias) and add a browser-like
// DOM. Run with `npm test`.
export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
}))
