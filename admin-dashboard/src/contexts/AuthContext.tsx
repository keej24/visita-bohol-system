// Authentication context for role-based access control
import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('AuthContext - Auth state changed:', user ? user.email : 'No user');
      setUser(user);
      
      if (user) {
        try {
          console.log('AuthContext - Fetching profile for UID:', user.uid);
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            console.log('AuthContext - Profile data:', data);
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
            console.log('AuthContext - Profile set successfully');
          } else {
            console.error('AuthContext - No profile document found for UID:', user.uid);
            setUserProfile(null);
          }
        } catch (error) {
          console.error('AuthContext - Error fetching user profile:', error);
          console.error('AuthContext - This is likely a Firestore permissions issue');
          setUserProfile(null);
        }
      } else {
        console.log('AuthContext - No user, clearing profile');
        setUserProfile(null);
      }
      
      setLoading(false);
      console.log('AuthContext - Loading complete');
    });

    return unsubscribe;
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
