import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

// Enhanced error handling function
const handleQueryError = (error: unknown, query?: any) => {
  console.error('Query failed:', error);
  
  // Firebase-specific error handling
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message: string };
    
    switch (firebaseError.code) {
      case 'permission-denied':
        toast.error('Access denied. Please check your permissions.');
        break;
      case 'unavailable':
        toast.error('Service temporarily unavailable. Please try again.');
        break;
      case 'deadline-exceeded':
        toast.error('Request timeout. Please check your connection.');
        break;
      default:
        toast.error(`Error: ${firebaseError.message}`);
    }
  } else {
    toast.error('An unexpected error occurred');
  }
};

// Enhanced mutation error handling
const handleMutationError = (error: unknown, variables?: any, context?: any) => {
  console.error('Mutation failed:', error, { variables, context });
  
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message: string };
    toast.error(`Operation failed: ${firebaseError.message}`);
  } else {
    toast.error('Operation failed. Please try again.');
  }
};

// Create enhanced query client with optimized defaults
export const createQueryClient = () => {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleQueryError,
    }),
    mutationCache: new MutationCache({
      onError: handleMutationError,
    }),
    defaultOptions: {
      queries: {
        // Optimized stale times based on data volatility
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
        
        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on permission errors
          if (error && 'code' in error && typeof error.code === 'string') {
            if (['permission-denied', 'unauthenticated'].includes(error.code)) {
              return false;
            }
          }
          // Retry up to 2 times for other errors
          return failureCount < 2;
        },
        
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Network mode configuration
        networkMode: 'online',
        
        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: 'always',
        refetchOnMount: 'stale',
        
        // Error retry configuration
        retryOnMount: true,
      },
      mutations: {
        // Mutation retry configuration
        retry: (failureCount, error) => {
          // Don't retry mutations on permission errors
          if (error && 'code' in error && typeof error.code === 'string') {
            if (['permission-denied', 'unauthenticated'].includes(error.code)) {
              return false;
            }
          }
          // Retry once for network errors
          return failureCount < 1;
        },
        
        retryDelay: 1000,
        networkMode: 'online',
      },
    },
  });
};

