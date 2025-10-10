import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { useAppStore, StoreUtils, User } from '@/lib/state/app-store';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDashboard } from '@/lib/data-management/realtime';
import { cacheUtils } from '@/lib/data-management/queryClient';

// App State Context
interface AppStateContextValue {
  queryClient: QueryClient;
  isReady: boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// Provider Props
interface AppStateProviderProps {
  children: ReactNode;
  queryClient: QueryClient;
}

// Main App State Provider
export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
  queryClient,
}) => {
  const { user: authUser, userProfile, loading: authLoading } = useAuth();
  const { setUser, updateSettings, user: storeUser } = useAppStore();
  const [isReady, setIsReady] = React.useState(false);

  // Sync auth user with store
  useEffect(() => {
    if (authUser && userProfile && (!storeUser || storeUser.uid !== authUser.uid)) {
      const userData: User = {
        uid: authUser.uid,
        email: authUser.email || '',
        displayName: authUser.displayName || userProfile.name,
        role: userProfile.role,
        diocese: userProfile.diocese,
        permissions: [], // Default empty permissions array
        isActive: true,
        lastLogin: new Date(),
        preferences: storeUser?.preferences || {
          theme: 'system',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
          dashboard: {
            autoRefresh: true,
            refreshInterval: 30000,
            defaultView: 'table',
            itemsPerPage: 20,
          },
          accessibility: {
            highContrast: false,
            largeText: false,
            reduceMotion: false,
          },
        },
      };
      setUser(userData);
    } else if (!authUser && storeUser) {
      setUser(null);
    }
  }, [authUser, userProfile, storeUser, setUser]);

  // Set up online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      updateSettings({ isOnline: true, lastSync: new Date() });
      StoreUtils.showSuccessNotification('Connection Restored', 'You are back online');
    };

    const handleOffline = () => {
      updateSettings({ isOnline: false });
      StoreUtils.showErrorNotification('Connection Lost', 'You are currently offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateSettings]);

  // Initialize app when auth is ready
  useEffect(() => {
    if (!authLoading) {
      setIsReady(true);
    }
  }, [authLoading]);

  // Apply theme on mount and when it changes
  useEffect(() => {
    if (storeUser?.preferences?.theme) {
      StoreUtils.applyTheme(storeUser.preferences.theme);
    }
  }, [storeUser?.preferences?.theme]);

  // Listen to system theme changes
  useEffect(() => {
    if (storeUser?.preferences?.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => StoreUtils.applyTheme('system');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [storeUser?.preferences?.theme]);

  const contextValue: AppStateContextValue = {
    queryClient,
    isReady,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

// Hook to use App State Context
export const useAppStateContext = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateContext must be used within an AppStateProvider');
  }
  return context;
};

// Real-time Data Provider
interface RealtimeDataProviderProps {
  children: ReactNode;
}

export const RealtimeDataProvider: React.FC<RealtimeDataProviderProps> = ({
  children,
}) => {
  const user = useAppStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const { queryClient } = useAppStateContext();

  // Set up real-time dashboard if user is authenticated and feature is enabled
  const { isInitialized } = useRealtimeDashboard(user?.diocese || '');

  // Clean up stale cache data periodically
  useEffect(() => {
    if (!user) return;

    const cleanup = setInterval(() => {
      cacheUtils.removeStaleData(queryClient);
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanup);
  }, [user, queryClient]);

  return <>{children}</>;
};

// Notification Provider for handling system notifications
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { addNotification } = useAppStore();

  // Set up service worker message handling
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION') {
          addNotification({
            type: event.data.notificationType || 'info',
            title: event.data.title,
            message: event.data.message,
            metadata: event.data.metadata,
          });
        }
      });
    }
  }, [addNotification]);

  // Handle browser notifications
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User came back to the tab, could sync notifications here
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return <>{children}</>;
};

// Performance Provider for monitoring app performance
interface PerformanceProviderProps {
  children: ReactNode;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
}) => {
  const { updateSettings } = useAppStore();

  useEffect(() => {
    // Monitor performance metrics
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          // Track navigation timing
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('Navigation timing:', {
            loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          });
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          // Track LCP
          console.log('LCP:', entry.startTime);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint'] });

    return () => observer.disconnect();
  }, [updateSettings]);

  // Monitor memory usage
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as Performance & { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize: number } }).memory;
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (memoryUsage > 0.9) {
          console.warn('High memory usage detected:', memoryUsage);
          // Could trigger cleanup or show warning
        }
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
};

// Combined App Providers
interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
}

export const AppProviders: React.FC<AppProvidersProps> = ({
  children,
  queryClient,
}) => {
  return (
    <AppStateProvider queryClient={queryClient}>
      <RealtimeDataProvider>
        <NotificationProvider>
          <PerformanceProvider>
            {children}
          </PerformanceProvider>
        </NotificationProvider>
      </RealtimeDataProvider>
    </AppStateProvider>
  );
};

// Custom hooks for common patterns
export const useAppState = () => {
  const user = useAppStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const ui = useAppStore((state) => state.ui);
  const notifications = useAppStore((state) => state.notifications);
  
  return {
    user,
    settings,
    ui,
    notifications,
    isAuthenticated: !!user,
    isOnline: settings.isOnline,
  };
};

export const useAppFeatures = () => {
  const features = useAppStore((state) => state.settings.features);
  const user = useAppStore((state) => state.user);
  
  return {
    ...features,
    // Feature flags based on user role
    canManageUsers: user?.role === 'admin',
    canApproveChurches: user?.role === 'chancery_office' || user?.role === 'admin',
    canEditChurches: user?.role !== 'museum_researcher',
    canViewAnalytics: true,
  };
};

export const useAppPermissions = () => {
  const user = useAppStore((state) => state.user);
  
  const hasPermission = (permission: string) => {
    return user?.permissions?.includes(permission) || false;
  };
  
  const hasAnyPermission = (permissions: string[]) => {
    return permissions.some(hasPermission);
  };
  
  const hasAllPermissions = (permissions: string[]) => {
    return permissions.every(hasPermission);
  };
  
  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions || [],
  };
};

// Error boundary integration with store
export class StateErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('State error boundary caught an error:', error, errorInfo);
    
    // Add error notification to store
    StoreUtils.showErrorNotification(
      'Application Error',
      'An unexpected error occurred. Please refresh the page.'
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              An unexpected error occurred. Please refresh the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppStateProvider;