import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Show loading spinner while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#115CF6]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If the user just hit "log out" we want to drop them on /connexion
    // immediately, not bounce them through the onboarding splash.
    if (sessionStorage.getItem('justLoggedOut')) {
      sessionStorage.removeItem('justLoggedOut');
      return <Navigate to="/connexion" replace />;
    }
    // First-time / returning unauthenticated visitors see the onboarding.
    return <Navigate to="/splash-screen" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
