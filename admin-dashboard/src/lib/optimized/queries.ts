import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { 
  getChurchesByDiocese, 
  getChurchesByStatus,
  updateChurchStatus,
  type Church, 
  type ChurchStatus 
} from '@/lib/churches';
import type { Diocese, UserProfile } from '@/contexts/AuthContext';
import { notificationService, type Notification } from '@/lib/notifications';
import { useCallback, useRef, useEffect } from 'react';

// =============================================================================
// QUERY KEYS FACTORY - Centralized key management for cache invalidation
// =============================================================================

// Query Keys Factory
export const churchKeys = {
  all: ['churches'] as const,
  diocese: (diocese: Diocese) => [...churchKeys.all, 'diocese', diocese] as const,
  status: (statuses: ChurchStatus[]) => [...churchKeys.all, 'status', ...statuses] as const,
  dioceseStatus: (diocese: Diocese, statuses: ChurchStatus[]) => 
    [...churchKeys.diocese(diocese), 'status', ...statuses] as const,
  single: (id: string) => [...churchKeys.all, 'single', id] as const,
  paginated: (diocese: Diocese, page: number) => 
    [...churchKeys.diocese(diocese), 'page', page] as const,
} as const;

// Analytics Keys Factory
export const analyticsKeys = {
  all: ['analytics'] as const,
  diocese: (diocese: Diocese) => [...analyticsKeys.all, 'diocese', diocese] as const,
  engagement: (diocese: Diocese, startDate: string, endDate: string) => 
    [...analyticsKeys.diocese(diocese), 'engagement', startDate, endDate] as const,
  feedback: (diocese: Diocese) => [...analyticsKeys.diocese(diocese), 'feedback'] as const,
} as const;

// =============================================================================
// OPTIMIZED CHURCH QUERIES - With better caching and stale time management
// =============================================================================

// Optimized Church Queries
export const useChurches = (diocese: Diocese, enabled = true) => {
  return useQuery({
    queryKey: churchKeys.diocese(diocese),
    queryFn: () => getChurchesByDiocese(diocese),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error && 'code' in error && typeof error.code === 'string') {
        if (error.code.startsWith('permission-denied')) return false;
      }
      return failureCount < 2;
    },
  });
};

export const useChurchesByStatus = (statuses: ChurchStatus[], enabled = true) => {
  return useQuery({
    queryKey: churchKeys.status(statuses),
    queryFn: () => getChurchesByStatus(statuses),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for pending items)
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // Refetch pending items when window focused
  });
};

export const usePendingChurches = (diocese: Diocese, enabled = true) => {
  const pendingStatuses: ChurchStatus[] = ['pending', 'heritage_review'];
  
  return useQuery({
    queryKey: churchKeys.dioceseStatus(diocese, pendingStatuses),
    queryFn: () => getChurchesByDiocese(diocese, pendingStatuses),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - very fresh for pending items
    gcTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: true,
  });
};

// Optimized Church Mutations
export const useUpdateChurchStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      churchId, 
      status, 
      note, 
      reviewerUid 
    }: {
      churchId: string;
      status: ChurchStatus;
      note?: string;
      reviewerUid?: string;
    }) => updateChurchStatus(churchId, status, note, reviewerUid),
    
    onMutate: async ({ churchId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: churchKeys.all });
      
      // Optimistically update the cache
      const previousChurches = queryClient.getQueriesData({ queryKey: churchKeys.all });
      
      queryClient.setQueriesData(
        { queryKey: churchKeys.all },
        (old: Church[] | undefined) => {
          if (!old) return old;
          return old.map(church => 
            church.id === churchId 
              ? { ...church, status, updatedAt: new Date() }
              : church
          );
        }
      );
      
      return { previousChurches };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousChurches) {
        context.previousChurches.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: churchKeys.all });
    },
  });
};

// Prefetch utility for better UX
export const usePrefetchChurches = () => {
  const queryClient = useQueryClient();
  
  const prefetchDiocese = (diocese: Diocese) => {
    queryClient.prefetchQuery({
      queryKey: churchKeys.diocese(diocese),
      queryFn: () => getChurchesByDiocese(diocese),
      staleTime: 5 * 60 * 1000,
    });
  };
  
  const prefetchPending = (diocese: Diocese) => {
    const pendingStatuses: ChurchStatus[] = ['pending', 'heritage_review'];
    queryClient.prefetchQuery({
      queryKey: churchKeys.dioceseStatus(diocese, pendingStatuses),
      queryFn: () => getChurchesByDiocese(diocese, pendingStatuses),
      staleTime: 1 * 60 * 1000,
    });
  };
  
  return { prefetchDiocese, prefetchPending };
};

