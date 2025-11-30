/**
 * =============================================================================
 * APP STATE PROVIDER - Global State Management Hub
 * =============================================================================
 *
 * PURPOSE:
 * This file contains multiple React Context Providers that work together to
 * manage the entire application's global state. Think of it as the "nervous
 * system" of the app - it coordinates data flow, user preferences, real-time
 * updates, notifications, and performance monitoring.
 *
 * WHY MULTIPLE PROVIDERS?
 * Each provider has a specific responsibility (Single Responsibility Principle):
 * - AppStateProvider: Core state (user, settings, query client)
 * - RealtimeDataProvider: Live data subscriptions
 * - NotificationProvider: System notifications
 * - PerformanceProvider: Performance monitoring
 *
 * PROVIDER HIERARCHY (how they're nested):
 * <AppStateProvider>           ← Core state, query client
 *   <RealtimeDataProvider>     ← Live Firebase subscriptions
 *     <NotificationProvider>   ← System notifications
 *       <PerformanceProvider>  ← Performance monitoring
 *         {children}           ← Your actual app content
 *       </PerformanceProvider>
 *     </NotificationProvider>
 *   </RealtimeDataProvider>
 * </AppStateProvider>
 *
 * KEY CONCEPTS:
 * 1. React Context: Shares data across components without prop drilling
 * 2. Zustand Store: External state management (useAppStore)
 * 3. React Query: Server state caching and synchronization
 * 4. Side Effects: useEffect hooks for browser events, theme changes, etc.
 *
 * STATE SOURCES:
 * ┌────────────────────┬────────────────────────────────────────────────────┐
 * │ Source             │ What It Manages                                    │
 * ├────────────────────┼────────────────────────────────────────────────────┤
 * │ AuthContext        │ Firebase Auth user, login state                    │
 * │ Zustand (app-store)│ UI state, user preferences, notifications         │
 * │ React Query        │ Server data (churches, feedback, etc.)             │
 * │ Local State        │ Component-specific state (modals, forms)           │
 * └────────────────────┴────────────────────────────────────────────────────┘
 *
 * RELATED FILES:
 * - lib/state/app-store.ts: Zustand store definition
 * - contexts/AuthContext.tsx: Firebase authentication
 * - lib/data-management/realtime.ts: Real-time data hooks
 * - lib/data-management/queryClient.ts: React Query utilities
 */

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { useAppStore, StoreUtils, User } from '@/lib/state/app-store';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeDashboard } from '@/lib/data-management/realtime';
import { cacheUtils } from '@/lib/data-management/queryClient';

// =============================================================================
// APP STATE CONTEXT - Core Application State
// =============================================================================

/**
 * Context value shape - what's available to consumers
 */
interface AppStateContextValue {
  queryClient: QueryClient;  // React Query client for cache operations
  isReady: boolean;          // Whether auth has finished loading
}

// Create the context with null as initial value
const AppStateContext = createContext<AppStateContextValue | null>(null);

/**
 * Props for AppStateProvider
 */
interface AppStateProviderProps {
  children: ReactNode;
  queryClient: QueryClient;  // Injected from parent (typically App.tsx)
}

