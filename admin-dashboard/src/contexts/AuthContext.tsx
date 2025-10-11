// Authentication context for role-based access control
import { createContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, DocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getKnownAccountProfile, isPreconfiguredAccount } from '@/lib/auth-utils';

export type UserRole = 'chancery_office' | 'museum_researcher' | 'parish_secretary';
export type Diocese = 'tagbilaran' | 'talibon';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  diocese: Diocese;
  parish?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  useEffect(() => {
    let mounted = true;

    const fetchUserProfile = async (user: User, retryCount = 0): Promise<void> => {
      if (!mounted) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!mounted) return;

        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            uid: user.uid,
            email: user.email!,
            role: data.role,
            name: data.name,
            diocese: data.diocese,
            parish: data.parish,
            createdAt: data.createdAt?.toDate(),
            lastLoginAt: new Date(),
          });
          // Set loading to false only after successful profile fetch
          setLoading(false);
        } else {
          // User profile not found - try to create one for known accounts
          const profileData = getKnownAccountProfile(user.email!);
          if (profileData) {
            try {
              await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email!,
                ...profileData,
                createdAt: new Date(),
              });

              // Retry fetching the profile
              await fetchUserProfile(user, 0);
              return;
            } catch (createError) {
              console.error('Error creating profile for known account:', createError);
            }
          }

          setUserProfile(null);
          setLoading(false);
        }
      } catch (error) {
        if (!mounted) return;

        // Retry up to 3 times with increasing delays for network issues
        if (retryCount < 2) {
          const delay = (retryCount + 1) * 1000; // 1s, 2s, 3s
          setTimeout(() => {
            if (mounted) {
              fetchUserProfile(user, retryCount + 1);
            }
          }, delay);
        } else {
          // After all retries, silently fail and let the app handle no profile state
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

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return userProfile ? roles.includes(userProfile.role) : false;
  };

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
    login,
    logout,
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