// Notification Query Keys Factory
export const notificationKeys = {
  all: ['notifications'] as const,
  user: (userId: string) => [...notificationKeys.all, 'user', userId] as const,
  unread: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
} as const;

// Notification Queries
export const useUserNotifications = (userProfile: UserProfile | null, enabled = true) => {
  return useQuery({
    queryKey: userProfile ? notificationKeys.user(userProfile.uid) : ['notifications', 'none'],
    queryFn: () => {
      if (!userProfile) return [];
      return notificationService.getUserNotifications(userProfile, 20, false);
    },
    enabled: enabled && !!userProfile,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for new notifications
  });
};

export const useUnreadNotificationCount = (userProfile: UserProfile | null, enabled = true) => {
  return useQuery({
    queryKey: userProfile ? notificationKeys.unread(userProfile.uid) : ['notifications', 'unread', 'none'],
    queryFn: async () => {
      if (!userProfile) return 0;
      return notificationService.getUnreadCount(userProfile);
    },
    enabled: enabled && !!userProfile,
    staleTime: 30 * 1000, // 30 seconds - fresh for badge
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

// Notification Mutations
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      notificationId, 
      userId 
    }: {
      notificationId: string;
      userId: string;
    }) => notificationService.markAsRead(notificationId, userId),
    
    onSuccess: (_, { userId }) => {
      // Invalidate both notification list and unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unread(userId) });
    },
  });
};

// =============================================================================
// SUBSCRIPTION MANAGER - Prevents memory leaks with real-time listeners
// =============================================================================

/**
 * Hook to safely manage Firestore subscriptions
 * Automatically cleans up listeners on unmount to prevent memory leaks
 */
export const useFirestoreSubscription = <T>(
  subscribeCallback: (callback: (data: T) => void) => () => void,
  dependencies: unknown[] = []
) => {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const dataRef = useRef<T | null>(null);

  useEffect(() => {
    // Set up subscription
    unsubscribeRef.current = subscribeCallback((data) => {
      dataRef.current = data;
    });

    // Cleanup on unmount or dependency change
    return () => {
      if (unsubscribeRef.current) {
        console.log('🧹 Cleaning up Firestore subscription');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return {
    unsubscribe: useCallback(() => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    }, []),
    getData: () => dataRef.current,
  };
};

// =============================================================================
// DEBOUNCED QUERIES - Prevents excessive API calls during rapid user input
// =============================================================================

/**
 * Debounce hook for search queries
 * Delays the query execution until user stops typing
 */
export const useDebouncedValue = <T>(value: T, delay: number = 300): T => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedRef = useRef<T>(value);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      debouncedRef.current = value;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedRef.current;
};

// =============================================================================
// CACHE UTILITIES - Helper functions for manual cache management
// =============================================================================

/**
 * Invalidate all queries for a specific diocese
 * Useful after major updates
 */
export const useInvalidateDioceseCache = () => {
  const queryClient = useQueryClient();
  
  return useCallback((diocese: Diocese) => {
    console.log(`🔄 Invalidating cache for diocese: ${diocese}`);
    queryClient.invalidateQueries({ queryKey: churchKeys.diocese(diocese) });
    queryClient.invalidateQueries({ queryKey: analyticsKeys.diocese(diocese) });
  }, [queryClient]);
};

/**
 * Clear all cached data
 * Useful for logout or major state resets
 */
export const useClearAllCache = () => {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    console.log('🧹 Clearing all query cache');
    queryClient.clear();
  }, [queryClient]);
};

/**
 * Get cached data without triggering a fetch
 * Useful for checking if data is already available
 */
export const useGetCachedChurches = () => {
  const queryClient = useQueryClient();
  
  return useCallback((diocese: Diocese): Church[] | undefined => {
    return queryClient.getQueryData(churchKeys.diocese(diocese));
  }, [queryClient]);
};