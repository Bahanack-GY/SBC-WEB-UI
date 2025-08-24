# Project Overview

This is a modern web application for the Sniper Business Center (SBC) platform, built with React, TypeScript, and Vite. This app provides a seamless experience for users to manage their business activities, subscriptions, referrals, and marketplace interactions.

**Key Technologies:**

*   **React** + **TypeScript**
*   **Vite** (for fast development and HMR)
*   **Tailwind CSS** (utility-first styling)
*   **Framer Motion** (animations)
*   **React Icons** (iconography)
*   **React Query** (for data fetching and caching)
*   **React Router** (for routing)
*   **i18next** (for internationalization)

**Architecture:**

The project follows a standard React project structure.

*   `src/pages/`: Main app pages (Marketplace, Profile, Abonnement, MesFilleuls, etc.)
*   `src/components/`: Reusable UI components (cards, buttons, skeletons, etc.)
*   `src/assets/`: Images and icons
*   `src/services/`: API service for interacting with the backend.
*   `src/contexts/`: React contexts for managing global state (e.g., authentication, affiliation).
*   `src/hooks/`: Custom React hooks.
*   `src/utils/`: Utility functions.

# Building and Running

**1. Install dependencies:**

```bash
npm install
```

**2. Start the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

**3. Build for production:**

```bash
npm run build
```

The production-ready files will be generated in the `dist/` directory.

**4. Linting:**

```bash
npm run lint
```

This command will check the code for any linting errors.

# Development Conventions

*   **Styling:** The project uses Tailwind CSS for styling. Utility classes should be used whenever possible.
*   **State Management:** Global state is managed using React Context. For server state, React Query is used.
*   **API Interaction:** All API interactions are handled by the `SBCApiService` located in `src/services/SBCApiService.ts`.
*   **Routing:** Routing is handled by React Router. All routes are defined in `src/App.tsx`.
*   **Components:** Components should be small and reusable. Common components are located in `src/components/common/`.
*   **Types:** TypeScript types are used throughout the project. API response types are defined in `src/types/api.ts`.
