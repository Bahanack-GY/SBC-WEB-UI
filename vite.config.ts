import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ponytail: one-line declaration instead of pulling in @types/node for a
// single env read in the dev-server config.
declare const process: { env: Record<string, string | undefined> }

// Changes every build: versions the service worker URL (utils/cacheBuster.ts) and is
// written to /version.json, which an open app compares with its own (utils/appUpdate.ts).
const APP_BUILD = Date.now().toString(36)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'sbc-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: APP_BUILD }) })
    },
  }],
  define: { __APP_BUILD__: JSON.stringify(APP_BUILD) },
  // ponytail: import.meta.url instead of path.resolve — same result, no @types/node dep
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'https://sniperbuisnesscenter.com/api',
      // The shop directory lives on another host and sends no CORS headers
      // (its OPTIONS preflight 404s), so the browser cannot call it directly.
      // Proxying makes it same-origin AND keeps the API key server-side
      // instead of inlining it into the bundle.
      '/shop-directory': {
        target: 'https://api.sniperbusinesscenter.shop',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/shop-directory/, '/directory'),
        headers: {
          'X-API-Key': process.env.SHOP_DIRECTORY_API_KEY
            ?? '4f879cf4ef86d6dbcaf8fbba5f3ec2e9f4ab724b9d7ee9cbfa9e6c622d9f2f18',
        },
      },
    }
  },
})
