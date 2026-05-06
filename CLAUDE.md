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