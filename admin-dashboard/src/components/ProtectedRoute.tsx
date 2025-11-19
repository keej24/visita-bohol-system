/**
 * =============================================================================
 * PROTECTED ROUTE - Authentication & Authorization Guard
 * =============================================================================
 * 
 * PURPOSE:
 * This component acts as a "security gate" for pages that require login
 * or specific user roles. It wraps page components and checks permissions
 * BEFORE allowing users to see the page.
 * 
 * REAL-WORLD ANALOGY:
 * Think of this as a bouncer at a club:
 * - Checks your ID (are you logged in?)
 * - Checks your VIP status (do you have the right role?)
 * - Lets you in if OK, redirects you if not
 * 
 * HOW IT WORKS:
 * 1. You try to visit a protected page (e.g., /parish)
 * 2. ProtectedRoute checks: Are you logged in?
 * 3. If not → Redirect to /login
 * 4. If yes → Check: Do you have the required role?
 * 5. If no → Redirect to /unauthorized
 * 6. If yes → Show the page!
 * 
 * USAGE EXAMPLES:
 * 
 * Example 1: Any authenticated user
 * <ProtectedRoute>
 *   <ChurchesPage />
 * </ProtectedRoute>
 * 
 * Example 2: Only Chancery Office
 * <ProtectedRoute allowedRoles={['chancery_office']}>
 *   <UserManagementPage />
 * </ProtectedRoute>
 * 
 * Example 3: Chancery or Museum Researcher
 * <ProtectedRoute allowedRoles={['chancery_office', 'museum_researcher']}>
 *   <ReportsPage />
 * </ProtectedRoute>
 * 
 * IMPORTANT CONCEPTS:
 * - Authorization: What you can access (role-based)
 * - Authentication: Proving who you are (logged in)
 * - Navigate: React Router's redirect component
 * - Loading State: Shows spinner while checking auth status
 * - Replace: Replaces history entry (can't press back to protected page)
 * 
 * WHERE USED:
 * - App.tsx: Wraps almost every route
 * - Protects sensitive pages like reports, user management, feedback
 * 
 * RELATED FILES:
 * - DioceseProtectedRoute.tsx: Additional diocese filtering
 * - AuthContext.tsx: Provides user and userProfile data
 * - useAuth.ts: Hook that accesses auth context
 */

import { Navigate } from 'react-router-dom';  // For redirecting
import { useAuth, UserRole } from '@/hooks/useAuth';  // Access auth state
import { LoadingSpinner } from '@/components/ui/loading-spinner';  // Loading UI

/**
 * Props for ProtectedRoute Component
 * 
 * children: The page/component to protect
 * allowedRoles: Array of roles that can access this route
 * requireAuth: Whether user must be logged in (default: true)
 */
interface ProtectedRouteProps {
  children: React.ReactNode;  // The protected content
  allowedRoles?: UserRole[];  // Optional: specific roles required
  requireAuth?: boolean;      // Optional: default true
}

/**
 * ProtectedRoute Component
 * 
 * FLOW DIAGRAM:
 * 
 * User visits route
 *        ↓
 * Check: Is auth loading?
 *        ↓ YES → Show spinner
 *        ↓ NO
 * Check: Is user logged in?
 *        ↓ NO → Redirect to /login
 *        ↓ YES
 * Check: Are there role restrictions?
 *        ↓ NO → Show page
 *        ↓ YES
 * Check: Does user have required role?
 *        ↓ NO → Redirect to /unauthorized
 *        ↓ YES
 * Show page!
 */
export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireAuth = true
}: ProtectedRouteProps) => {
  // Get authentication state from context
  const { user, userProfile, loading } = useAuth();

  // STEP 1: Wait for auth to finish loading
  // While Firebase checks if user is logged in, show spinner
  if (loading) {
    return <LoadingSpinner />;
  }

  // STEP 2: Check if authentication is required and user is logged in
  // If page requires login (requireAuth=true) and no user exists → redirect to login
  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  // STEP 2.5: Check if user account is inactive
  // Even if logged in, inactive accounts should be logged out
  if (userProfile && userProfile.status === 'inactive') {
    // This will trigger the auth state listener to log them out
    return <Navigate to="/login" state={{ message: 'Your account has been deactivated. Please contact the administrator.' }} replace />;
  }

  // STEP 3: Check role-based authorization
  // If specific roles are required, check if user's role matches
  // Example: allowedRoles = ['chancery_office'] but user is 'parish_secretary'
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // STEP 4: All checks passed! Show the protected content
  return <>{children}</>;
};

/**
 * DEBUGGING TIPS:
 * ---------------
 * 
 * If redirected to /login:
 * - Check if you're logged in (Firebase Auth session)
 * - Check AuthContext.tsx for auth state loading logic
 * 
 * If redirected to /unauthorized:
 * - Check your user role in Firestore (users collection)
 * - Check allowedRoles array in App.tsx route definition
 * - Verify userProfile.role matches one of the allowed roles
 * 
 * If stuck on loading spinner:
 * - Check Firebase initialization in firebase.ts
 * - Check browser console for Firebase errors
 * - Verify .env variables are set correctly
 */

