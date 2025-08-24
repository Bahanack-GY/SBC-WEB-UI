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