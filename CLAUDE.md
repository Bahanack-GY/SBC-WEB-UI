# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Development server:**
```bash
npm run dev
```
Starts Vite dev server on port 5000 with hot reload.

**Build for production:**
```bash
npm run build
```
Installs dependencies with legacy peer deps and builds with TypeScript checking.

**Linting:**
```bash
npm run lint
```
Runs ESLint with TypeScript and React rules.

**Preview production build:**
```bash
npm run preview
```

## Architecture Overview

### Core Structure
- **React + TypeScript SPA** using Vite for fast development
- **Authentication system** with OTP verification flow
- **Multi-context state management**: AuthContext, AffiliationContext
- **API service layer** with comprehensive SBC API integration
- **Subscription-based access control** with route protection

### Key Architectural Patterns

**Service Layer:**
- `SBCApiService` extends base `ApiService` class
- Comprehensive API wrapper covering user auth, products, payments, subscriptions
- Response handling through `handleApiResponse` utility
- Token-based authentication with automatic header injection

**Context Providers:**
- `AuthContext`: User authentication state, login/logout, profile management
- `AffiliationContext`: Referral code handling
- `TourProvider`: User onboarding tours

**Route Protection:**
- Subscription status checking with automatic redirects
- Unsubscribed users redirected to `/abonnement`
- Complex routing logic in `App.tsx` based on auth and subscription status
- **Advertisers need no pack (Rufus, 2026-11-13).** The advertiser pages
  (`/ads-network/annonceur`, `/onboarding`, `/nouvelle-campagne`, `/campagne/:id/modifier`)
  are under `RequireAuth`, still behind `AdsLaunchGate`; the hub `/ads-network` and the
  diffuseur pages stay paywalled. An account opened from `/signup?annonceur=1` (chat or
  `/signup/formulaire?annonceur=1`) registers with `signupIntent: 'annonceur'` (parrain
  optional) and `RequireSubscription` sends it, without a pack, to `/ads-network/annonceur`
  instead of `/abonnement` (`utils/annonceur.ts`). On those pages a non-member
  (`hooks/useIsMember`) gets no member header, back buttons that lead to
  `/ads-network/annonceur`, and « Se déconnecter » on the dashboard.
- **« Aide » (SBC Support) needs a login, not a pack.** `/aide/*` (`src/pages/help/`) sits
  under `RequireAuth`: a member whose account is not activated must be able to check a
  payment or write to an agent. Like the advertiser pages, a non-member gets no member
  header there and no floating « Se déconnecter ». API: support-service `/api/support/me/*`
  (contract: `server/docs/support/CONTRACT.md` §3.2); methods `support*` in `SBCApiService`.
- **Identity check, KYC level 3 (2026-11-22).** `/aide/identite?motif=fraud_hold|authenticator_reset|lost_access`
  (`&demande=<ticket>`; without a reason in the link the member picks one) and, without an account,
  `/signaler-un-probleme/identite/:id` (request key on this device). The recto, optional verso and a
  selfie are scaled to 1600 px JPEG on the phone (`pages/help/identity.ts`) and sent to support,
  which keeps them encrypted on the secondary server until 30 days after the agent's decision.
  - Linked from: a withdrawal refused with `RISK_HOLD` (Wallet + `UnifiedWithdrawalComponent`,
    `components/security/riskHold.ts`), the lost-phone note of `AuthenticatorCard`, « Changer mon
    email ou téléphone », and every open « Compte & accès » request chat.

### API Integration
- Base URL proxy: `/api` → `https://sniperbuisnesscenter.com/api`
- Token stored in localStorage with automatic header injection
- Comprehensive error handling with session expiration detection
- React Query for caching (`useApiCache` hook)

### State Management Patterns
- Context-based global state for auth and affiliation
- Local state for component-specific data
- React Query for server state caching
- localStorage for persistence (user data, tokens, preferences)

### File Upload Handling
- Multipart/form-data support in `SBCApiService`
- Avatar uploads with base64 fallback
- Product image uploads with form field mapping

## Key Directories

**`src/pages/`** - Main application pages with complex business logic
**`src/components/common/`** - Reusable UI components (Header, NavigationBar, etc.)
**`src/contexts/`** - React contexts for global state management
**`src/services/`** - API service layer and response handling
**`src/hooks/`** - Custom hooks including API caching
**`src/utils/`** - Utility functions for API helpers, debouncing, etc.

## Important Development Notes

### API Testing
The codebase includes `ApiTestComponent` and `LoginDebugComponent` for API endpoint testing during development.

### Unit / page tests (Vitest)
`npm test` runs Vitest + Testing Library (jsdom); CI runs it after the build. Helpers in
`src/test/api.tsx` (`ok()`, `fail()`, `renderPage()` = QueryClient + MemoryRouter). Gotchas:
- `@testing-library/dom` must stay an explicit devDependency — CI installs with
  `--legacy-peer-deps`, which skips peer deps, and every suite then fails to load.
- The matchMedia shim in `src/test/setup.ts` reports reduced motion so motion's animated
  counters settle instantly. motion queries `(prefers-reduced-motion)` without `: reduce`,
  so match on the prefix or counters read 0.
- Animated content (wizard steps, sheets) mounts after a frame: use `findBy*`, not `getBy*`.
- Test files are excluded in `tsconfig.app.json` so `tsc -b` doesn't type-check them against
  the app config.
- Rendering the whole `App` (`src/App.test.tsx`): App clears the query cache when the user
  changes, so a mocked `useAuth` that has the user *and* `loading: false` on the first render
  cancels the pages' first queries (blank page). Render with `loading: true`, then rerender
  with `false`, as AuthProvider does. Mock `AuthContext` whole, not with `importOriginal`:
  it and `useAdsRoles` import each other.

