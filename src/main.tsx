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

// No refetch on window focus: every return to the tab refetched every query,
// and the resulting spinner flashes read as "the page refreshes by itself"
// (Rufus, twice). Data still refreshes on mount and on explicit invalidation.
const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />

      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
