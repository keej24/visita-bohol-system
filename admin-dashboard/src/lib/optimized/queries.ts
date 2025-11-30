/**
 * =============================================================================
 * REACT QUERY HOOKS - DATA FETCHING AND CACHING FOR ADMIN DASHBOARD
 * =============================================================================
 *
 * FILE PURPOSE:
 * This file provides custom React hooks for fetching, caching, and updating
 * church data from Firebase. It uses React Query (TanStack Query) for
 * automatic caching, background refetching, and optimistic updates.
 *
 * WHY REACT QUERY?
 * Without React Query, you would:
 * - Write useEffect + useState for every data fetch
 * - Manually handle loading/error states
 * - Have no caching (re-fetch every time component mounts)
 * - Deal with stale data issues
 *
 * With React Query, you get:
 * - Automatic caching and deduplication
 * - Background refetching when data becomes stale
 * - Optimistic updates (UI updates before server confirms)
 * - Built-in loading/error states
 *
 * KEY CONCEPTS:
 *
 * 1. QUERY KEYS:
 *    - Unique identifiers for cached data
 *    - Used to invalidate/refetch specific data
 *    - Hierarchical structure (e.g., ['churches', 'diocese', 'tagbilaran'])
 *
 * 2. STALE TIME:
 *    - How long data is considered "fresh"
 *    - Fresh data won't refetch on component mount
 *    - Stale data will refetch in background
 *
 * 3. MUTATIONS:
 *    - For data modifications (create, update, delete)
 *    - Can include optimistic updates
 *    - Automatically invalidates related queries
 *
 * USAGE EXAMPLE:
 * ```tsx
 * function ChurchList() {
 *   const { data: churches, isLoading, error } = useChurches('tagbilaran');
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error />;
 *   return <ul>{churches.map(c => <li>{c.name}</li>)}</ul>;
 * }
 * ```
 *
 * RELATED FILES:
 * - lib/churches.ts: Actual Firebase fetching functions
 * - services/churchService.ts: Business logic layer
 * - contexts/AuthContext.tsx: User diocese information
 * =============================================================================
 */

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
/**
 * Query Keys Factory for Churches
 *
 * WHY USE A FACTORY?
 * - Consistent key structure across the app
 * - Type-safe with TypeScript 'as const'
 * - Easy to invalidate related queries
 * - Prevents typos in key strings
 *
 * KEY HIERARCHY:
 * churchKeys.all                      → ['churches']
 * churchKeys.diocese('tagbilaran')    → ['churches', 'diocese', 'tagbilaran']
 * churchKeys.status(['pending'])      → ['churches', 'status', 'pending']
 *
 * INVALIDATION EXAMPLE:
 * queryClient.invalidateQueries({ queryKey: churchKeys.all })
 * // ↑ This invalidates ALL church-related queries
 *
 * queryClient.invalidateQueries({ queryKey: churchKeys.diocese('tagbilaran') })
 * // ↑ This invalidates only Tagbilaran diocese queries
 */
export const churchKeys = {
  // Base key for all church queries - invalidating this clears all church cache
  all: ['churches'] as const,
  
  // Diocese-specific queries (most common use case)
  diocese: (diocese: Diocese) => [...churchKeys.all, 'diocese', diocese] as const,
  
  // Status-filtered queries (for review queues)
  status: (statuses: ChurchStatus[]) => [...churchKeys.all, 'status', ...statuses] as const,
  
  // Combined diocese + status filter
  dioceseStatus: (diocese: Diocese, statuses: ChurchStatus[]) => 
    [...churchKeys.diocese(diocese), 'status', ...statuses] as const,
  
  // Single church by ID
  single: (id: string) => [...churchKeys.all, 'single', id] as const,
  
  // Paginated queries (for large datasets)
  paginated: (diocese: Diocese, page: number) => 
    [...churchKeys.diocese(diocese), 'page', page] as const,
} as const;

/**
 * Query Keys Factory for Analytics
 *
 * Similar to churchKeys but for analytics/engagement data.
 * Keeps analytics cache separate from church data cache.
 */
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

