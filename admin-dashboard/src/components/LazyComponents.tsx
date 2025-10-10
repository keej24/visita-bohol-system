import React, { lazy } from 'react';

// Lazy load heavy components for code splitting - ChartComponents exports object, not component
// Individual chart components should be imported separately as needed

export const LazyFilterSystem = lazy(() => 
  import('./filters/FilterSystem').then(module => ({
    default: module.FilterSystem
  }))
);

// Dashboard pages - lazy loaded for better initial load times
export const LazyTagbilaranDashboard = lazy(() => import('../pages/TagbilaranDashboard'));
export const LazyTalibonDashboard = lazy(() => import('../pages/TalibonDashboard'));
export const LazyParishDashboard = lazy(() => import('../pages/ParishDashboard'));
export const LazyMuseumResearcherDashboard = lazy(() => import('../pages/MuseumResearcherDashboard'));
export const LazyChurches = lazy(() => import('../pages/Churches'));
export const LazyReports = lazy(() => import('../pages/Reports'));
export const LazyAnnouncements = lazy(() => import('../pages/Announcements'));
export const LazyFeedback = lazy(() => import('../pages/Feedback'));
export const LazyAccountSettings = lazy(() => import('../pages/AccountSettings'));
export const LazyApprovedChurches = lazy(() => import('../pages/ApprovedChurches'));
export const LazyUserManagement = lazy(() => import('../pages/UserManagementPage'));

// Form components - lazy loaded when needed
export const LazyChurchForm = lazy(() =>
  import('./forms/OptimizedChurchForm').then(module => ({
    default: module.OptimizedChurchForm
  }))
);

export const LazyCreateParishAccountModal = lazy(() => import('./CreateParishAccountModal'));

// Chart-related components
export const LazyChurchStatusChart = lazy(() => 
  import('./charts/ChartComponents').then(module => ({
    default: module.ChurchStatusChart
  }))
);

export const LazyMonthlyTrendChart = lazy(() => 
  import('./charts/ChartComponents').then(module => ({
    default: module.MonthlyTrendChart
  }))
);

export const LazyDioceseComparisonChart = lazy(() => 
  import('./charts/ChartComponents').then(module => ({
    default: module.DioceseComparisonChart
  }))
);

export const LazyHeritageProgressChart = lazy(() => 
  import('./charts/ChartComponents').then(module => ({
    default: module.HeritageProgressChart
  }))
);

export const LazyActivityTimelineChart = lazy(() => 
  import('./charts/ChartComponents').then(module => ({
    default: module.ActivityTimelineChart
  }))
);

// Mobile components - only loaded on mobile viewports
export const LazyMobileReviewList = lazy(() => import('./mobile/MobileReviewList'));

// Optimized components - loaded when performance is critical
export const LazyOptimizedChanceryReviewList = lazy(() =>
  import('./optimized/OptimizedChanceryReviewList').then(module => ({
    default: module.OptimizedChanceryReviewList
  }))
);

export const LazyOptimizedRecentChurches = lazy(() =>
  import('./optimized/OptimizedRecentChurches').then(module => ({
    default: module.OptimizedRecentChurches
  }))
);

// UI components that might be heavy
export const LazyEnhancedPagination = lazy(() =>
  import('./ui/enhanced-pagination').then(module => ({
    default: module.EnhancedPagination
  }))
);

// Note: Only include lazy imports for components that actually exist
// Placeholder for announcement components when they are created
// export const LazyAnnouncementList = lazy(() => import('./announcements/AnnouncementList'));
// export const LazyAnnouncementForm = lazy(() => import('./announcements/AnnouncementForm'));

// Higher-order component for consistent error boundaries and loading states
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

// Preload utilities for better UX
export const preloadComponent = (componentLoader: () => Promise<unknown>) => {
  if (typeof window !== 'undefined') {
    // Only preload on browser, not during SSR
    componentLoader();
  }
};

// Preload critical components on user interaction
export const preloadCriticalComponents = () => {
  // Preload commonly used components
  preloadComponent(() => import('./charts/ChartComponents'));
  preloadComponent(() => import('./filters/FilterSystem'));
};

// Conditional loading based on user role or permissions
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

