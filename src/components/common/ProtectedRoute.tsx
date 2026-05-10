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
    // Show the onboarding splash only to users who have never explicitly
    // moved past it. Once they hit a CTA on the splash (or log out from
    // an authenticated session) we send them straight to /connexion.
    const splashViewed = localStorage.getItem('splashViewed') === 'true';
    if (splashViewed) {
      return <Navigate to="/connexion" replace />;
    }
    return <Navigate to="/splash-screen" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
