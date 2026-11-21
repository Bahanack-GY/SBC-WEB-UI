import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n/config' // Initialize i18n
import { purgeStaleCaches, registerAppServiceWorker } from './utils/cacheBuster'
import { sweepExpiredStorage } from './utils/privacy'
import { installClientErrorReporting } from './services/clientErrors'
import { installDeviceSignals } from './utils/deviceSignals'
import { ensureSessionKey } from './utils/requestSigning'
import { getBaseUrl, getToken } from './utils/apiHelpers'

// Nothing the site keeps on the device may be older than 60 days (APDP).
sweepExpiredStorage();
// Failed API calls → support analytics (signed-in members only).
installClientErrorReporting();

// Security plan Phase 1: our API calls say which browser (random ID) and client they come from.
installDeviceSignals();
// Security plan Phase 9: a member signed in before request signing existed gets this browser's key, once.
void ensureSessionKey(getToken(), getBaseUrl());

// Best-effort: unregister leftover service workers from past deploys and clear
// cache storage, so users always run the freshly-shipped bundles. Then register
// our own no-cache worker, which is what makes the app installable.
purgeStaleCaches().then(registerAppServiceWorker);

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
