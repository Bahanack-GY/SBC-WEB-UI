import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// How long after a logout we still treat the user as "just logged out"
// and send them to /connexion instead of the splash. Beyond this window,
// any unauthenticated visit (cold open, refresh) goes to /splash-screen.
const RECENT_LOGOUT_WINDOW_MS = 2000;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#115CF6]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const loggedOutAt = parseInt(sessionStorage.getItem('justLoggedOutAt') || '0', 10);
    const isRecentLogout = loggedOutAt && Date.now() - loggedOutAt < RECENT_LOGOUT_WINDOW_MS;

    if (isRecentLogout) {
      // The user just hit "log out" — drop them on /connexion immediately.
      return <Navigate to="/connexion" replace />;
    }

    // First-time visitor, returning visitor, or anyone reopening the app
    // while logged out — show the onboarding splash every time.
    return <Navigate to="/splash-screen" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