### New deploys reach open apps (2026-11-23)
An installed app can stay open for days, so it kept running old screens after a deploy (on
preprod an old MoMo screen still asked for an e-mailed code after the server retired it).
`utils/appUpdate.ts`: each build writes `/version.json` (vite.config.ts, same id as
`__APP_BUILD__`); the app checks it on return to the foreground and every 15 min, and loads the
new build only at a safe moment: a page change without `location.state`, a return after ≥ 15 min
away, or at once on a 410 `APP_UPDATE_REQUIRED` (ApiService; once per build per minute). Never
reload mid-form: Rufus complained of pages "refreshing by themselves".

### Withdrawals with the authenticator app
With the app set up (`confirmWith: 'authenticator'` in the initiate answer), nothing is e-mailed.
`/otp` checks it (state `confirmWith`, else `getAuthenticatorStatus`) and shows
`components/security/WithdrawalAppCodeForm` instead of the e-mail boxes: the Wallet form and the
history's « Continuer la vérification OTP » land there too.

### Personal data (APDP, Benin) — November 2026
SBC's processing is authorised by Benin's APDP (Délibération n° 2026-523/AT/APDP/DST/SC du
27 août 2026) on conditions the app must keep meeting:
- **Consent — Benin members only** (Rufus, 2026-11-08; `isBenin` in `utils/privacy.ts`).
  Sign-up (chat and `/signup/formulaire`) always requires the terms + privacy box; the
  hosting-outside-Benin box is shown and required only when the country is Benin, and
  `consents.dataTransfer` is true only then. Existing Benin members get a blocking window
  (`components/privacy/PrivacyNotices.tsx`) until `user.consents` matches
  `PRIVACY_POLICY_VERSION`. Bumping that constant (with the backend's) asks them again. The window never covers the legal pages, sign-up, `/otp`, SSO, `/p/*`
  or `/mes-donnees` (a member who refuses must be able to delete the account).
- **Legal texts.** `/confidentialite` and `/mentions-legales` name the controller, the APDP
  reference and the hosts (Contabo, Cloudflare R2). Change them when a processor changes.
  Link the CGU with `components/common/TermsLink`: the official PDF from the settings
  (`termsAndConditionsPdf`, uploaded by Rufus) when there is one, else `/conditions`.
- **Rights.** `/mes-donnees`: data export, contact-file switch (`shareContactInfo`),
  account deletion with password. Reachable without a subscription.
- **Device storage.** No analytics or ad cookies, ever. The cookie notice comes back 60 days
  after dismissal; `sweepExpiredStorage()` (main.tsx) wipes localStorage, except the token,
  every 60 days; logout removes `PERSONAL_STORAGE_KEYS`. Never store a password, and add any
  new personal localStorage key to that list.

### Internationalization
Uses i18next with browser language detection and HTTP backend for translations.

### Styling
- Tailwind CSS v4 with Vite plugin
- Framer Motion for animations
- Responsive design with mobile-first approach

### Build Configuration
- TypeScript strict mode enabled
- ESLint with React hooks and refresh plugins
- Legacy peer deps flag required for npm install

## Git Workflow (CRITICAL — Must Follow)

This project uses **GitFlow**. All Claude Code sessions MUST follow these rules:

### Branches
- `main` — production. **NEVER push directly to main.**
- `develop` — preprod/staging. **NEVER push directly to develop.**
- `feature/*` — for new work (branch from `develop`)
- `hotfix/*` — for urgent prod fixes (branch from `main`)

### Rules
1. **NEVER commit or push directly to `main` or `develop`.** Always use a feature branch and Pull Request.
2. **Before starting any work**, check which branch you're on with `git branch`. If on `main` or `develop`, create a feature branch first:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/description-of-work
   ```
3. **When work is done**, commit and push the feature branch:
   ```bash
   git add <specific-files>
   git commit -m "descriptive message"
   git push -u origin feature/description-of-work
   ```
   Then inform the user to create a PR to `develop` on GitHub.
4. **NEVER merge branches locally.** All merges happen via Pull Requests on GitHub using `gh` CLI:
   ```bash
   # Create a PR to develop
   gh pr create --base develop --title "feat: description" --body "Summary of changes"
   
   # Merge a PR (after CI passes)
   gh pr merge <PR-number> --merge --delete-branch
   
   # List open PRs
   gh pr list
   
   # View PR status/checks
   gh pr checks <PR-number>
   ```
5. **Hotfixes** (urgent prod bugs) branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/description-of-fix
   ```

### When to Use Feature Branches vs Direct Commits
- **Feature branches + PRs**: Required for code changes that affect app behavior (features, bug fixes, refactors)
- **Batch non-code changes**: Documentation, README updates, config tweaks, and other changes that don't affect the running app should NOT get their own feature branch. Instead:
  - Commit them locally on `develop`
  - Push them together with the next real code change, OR
  - Push them when several non-code changes have accumulated
- This avoids wasting time and tokens on CI/PR cycles for trivial changes.

### CI/CD Pipeline
- PRs to `develop` or `main` trigger CI checks (build)
- Merging to `develop` → auto-deploys to **preprod** (`preprod.sniperbuisnesscenter.com`)
- Merging to `main` → deploys to **production** (requires approval)

### Environments
- **Production**: `sniperbuisnesscenter.com` (API: `sniperbuisnesscenter.com/api`)
- **Preprod**: `preprod.sniperbuisnesscenter.com` (API: `preprod.sniperbuisnesscenter.com/api`)