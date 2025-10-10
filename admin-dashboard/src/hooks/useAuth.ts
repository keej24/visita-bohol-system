import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

// Re-export types from AuthContext for convenience
export type { UserRole, Diocese, UserProfile } from '@/contexts/AuthContext';

/**
 * Custom hook to access authentication context
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
