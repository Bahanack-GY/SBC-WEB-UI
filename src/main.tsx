import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n/config' // Initialize i18n
import { purgeStaleCaches } from './utils/cacheBuster'

// Best-effort: unregister any leftover service workers and clear cache storage
// from past deploys, so users always run the freshly-shipped bundles.
purgeStaleCaches();

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />

      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