/**
 * AppStateProvider Component
 *
 * RESPONSIBILITIES:
 * 1. Sync Firebase Auth user with Zustand store
 * 2. Detect online/offline status
 * 3. Apply user theme preferences
 * 4. Signal when app is ready
 *
 * WHY SYNC AUTH TO ZUSTAND?
 * - Firebase Auth provides raw user data
 * - Zustand store enriches it with preferences and permissions
 * - Components can access user data without importing Firebase
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
  queryClient,
}) => {
  // Get auth state from AuthContext (Firebase)
  const { user: authUser, userProfile, loading: authLoading } = useAuth();
  // Get Zustand store actions and current user
  const { setUser, updateSettings, user: storeUser } = useAppStore();
  const [isReady, setIsReady] = React.useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Sync Firebase Auth user → Zustand store
  // ─────────────────────────────────────────────────────────────────────────
  // When Firebase auth changes, update the Zustand store with enriched user data
  useEffect(() => {
    if (authUser && userProfile && (!storeUser || storeUser.uid !== authUser.uid)) {
      // Create enriched user object with preferences
      const userData: User = {
        uid: authUser.uid,
        email: authUser.email || '',
        displayName: authUser.displayName || userProfile.name,
        role: userProfile.role,
        diocese: userProfile.diocese,
        permissions: [], // Default empty permissions array
        isActive: true,
        lastLogin: new Date(),
        // Preserve existing preferences or use defaults
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
      // User logged out - clear store
      setUser(null);
    }
  }, [authUser, userProfile, storeUser, setUser]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Online/Offline Detection
  // ─────────────────────────────────────────────────────────────────────────
  // Listen for browser online/offline events and update state accordingly
  // Shows toast notifications when connection status changes
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

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Mark app as ready when auth finishes loading
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading) {
      setIsReady(true);
    }
  }, [authLoading]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Apply theme preference on mount and when it changes
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (storeUser?.preferences?.theme) {
      StoreUtils.applyTheme(storeUser.preferences.theme);
    }
  }, [storeUser?.preferences?.theme]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Listen for system theme changes (when theme = 'system')
  // ─────────────────────────────────────────────────────────────────────────
  // Uses media query to detect dark/light mode preference
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

/**
 * Hook to access AppStateContext
 *
 * USAGE:
 * const { queryClient, isReady } = useAppStateContext();
 *
 * @throws Error if used outside of AppStateProvider
 */
export const useAppStateContext = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppStateContext must be used within an AppStateProvider');
  }
  return context;
};

// =============================================================================
// REALTIME DATA PROVIDER - Live Firebase Subscriptions
// =============================================================================

interface RealtimeDataProviderProps {
  children: ReactNode;
}

/**
 * RealtimeDataProvider Component
 *
 * RESPONSIBILITIES:
 * 1. Set up real-time Firestore listeners for dashboard data
 * 2. Periodically clean up stale cache data
 *
 * WHY REAL-TIME?
 * - Dashboard shows live data (new submissions, status changes)
 * - Multiple admins may be working simultaneously
 * - Users expect to see changes without refreshing
 */
export const RealtimeDataProvider: React.FC<RealtimeDataProviderProps> = ({
  children,
}) => {
  const user = useAppStore((state) => state.user);
  const settings = useAppStore((state) => state.settings);
  const { queryClient } = useAppStateContext();

  // Set up real-time dashboard if user is authenticated
  const { isInitialized } = useRealtimeDashboard(user?.diocese || '');

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Periodic cache cleanup
  // ─────────────────────────────────────────────────────────────────────────
  // Removes stale data from React Query cache every 5 minutes
  // Prevents memory bloat from accumulating old data
  useEffect(() => {
    if (!user) return;

    const cleanup = setInterval(() => {
      cacheUtils.removeStaleData(queryClient);
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanup);
  }, [user, queryClient]);

  return <>{children}</>;
};

// =============================================================================
// NOTIFICATION PROVIDER - System Notifications
// =============================================================================

interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * NotificationProvider Component
 *
 * RESPONSIBILITIES:
 * 1. Handle service worker push notifications
 * 2. Handle browser visibility changes
 *
 * HOW SERVICE WORKER NOTIFICATIONS WORK:
 * 1. Server sends push notification to service worker
 * 2. Service worker posts message to app
 * 3. This provider receives message and adds to notification store
 * 4. UI displays notification badge/toast
 */
export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { addNotification } = useAppStore();

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Service Worker message handling
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Browser visibility change handling
  // ─────────────────────────────────────────────────────────────────────────
  // Could sync notifications when user returns to tab
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

// =============================================================================
// PERFORMANCE PROVIDER - Performance Monitoring
// =============================================================================

interface PerformanceProviderProps {
  children: ReactNode;
}

/**
 * PerformanceProvider Component
 *
 * RESPONSIBILITIES:
 * 1. Monitor navigation timing (page load performance)
 * 2. Track Largest Contentful Paint (LCP) - key Core Web Vital
 * 3. Monitor memory usage to detect potential leaks
 *
 * WHY MONITOR PERFORMANCE?
 * - Identify slow pages before users complain
 * - Detect memory leaks that could crash the browser
 * - Measure impact of code changes on performance
 */
export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
}) => {
  const { updateSettings } = useAppStore();

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Monitor performance metrics using Performance Observer API
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          // Track navigation timing (how long page took to load)
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('Navigation timing:', {
            loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          });
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          // Track LCP - measures when largest content element becomes visible
          // Good LCP is < 2.5 seconds
          console.log('LCP:', entry.startTime);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint'] });

    return () => observer.disconnect();
  }, [updateSettings]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECT: Memory usage monitoring
  // ─────────────────────────────────────────────────────────────────────────
  // Checks memory usage every 30 seconds and warns if > 90%
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

