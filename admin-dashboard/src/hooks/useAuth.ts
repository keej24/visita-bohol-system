import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

// Re-export types from AuthContext for convenience
export type { Diocese, UserRole } from '@/contexts/AuthContext';

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
