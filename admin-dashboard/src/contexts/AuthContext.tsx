/**
 * FILE PURPOSE: Authentication Context and Role-Based Access Control
 *
 * This file implements the authentication system for the VISITA admin dashboard,
 * managing user sessions and role-based permissions for different user types.
 *
 * KEY RESPONSIBILITIES:
 * - Manage user authentication state (logged in/out)
 * - Load and cache user profile data from Firestore
 * - Provide role-based access control functions
 * - Handle login/logout operations
 * - Manage diocese and parish-level access permissions
 *
 * INTEGRATION POINTS:
 * - Uses Firebase Authentication for login sessions
 * - Reads user profiles from Firestore 'users' collection
 * - Provides context to entire app via React Context API
 * - Works with preconfigured accounts for Chancery/Museum users
 *
 * TECHNICAL CONCEPTS:
 * - React Context API: Provides global state without prop drilling
 * - Context Provider Pattern: Wraps app to give all components access to auth
 * - Firebase Authentication: Manages user sessions and tokens
 * - Role-Based Access Control (RBAC): Different permissions per user role
 * - TypeScript Interfaces: Strong typing for user data and roles
 *
 * USER ROLES IN VISITA:
 * 1. chancery_office: Diocese administrators (Tagbilaran or Talibon)
 *    - Full control over their diocese
 *    - Can create parish accounts
 *    - Review and approve submissions
 *
 * 2. museum_researcher: National Museum researchers
 *    - Review heritage churches (ICP/NCT)
 *    - Upload heritage declarations
 *    - Cross-diocese read access
 *
 * 3. parish_secretary: Parish staff
 *    - Manage their own church profile
 *    - Create announcements
 *    - Limited to their parish only
 *
 * WHY IMPORTANT:
 * - Security: Prevents unauthorized access to sensitive operations
 * - Data Integrity: Ensures users only modify their own data
 * - Workflow Management: Routes submissions to correct reviewers
 * - Audit Trail: Tracks who made what changes
 */

// React Context API for global authentication state
import { createContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getKnownAccountProfile, isPreconfiguredAccount } from '@/lib/auth-utils';

/**
 * Type Definitions for User Roles and Profile
 *
 * These TypeScript types ensure type safety throughout the authentication system.
 */

// Three distinct user roles in the VISITA system
export type UserRole = 'chancery_office' | 'museum_researcher' | 'parish_secretary';

// Two dioceses in Bohol province
export type Diocese = 'tagbilaran' | 'talibon';

/**
 * User Profile Interface
 *
 * Represents the complete user profile stored in Firestore.
 * This is the authoritative source of user information and permissions.
 *
 * Fields explained:
 * - uid: Firebase Authentication user ID (unique identifier)
 * - email: User's email address (used for login)
 * - role: Determines what actions user can perform
 * - name: Full name for display purposes
 * - diocese: Which diocese the user belongs to (access control)
 * - parish: Specific parish (only for parish_secretary role)
 * - createdAt: Account creation timestamp (audit trail)
 * - lastLoginAt: Last successful login (security monitoring)
 */