// =============================================================================
// COMBINED APP PROVIDERS - Convenience Wrapper
// =============================================================================

interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
}

/**
 * AppProviders Component
 *
 * Combines all providers into a single wrapper for cleaner code.
 * Instead of nesting 4 providers in App.tsx, just use <AppProviders>.
 *
 * USAGE:
 * <AppProviders queryClient={queryClient}>
 *   <App />
 * </AppProviders>
 */
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

// =============================================================================
// CUSTOM HOOKS - Convenient State Access
// =============================================================================

/**
 * useAppState Hook
 *
 * Provides easy access to common app state values.
 * Avoids repetitive selectors in every component.
 *
 * USAGE:
 * const { user, isAuthenticated, isOnline } = useAppState();
 */
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

/**
 * useAppFeatures Hook
 *
 * Returns feature flags based on user role.
 * Centralizes permission logic for UI feature visibility.
 *
 * USAGE:
 * const { canManageUsers, canApproveChurches } = useAppFeatures();
 * {canManageUsers && <UserManagementButton />}
 */
export const useAppFeatures = () => {
  const features = useAppStore((state) => state.settings.features);
  const user = useAppStore((state) => state.user);
  
  return {
    ...features,
    // Role-based feature flags
    canManageUsers: user?.role === 'admin',
    canApproveChurches: user?.role === 'chancery_office' || user?.role === 'admin',
    canEditChurches: user?.role !== 'museum_researcher',
    canViewAnalytics: true,
  };
};

/**
 * useAppPermissions Hook
 *
 * Provides permission checking functions.
 * For fine-grained access control beyond roles.
 *
 * USAGE:
 * const { hasPermission, hasAnyPermission } = useAppPermissions();
 * if (hasPermission('delete_church')) { ... }
 */
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

// =============================================================================
// ERROR BOUNDARY - State-Integrated Error Handling
// =============================================================================

/**
 * StateErrorBoundary Class
 *
 * React Error Boundary that integrates with the notification store.
 * Catches JavaScript errors anywhere in the child component tree.
 *
 * WHY CLASS COMPONENT?
 * Error boundaries MUST be class components - React doesn't support
 * error boundaries as function components (yet).
 *
 * WHAT IT CATCHES:
 * - Rendering errors
 * - Lifecycle method errors
 * - Constructor errors
 *
 * WHAT IT DOESN'T CATCH:
 * - Event handler errors (use try/catch)
 * - Async code errors (use try/catch)
 * - Server-side rendering errors
 */
export class StateErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // Called when an error is thrown - update state to show fallback UI
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  // Called after error is caught - log error and show notification
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('State error boundary caught an error:', error, errorInfo);
    
    // Add error notification to store (shows toast to user)
    StoreUtils.showErrorNotification(
      'Application Error',
      'An unexpected error occurred. Please refresh the page.'
    );
  }

  render() {
    // Show fallback UI if error occurred
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

    // No error - render children normally
    return this.props.children;
  }
}

export default AppStateProvider;