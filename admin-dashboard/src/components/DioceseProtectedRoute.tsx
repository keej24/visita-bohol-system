/**
 * =============================================================================
 * DIOCESE PROTECTED ROUTE - Diocese-Specific Access Control
 * =============================================================================
 *
 * PURPOSE:
 * This is an ENHANCED version of ProtectedRoute that adds diocese-level
 * access control. It ensures users can only access data from their own diocese.
 *
 * WHY NEEDED:
 * The VISITA system manages TWO dioceses: Tagbilaran and Talibon.
 * - Tagbilaran Chancery should only access Tagbilaran churches
 * - Talibon Chancery should only access Talibon churches
 * - Cross-diocese access would be a data leak!
 *
 * EXAMPLE SCENARIO:
 * User: Chancery Office from Tagbilaran
 * Tries to visit: /diocese/talibon
 * Result: BLOCKED → Redirected to /unauthorized
 *
 * HOW IT DIFFERS FROM ProtectedRoute:
 * ┌─────────────────────┬──────────────────────┬────────────────────────────┐
 * │ Check               │ ProtectedRoute       │ DioceseProtectedRoute      │
 * ├─────────────────────┼──────────────────────┼────────────────────────────┤
 * │ Is user logged in?  │ ✓                    │ ✓                          │
 * │ Has correct role?   │ ✓                    │ ✓                          │
 * │ Has correct diocese?│ ✗                    │ ✓ (NEW!)                   │
 * └─────────────────────┴──────────────────────┴────────────────────────────┘
 *
 * USAGE:
 * <DioceseProtectedRoute
 *   allowedRoles={['chancery_office']}    // Role check
 *   requiredDiocese="tagbilaran"          // Diocese check
 * >
 *   <TagbilaranDashboard />
 * </DioceseProtectedRoute>
 *
 * FLOW:
 * 1. Check if auth is loading → Show spinner
 * 2. Check if user is logged in → Redirect to /login if not
 * 3. Check if user has required role → Redirect to /unauthorized if not
 * 4. Check if user belongs to required diocese → Redirect to /unauthorized if not
 * 5. All checks pass → Show the protected content
 *
 * RELATED FILES:
 * - ProtectedRoute.tsx: Basic auth + role protection (parent concept)
 * - AuthContext.tsx: Provides hasAccess() function for diocese checking
 * - App.tsx: Uses this for /diocese/tagbilaran and /diocese/talibon routes
 */

// Diocese-specific protected route component
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole, Diocese } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Props for DioceseProtectedRoute
 *
 * @param children - The protected page content
 * @param allowedRoles - Roles that can access (e.g., ['chancery_office'])
 * @param requiredDiocese - Diocese the user must belong to (e.g., 'tagbilaran')
 * @param requireAuth - Whether login is required (default: true)
 */
interface DioceseProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredDiocese?: Diocese;
  requireAuth?: boolean;
}

/**
 * DioceseProtectedRoute Component
 *
 * Performs THREE levels of access control:
 * 1. Authentication (is user logged in?)
 * 2. Authorization (does user have correct role?)
 * 3. Diocese Access (does user belong to this diocese?)
 */
export const DioceseProtectedRoute = ({ 
  children, 
  allowedRoles, 
  requiredDiocese,
  requireAuth = true 
}: DioceseProtectedRouteProps) => {
  // Get auth state and hasAccess helper from context
  const { user, userProfile, loading, hasAccess } = useAuth();

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Wait for auth state to load
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingSpinner />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Check authentication (is user logged in?)
  // ─────────────────────────────────────────────────────────────────────────
  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Check role authorization
  // Example: allowedRoles = ['chancery_office'], user.role = 'parish'
  // Result: Redirect to /unauthorized
  // ─────────────────────────────────────────────────────────────────────────
  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Check diocese access (NEW - specific to this component!)
  // Uses hasAccess() from AuthContext to verify diocese membership
  // Example: requiredDiocese = 'tagbilaran', user.diocese = 'talibon'
  // Result: Redirect to /unauthorized
  // ─────────────────────────────────────────────────────────────────────────
  if (requiredDiocese && !hasAccess(requiredDiocese)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: All checks passed! Render the protected content
  // ─────────────────────────────────────────────────────────────────────────
  return <>{children}</>;
};

/**
 * DEBUGGING TIPS:
 * ───────────────
 *
 * If user is incorrectly blocked:
 * 1. Check userProfile.diocese in browser DevTools
 * 2. Verify hasAccess() implementation in AuthContext.tsx
 * 3. Confirm Firestore 'users' document has correct diocese field
 *
 * If user can access wrong diocese:
 * 1. Ensure requiredDiocese prop is set correctly in App.tsx
 * 2. Check that hasAccess() is comparing diocese values correctly
 * 3. Verify Firebase security rules also enforce diocese filtering
 */