export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  diocese: Diocese;
  status?: 'active' | 'inactive' | 'pending';  // Account status
  
  // NEW: Unique parish identifier (replaces parish name)
  parishId?: string;  // e.g., "tagbilaran_alburquerque_san_isidro_labrador_parish"
  
  // NEW: Structured parish information
  parishInfo?: {
    name: string;        // e.g., "San Isidro Labrador Parish"
    municipality: string; // e.g., "Alburquerque"
    fullName: string;    // e.g., "San Isidro Labrador Parish, Alburquerque"
  };
  
  // DEPRECATED: Legacy field for backward compatibility
  parish?: string;  // Will be migrated to parishId
  
  // Contact information
  phoneNumber?: string;  // Parish contact number (editable in account settings)
  
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Authentication Context Interface
 *
 * Defines all authentication-related data and functions available to components.
 * Components access these via the useAuth() hook.
 *
 * Properties:
 * - user: Firebase auth user object (null if logged out)
 * - userProfile: Full profile from Firestore (null if no profile found)
 * - loading: True while checking auth state or loading profile
 *
 * Methods:
 * - login: Authenticate user with email/password
 * - logout: Sign out and clear session
 * - hasRole: Check if user has specific role
 * - hasAnyRole: Check if user has any role from a list
 * - hasAccess: Verify permission for specific diocese/parish
 * - isChanceryAdmin: Quick check if user is chancery office
 * - isDioceseAdmin: Check if user is admin of specific diocese
 */
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileCreating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  hasAccess: (targetDiocese?: Diocese, targetParish?: string) => boolean;
  isChanceryAdmin: () => boolean;
  isDioceseAdmin: (diocese: Diocese) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Export AuthContext for use in custom hooks
