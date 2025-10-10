// Utility functions for lazy loading components
// Separated from LazyComponents.tsx to comply with react-refresh/only-export-components

import React from 'react';

/**
 * Higher-order component for consistent error boundaries and loading states
 * Wraps a lazy-loaded component with Suspense and a loading fallback
 */
export const withLazyLoading = <T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
) => {
  return (props: T) => (
    <React.Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )
      }
    >
      <Component {...props} />
    </React.Suspense>
  );
};

/**
 * Preload a component for better UX
 * Only works in browser environment (not during SSR)
 */
export const preloadComponent = (componentLoader: () => Promise<unknown>) => {
  if (typeof window !== 'undefined') {
    // Only preload on browser, not during SSR
    componentLoader();
  }
};

/**
 * Preload critical components on user interaction
 * Call this on app initialization or user interactions (hover, focus, etc.)
 */
export const preloadCriticalComponents = () => {
  // Preload commonly used components
  preloadComponent(() => import('./charts/ChartComponents'));
  preloadComponent(() => import('./filters/FilterSystem'));
};

/**
 * Conditional loading based on user role or permissions
 * Preloads role-specific components to improve perceived performance
 */
export const loadComponentsByRole = (userRole: string) => {
  switch (userRole) {
    case 'chancery_office':
      preloadComponent(() => import('../pages/TagbilaranDashboard'));
      preloadComponent(() => import('../pages/TalibonDashboard'));
      preloadComponent(() => import('./CreateParishAccountModal'));
      break;
    case 'parish_secretary':
      preloadComponent(() => import('../pages/ParishDashboard'));
      preloadComponent(() => import('./forms/OptimizedChurchForm'));
      break;
    case 'museum_researcher':
      preloadComponent(() => import('../pages/MuseumResearcherDashboard'));
      preloadComponent(() => import('./charts/ChartComponents'));
      break;
    default:
      // Load common components for all users
      preloadComponent(() => import('../pages/Churches'));
      break;
  }
};