// Query key factories for consistent cache management
export const queryKeys = {
  // Auth queries
  auth: {
    user: () => ['auth', 'user'] as const,
    profile: (uid: string) => ['auth', 'profile', uid] as const,
  },
  
  // Church queries
  churches: {
    all: () => ['churches'] as const,
    diocese: (diocese: string) => [...queryKeys.churches.all(), 'diocese', diocese] as const,
    parish: (parishId: string) => [...queryKeys.churches.all(), 'parish', parishId] as const,
    status: (statuses: string[]) => [...queryKeys.churches.all(), 'status', ...statuses.sort()] as const,
    dioceseStatus: (diocese: string, statuses: string[]) => 
      [...queryKeys.churches.diocese(diocese), 'status', ...statuses.sort()] as const,
    search: (query: string) => [...queryKeys.churches.all(), 'search', query] as const,
    paginated: (page: number, limit: number, filters?: Record<string, any>) => 
      [...queryKeys.churches.all(), 'paginated', page, limit, filters] as const,
  },
  
  // Announcement queries
  announcements: {
    all: () => ['announcements'] as const,
    diocese: (diocese: string) => [...queryKeys.announcements.all(), 'diocese', diocese] as const,
    parish: (parishId: string) => [...queryKeys.announcements.all(), 'parish', parishId] as const,
    scope: (scope: string) => [...queryKeys.announcements.all(), 'scope', scope] as const,
    paginated: (page: number, limit: number, filters?: Record<string, any>) => 
      [...queryKeys.announcements.all(), 'paginated', page, limit, filters] as const,
  },
  
  // Feedback queries
  feedback: {
    all: () => ['feedback'] as const,
    church: (churchId: string) => [...queryKeys.feedback.all(), 'church', churchId] as const,
    user: (userId: string) => [...queryKeys.feedback.all(), 'user', userId] as const,
    paginated: (page: number, limit: number, filters?: Record<string, any>) => 
      [...queryKeys.feedback.all(), 'paginated', page, limit, filters] as const,
  },
  
  // User management queries
  users: {
    all: () => ['users'] as const,
    role: (role: string) => [...queryKeys.users.all(), 'role', role] as const,
    diocese: (diocese: string) => [...queryKeys.users.all(), 'diocese', diocese] as const,
    invites: () => ['invites'] as const,
    dioceseInvites: (diocese: string) => [...queryKeys.users.invites(), 'diocese', diocese] as const,
  },
  
  // Analytics and reports
  analytics: {
    all: () => ['analytics'] as const,
    churches: (diocese?: string, dateRange?: [Date, Date]) => 
      [...queryKeys.analytics.all(), 'churches', diocese, dateRange] as const,
    visits: (diocese?: string, dateRange?: [Date, Date]) => 
      [...queryKeys.analytics.all(), 'visits', diocese, dateRange] as const,
    feedback: (diocese?: string, dateRange?: [Date, Date]) => 
      [...queryKeys.analytics.all(), 'feedback', diocese, dateRange] as const,
  },
};

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidate all data for a diocese
  invalidateDiocese: (queryClient: QueryClient, diocese: string) => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.includes(diocese);
      }
    });
  },
  
  // Invalidate all church-related data
  invalidateChurches: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.churches.all() });
  },
  
  // Invalidate specific church data
  invalidateChurch: (queryClient: QueryClient, churchId: string) => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey;
        return queryKey.includes('churches') && queryKey.includes(churchId);
      }
    });
  },
  
  // Remove stale data
  removeStaleData: (queryClient: QueryClient, maxAge: number = 30 * 60 * 1000) => {
    const now = Date.now();
    queryClient.getQueryCache().getAll().forEach((query) => {
      if (query.state.dataUpdatedAt && (now - query.state.dataUpdatedAt) > maxAge) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },
  
  // Prefetch related data
  prefetchRelatedData: async (queryClient: QueryClient, diocese: string) => {
    // Prefetch common queries for better UX
    const prefetchPromises = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.churches.diocese(diocese),
        staleTime: 10 * 60 * 1000, // 10 minutes
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.announcements.diocese(diocese),
        staleTime: 5 * 60 * 1000, // 5 minutes
      }),
    ];
    
    try {
      await Promise.allSettled(prefetchPromises);
    } catch (error) {
      console.warn('Failed to prefetch some data:', error);
    }
  },
};

// Background data sync utilities
export const backgroundSync = {
  // Sync critical data in background
  syncCriticalData: (queryClient: QueryClient, diocese: string) => {
    const criticalQueries = [
      queryKeys.churches.dioceseStatus(diocese, ['pending', 'needs_revision', 'heritage_review']),
      queryKeys.announcements.diocese(diocese),
    ];
    
    criticalQueries.forEach(queryKey => {
      queryClient.refetchQueries({ 
        queryKey, 
        type: 'active',
        stale: true,
      });
    });
  },
  
  // Setup automatic background sync
  setupBackgroundSync: (queryClient: QueryClient, diocese: string, interval: number = 30000) => {
    const syncInterval = setInterval(() => {
      // Only sync if the tab is visible
      if (!document.hidden) {
        backgroundSync.syncCriticalData(queryClient, diocese);
      }
    }, interval);
    
    // Cleanup function
    return () => clearInterval(syncInterval);
  },
};

// Performance monitoring
export const performanceMonitor = {
  // Track query performance
  trackQueryPerformance: (queryKey: unknown[], duration: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Query ${JSON.stringify(queryKey)} took ${duration}ms`);
    }
    
    // Send to analytics in production
    if (process.env.NODE_ENV === 'production' && window.gtag) {
      window.gtag('event', 'query_performance', {
        event_category: 'performance',
        event_label: JSON.stringify(queryKey),
        value: Math.round(duration),
      });
    }
  },
  
  // Monitor cache hit rates
  monitorCacheHitRate: (queryClient: QueryClient) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    const stats = queries.reduce((acc, query) => {
      if (query.state.status === 'success') {
        acc.hits += 1;
      } else {
        acc.misses += 1;
      }
      return acc;
    }, { hits: 0, misses: 0 });
    
    const hitRate = stats.hits / (stats.hits + stats.misses) || 0;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
    }
    
    return hitRate;
  },
};

export default createQueryClient;