export { AuthContext };

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCreating, setProfileCreating] = useState(false);

  /**
   * =============================================================================
   * AUTHENTICATION STATE LISTENER
   * =============================================================================
   *
   * This useEffect sets up a listener for Firebase auth state changes.
   *
   * WHY IMPORTANT:
   * - Automatically detects login/logout
   * - Loads user profile when user logs in
   * - Handles page refreshes (maintains session)
   * - Cleans up properly on component unmount
   *
   * HOW IT WORKS:
   * 1. Firebase triggers callback when auth state changes
   * 2. If user logged in: fetch profile from Firestore
   * 3. If user logged out: clear profile state
   * 4. Implements retry logic for network errors
   * 5. Uses mounted flag to prevent state updates after unmount
   *
   * TECHNICAL CONCEPTS:
   * - Firebase Auth Persistence: Maintains session across page refreshes
   * - Async/Await: Handle asynchronous Firestore queries
   * - Error Handling: Retry failed requests with exponential backoff
   * - Memory Leak Prevention: Cleanup function prevents updates to unmounted components
   */
  useEffect(() => {
    let mounted = true;  // Track if component is still mounted

    /**
     * Fetch User Profile from Firestore
     *
     * Retrieves full user profile data and handles edge cases:
     * - Profile exists: Load and set state
     * - Profile missing but known account: Create profile automatically
     * - Network error: Retry with exponential backoff
     * - Unknown account: Clear profile state
     */
    const fetchUserProfile = async (user: User, retryCount = 0): Promise<void> => {
      if (!mounted) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!mounted) return;

        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // Check if account is inactive
          if (data.status === 'inactive') {
            console.warn('[AuthContext] Account is inactive:', user.email);
            await signOut(auth);
            setUserProfile(null);
            setLoading(false);
            throw new Error('Your account has been deactivated. Please contact the administrator.');
          }
          
          setUserProfile({
            uid: user.uid,
            email: user.email!,
            role: data.role,
            name: data.name,
            diocese: data.diocese,
            status: data.status || 'active',  // Default to active for legacy accounts
            
            // NEW: Support new parish ID structure
            parishId: data.parishId,
            parishInfo: data.parishInfo,
            
            // DEPRECATED: Maintain backward compatibility
            // If parishId doesn't exist, use old parish field
            parish: data.parishId || data.parish,
            
            // Contact information
            phoneNumber: data.phoneNumber,
            
            createdAt: data.createdAt?.toDate(),
            lastLoginAt: new Date(),
          });
          // Set loading to false only after successful profile fetch
          setLoading(false);
        } else {
          // User profile not found - try to create one for known accounts
          const profileData = getKnownAccountProfile(user.email!);
          if (profileData) {
            console.log('[AuthContext] Profile not found, creating profile for known account:', user.email);
            setProfileCreating(true);
            try {
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email!,
                ...profileData,
                status: 'active',  // New accounts are active by default
                createdAt: new Date(),
              });

              console.log('[AuthContext] Profile created successfully, fetching profile data...');
              // Retry fetching the profile
              setProfileCreating(false);
              await fetchUserProfile(user, 0);
              return;
            } catch (createError) {
              console.error('[AuthContext] Error creating profile for known account:', createError);
              console.error('[AuthContext] Error details:', {
                code: (createError as { code?: string })?.code,
                message: (createError as { message?: string })?.message,
                email: user.email
              });
              setProfileCreating(false);
            }
          } else {
            console.warn('[AuthContext] User authenticated but not a known account:', user.email);
          }

          setUserProfile(null);
          setLoading(false);
        }
      } catch (error) {
        if (!mounted) return;

        console.error('[AuthContext] Error fetching profile, attempt', retryCount + 1, ':', error);

        // Retry up to 3 times with increasing delays for network issues
        if (retryCount < 2) {
          const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s
          console.log(`[AuthContext] Retrying in ${delay}ms...`);
          setTimeout(() => {
            if (mounted) {
              fetchUserProfile(user, retryCount + 1);
            }
          }, delay);
        } else {
          // After all retries, silently fail and let the app handle no profile state
          console.error('[AuthContext] All retry attempts failed for user:', user.email);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      setUser(user);

      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserProfile({
          uid: user.uid,
          email: user.email!,
          role: data.role,
          name: data.name,
          diocese: data.diocese,
          status: data.status || 'active',
          parishId: data.parishId,
          parishInfo: data.parishInfo,
          parish: data.parishId || data.parish,
          phoneNumber: data.phoneNumber,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate?.() || new Date()
        });
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return userProfile ? roles.includes(userProfile.role) : false;
  };

  /**
   * ACCESS CONTROL FUNCTION
   *
   * Determines if current user has permission to access specific resources.
   *
   * PERMISSION RULES:
   *
   * Chancery Office:
   * - Can only access their own diocese
   * - Diocese of Tagbilaran cannot modify Talibon churches
   * - Full admin rights within their diocese
   *
   * Parish Secretary:
   * - Can only access their assigned parish
   * - Cannot view or modify other parishes
   * - Limited to their diocese
   *
   * Museum Researcher:
   * - Read access across all dioceses
   * - Can review any heritage church
   * - Special permissions for heritage validation
   *
   * USAGE EXAMPLES:
   * - hasAccess('tagbilaran') - Can user access Tagbilaran diocese?
   * - hasAccess('talibon', 'Sacred Heart Parish') - Can user access this specific parish?
   * - hasAccess() - Does user have any access? (always true if logged in)
   */
  const hasAccess = (targetDiocese?: Diocese, targetParish?: string): boolean => {
    if (!userProfile) return false;

    // Chancery office users can only access their own diocese
    if (userProfile.role === 'chancery_office') {
      return targetDiocese ? userProfile.diocese === targetDiocese : true;
    }

    // Parish secretaries can only access their own parish
    if (userProfile.role === 'parish_secretary') {
      if (targetParish) {
        return userProfile.parish === targetParish;
      }
      if (targetDiocese) {
        return userProfile.diocese === targetDiocese;
      }
      return true;
    }

    // Museum researchers have read access across both dioceses
    if (userProfile.role === 'museum_researcher') {
      return true;
    }

    return false;
  };

  const isChanceryAdmin = (): boolean => {
    return userProfile?.role === 'chancery_office';
  };

  const isDioceseAdmin = (diocese: Diocese): boolean => {
    return userProfile?.role === 'chancery_office' && userProfile?.diocese === diocese;
  };

  const value = {
    user,
    userProfile,
    loading,
    profileCreating,
    login,
    logout,
    refreshUserProfile,
    hasRole,
    hasAnyRole,
    hasAccess,
    isChanceryAdmin,
    isDioceseAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Note: useAuth hook is exported from @/hooks/useAuth
// For backwards compatibility, import it here
import { useAuth } from '@/hooks/useAuth';
export { useAuth };
