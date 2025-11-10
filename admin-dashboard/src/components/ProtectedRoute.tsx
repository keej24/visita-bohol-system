// Protected route component for role-based access
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PasswordChangeModal } from '@/components/PasswordChangeModal';

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
  const location = useLocation();
  const [passwordChanged, setPasswordChanged] = useState(false);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check if user needs to change password (except on login page)
  if (user && userProfile && userProfile.requirePasswordChange && !passwordChanged && location.pathname !== '/login') {
    return (
      <>
        {/* Render children in background (blurred) */}
        <div className="blur-sm pointer-events-none">
          {children}
        </div>
        {/* Show password change modal */}
        <PasswordChangeModal
          isOpen={true}
          userEmail={user.email || ''}
          userId={user.uid}
          onPasswordChanged={() => {
            setPasswordChanged(true);
            // Force a page reload to refresh the user profile
            window.location.reload();
          }}
        />
      </>
    );
  }

  return <>{children}</>;
};

