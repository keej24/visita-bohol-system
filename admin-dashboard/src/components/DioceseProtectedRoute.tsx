// Diocese-specific protected route component
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole, Diocese } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface DioceseProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredDiocese?: Diocese;
  requireAuth?: boolean;
}

export const DioceseProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requiredDiocese,
  requireAuth = true 
}: DioceseProtectedRouteProps) => {
  const { user, userProfile, loading, hasAccess } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check diocese access
  if (requiredDiocese && !hasAccess(requiredDiocese)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