/**
 * useChurches - Fetch all churches for a diocese
 *
 * This is the main hook for loading church lists in dashboards.
 *
 * CACHING BEHAVIOR:
 * - staleTime: 5 minutes (data considered fresh for 5 min)
 * - gcTime: 10 minutes (garbage collected after 10 min unused)
 * - refetchOnWindowFocus: false (don't refetch when tab gains focus)
 *
 * ERROR HANDLING:
 * - Retries up to 2 times on failure
 * - Doesn't retry permission errors (would fail anyway)
 *
 * @param diocese - 'tagbilaran' or 'talibon'
 * @param enabled - Set false to disable the query
 *
 * @returns { data, isLoading, error, refetch }
 *
 * USAGE:
 * ```tsx
 * const { data: churches, isLoading } = useChurches('tagbilaran');
 * ```
 */
export const useChurches = (diocese: Diocese, enabled = true) => {
  return useQuery({
    queryKey: churchKeys.diocese(diocese),
    queryFn: () => getChurchesByDiocese(diocese),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache persists in memory
    refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    retry: (failureCount, error) => {
      // Don't retry on permission errors - they won't succeed
      if (error && 'code' in error && typeof error.code === 'string') {
        if (error.code.startsWith('permission-denied')) return false;
      }
      return failureCount < 2; // Retry up to 2 times
    },
  });
};

/**
 * useChurchesByStatus - Fetch churches with specific statuses
 *
 * Used for status-specific views like "Pending Review" or "Under Review".
 *
 * @param statuses - Array of statuses to filter by
 * @param enabled - Set false to disable the query
 */
export const useChurchesByStatus = (statuses: ChurchStatus[], enabled = true) => {
  return useQuery({
    queryKey: churchKeys.status(statuses),
    queryFn: () => getChurchesByStatus(statuses),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for pending items - need fresher data)
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // DO refetch pending items when window focused
  });
};

/**
 * usePendingChurches - Specialized hook for pending review queue
 *
 * This hook is optimized for the chancery review dashboard.
 * It uses aggressive caching and auto-refresh to keep data fresh.
 *
 * WHY AGGRESSIVE REFRESH?
 * - Pending items are time-sensitive (need quick review)
 * - Multiple admins might be reviewing simultaneously
 * - New submissions should appear quickly
 *
 * @param diocese - Diocese to filter by
 * @param enabled - Set false to disable
 */
export const usePendingChurches = (diocese: Diocese, enabled = true) => {
  const pendingStatuses: ChurchStatus[] = ['pending', 'heritage_review'];
  
  return useQuery({
    queryKey: churchKeys.dioceseStatus(diocese, pendingStatuses),
    queryFn: () => getChurchesByDiocese(diocese, pendingStatuses),
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute - very fresh for pending items
    gcTime: 3 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds!
    refetchOnWindowFocus: true,
  });
};

// =============================================================================
// MUTATIONS - For modifying church data
// =============================================================================

/**
 * useUpdateChurchStatus - Mutation for changing church status
 *
 * This hook handles the church approval workflow actions:
 * - Approve church
 * - Forward to museum review
 * - Reject/request revisions
 *
 * OPTIMISTIC UPDATE EXPLAINED:
 * 1. onMutate: BEFORE server call, update UI immediately
 * 2. User sees instant feedback (better UX)
 * 3. onError: If server fails, rollback to previous state
 * 4. onSettled: Always refetch to ensure consistency
 *
 * WHY OPTIMISTIC UPDATES?
 * - Makes UI feel instant/responsive
 * - User doesn't wait for server round-trip
 * - Rollback handles errors gracefully
 */
export const useUpdateChurchStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    // The actual API call
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
    
    // STEP 1: Optimistic update (before server responds)
    onMutate: async ({ churchId, status }) => {
      // Cancel any in-flight refetches (they would overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: churchKeys.all });
      
      // Save current state for potential rollback
      const previousChurches = queryClient.getQueriesData({ queryKey: churchKeys.all });
      
      // Optimistically update ALL church queries in cache
      queryClient.setQueriesData(
        { queryKey: churchKeys.all },
        (old: Church[] | undefined) => {
          if (!old) return old;
          // Find the church and update its status
          return old.map(church => 
            church.id === churchId 
              ? { ...church, status, updatedAt: new Date() }
              : church
          );
        }
      );
      
      // Return context with previous data for rollback
      return { previousChurches };
    },
    
    // STEP 2: Handle errors - rollback optimistic update
    onError: (err, variables, context) => {
      // Restore all queries to their previous state
      if (context?.previousChurches) {
        context.previousChurches.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // STEP 3: After mutation completes (success OR error)
    onSettled: () => {
      // Always invalidate to refetch fresh data from server
      // This ensures our optimistic update matches server state
      queryClient.invalidateQueries({ queryKey: churchKeys.all });
    },
  });
};

