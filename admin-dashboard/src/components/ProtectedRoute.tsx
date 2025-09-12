// Protected route component for role-based access
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requireAuth = true 
}: ProtectedRouteProps) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