/**
 * usePrefetchChurches - Prefetch data before user navigates
 *
 * Used to preload data for better perceived performance.
 *
 * EXAMPLE USE CASE:
 * When user hovers over "Talibon Diocese" tab, prefetch that data
 * so it loads instantly when they click.
 *
 * ```tsx
 * const { prefetchDiocese } = usePrefetchChurches();
 *
 * <Tab onMouseEnter={() => prefetchDiocese('talibon')}>
 *   Talibon Diocese
 * </Tab>
 * ```
 */
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

// =============================================================================
// NOTIFICATION QUERIES - For the notification system
// =============================================================================

/**
 * Query Keys Factory for Notifications
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  user: (userId: string) => [...notificationKeys.all, 'user', userId] as const,
  unread: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
} as const;

/**
 * useUserNotifications - Fetch notifications for current user
 *
 * Used in the notification bell/dropdown in the header.
 * Auto-refreshes every 30 seconds to show new notifications.
 */
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

/**
 * useUnreadNotificationCount - Get just the count for badge display
 *
 * Separate hook for the badge number so we can refresh it
 * independently without refetching all notification content.
 */
export const useUnreadNotificationCount = (userProfile: UserProfile | null, enabled = true) => {
  return useQuery({
    queryKey: userProfile ? notificationKeys.unread(userProfile.uid) : ['notifications', 'unread', 'none'],
    queryFn: async () => {
      if (!userProfile) return 0;
      return notificationService.getUnreadCount(userProfile);
    },
    enabled: enabled && !!userProfile,
    staleTime: 30 * 1000, // 30 seconds - very fresh for badge
    gcTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
};

/**
 * useMarkNotificationAsRead - Mutation for marking notifications read
 */
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
 * useFirestoreSubscription - Safe real-time listener management
 *
 * Firestore's onSnapshot creates real-time listeners that must be
 * cleaned up when the component unmounts. This hook handles that
 * automatically.
 *
 * MEMORY LEAK PREVENTION:
 * Without proper cleanup, each component mount creates a new listener
 * but old listeners keep running → memory leak → performance issues
 *
 * @param subscribeCallback - Function that sets up the listener
 * @param dependencies - When these change, re-subscribe
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
 * useDebouncedValue - Delay value changes
 *
 * When user types in a search box, we don't want to query the database
 * on every keystroke. This hook waits until typing stops.
 *
 * EXAMPLE:
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 300);
 *
 * // debouncedSearch only updates 300ms after user stops typing
 * useQuery(['search', debouncedSearch], () => searchChurches(debouncedSearch));
 * ```
 *
 * @param value - The value to debounce
 * @param delay - Milliseconds to wait (default 300ms)
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
 * useInvalidateDioceseCache - Force refetch all data for a diocese
 *
 * Use after major updates when you want to ensure fresh data.
 *
 * ```tsx
 * const invalidateCache = useInvalidateDioceseCache();
 * // After bulk import...
 * invalidateCache('tagbilaran');
 * ```
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
 * useClearAllCache - Nuclear option: clear everything
 *
 * Use on logout or when something goes very wrong.
 */
export const useClearAllCache = () => {
  const queryClient = useQueryClient();
  
  return useCallback(() => {
    console.log('🧹 Clearing all query cache');
    queryClient.clear();
  }, [queryClient]);
};

/**
 * useGetCachedChurches - Read cache without triggering fetch
 *
 * Useful for checking if data is already available.
 *
 * ```tsx
 * const getCached = useGetCachedChurches();
 * const cached = getCached('tagbilaran');
 * if (cached) {
 *   // Data is in cache, no need to show loading
 * }
 * ```
 */
export const useGetCachedChurches = () => {
  const queryClient = useQueryClient();
  
  return useCallback((diocese: Diocese): Church[] | undefined => {
    return queryClient.getQueryData(churchKeys.diocese(diocese));
  }, [queryClient]);
};