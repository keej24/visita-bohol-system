import { useState, useCallback, useMemo } from 'react';
import { 
  QueryClient, 
  useInfiniteQuery, 
  useQuery, 
  InfiniteData 
} from '@tanstack/react-query';
import { 
  collection, 
  query as firestoreQuery, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
  Query,
  CollectionReference
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { queryKeys } from './queryClient';

// Types for pagination
export interface PaginationConfig {
  pageSize: number;
  initialPageSize?: number;
  maxPages?: number;
  prefetchNextPage?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  totalCount?: number;
  currentPage: number;
  totalPages?: number;
}

export interface InfiniteScrollResult<T> {
  items: T[];
  hasNextPage: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}

export interface FirestorePaginationOptions {
  collection: string;
  orderByField?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Array<{
    field: string;
    operator: any;
    value: any;
  }>;
  pageSize?: number;
  transform?: (doc: QueryDocumentSnapshot<DocumentData>) => any;
}

// Firestore pagination utilities
export class FirestorePaginator<T = any> {
  private collection: CollectionReference;
  private queryConstraints: QueryConstraint[];
  private transform: (doc: QueryDocumentSnapshot<DocumentData>) => T;

  constructor(
    collectionName: string,
    options: Omit<FirestorePaginationOptions, 'collection'> = {}
  ) {
    this.collection = collection(db, collectionName);
    
    const {
      orderByField = 'createdAt',
      orderDirection = 'desc',
      filters = [],
      transform = (doc) => ({ id: doc.id, ...doc.data() } as T)
    } = options;

    this.transform = transform;

    // Build query constraints
    this.queryConstraints = [];

    // Add filters
    filters.forEach(({ field, operator, value }) => {
      this.queryConstraints.push(where(field, operator, value));
    });

    // Add ordering
    this.queryConstraints.push(orderBy(orderByField, orderDirection));
  }

  async getPage(pageSize: number, lastDoc?: QueryDocumentSnapshot<DocumentData>) {
    const constraints = [...this.queryConstraints, limit(pageSize)];
    
    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = firestoreQuery(this.collection, ...constraints);
    const snapshot = await getDocs(q);
    
    const items = snapshot.docs.map(this.transform);
    const hasNextPage = snapshot.docs.length === pageSize;
    const lastDocument = snapshot.docs[snapshot.docs.length - 1];

    return {
      items,
      hasNextPage,
      lastDocument,
      isEmpty: snapshot.empty,
    };
  }

  createInfiniteQueryKey(filters: Record<string, any> = {}) {
    return ['infinite', this.collection.path, filters];
  }
}

// Hook for infinite scrolling with Firestore
export function useFirestoreInfiniteQuery<T>(
  queryKey: string[],
  options: FirestorePaginationOptions,
  config: PaginationConfig = { pageSize: 20 }
): InfiniteScrollResult<T> {
  const paginator = useMemo(
    () => new FirestorePaginator<T>(options.collection, options),
    [options.collection, JSON.stringify(options)]
  );

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      return await paginator.getPage(
        config.pageSize,
        pageParam as QueryDocumentSnapshot<DocumentData>
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.hasNextPage ? lastPage.lastDocument : undefined;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const items = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || [];
  }, [data]);

  return {
    items,
    hasNextPage: Boolean(hasNextPage),
    isLoading,
    isLoadingMore: isFetchingNextPage,
    error: error as Error | null,
    fetchNextPage,
    isFetchingNextPage,
  };
}

// Hook for traditional page-based pagination
export function useFirestorePagination<T>(
  queryKey: string[],
  options: FirestorePaginationOptions,
  config: PaginationConfig = { pageSize: 20 }
): PaginatedResult<T> & {
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  refetch: () => void;
} {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCache, setPageCache] = useState<Map<number, {
    items: T[];
    lastDoc?: QueryDocumentSnapshot<DocumentData>;
    hasNextPage: boolean;
  }>>(new Map());

  const paginator = useMemo(
    () => new FirestorePaginator<T>(options.collection, options),
    [options.collection, JSON.stringify(options)]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, 'page', currentPage],
    queryFn: async () => {
      // Check cache first
      const cached = pageCache.get(currentPage);
      if (cached) {
        return cached;
      }

      // Get the last document from the previous page
      const prevPage = currentPage > 0 ? pageCache.get(currentPage - 1) : null;
      const lastDoc = prevPage?.lastDoc;

      const result = await paginator.getPage(config.pageSize, lastDoc);
      
      // Cache the result
      const newCache = new Map(pageCache);
      newCache.set(currentPage, result);
      setPageCache(newCache);

      return result;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const nextPage = useCallback(() => {
    if (data?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [data?.hasNextPage]);

  const previousPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    if (page >= 0) {
      setCurrentPage(page);
    }
  }, []);

  // Clear cache when refetching
  const handleRefetch = useCallback(() => {
    setPageCache(new Map());
    setCurrentPage(0);
    refetch();
  }, [refetch]);

  return {
    items: data?.items || [],
    hasNextPage: Boolean(data?.hasNextPage),
    hasPreviousPage: currentPage > 0,
    isLoading,
    isLoadingMore: false,
    error: error as Error | null,
    currentPage,
    totalPages: undefined, // Can't determine total pages with Firestore efficiently
    nextPage,
    previousPage,
    goToPage,
    refetch: handleRefetch,
  };
}

// Specialized hooks for each collection

// Churches pagination
export function useChurchesPagination(
  diocese?: string,
  statuses?: string[],
  config: PaginationConfig = { pageSize: 20 }
) {
  const filters = [];
  if (diocese) {
    filters.push({ field: 'diocese', operator: '==', value: diocese });
  }
  if (statuses && statuses.length > 0) {
    filters.push({ field: 'status', operator: 'in', value: statuses });
  }

  const queryKey = diocese 
    ? queryKeys.churches.dioceseStatus(diocese, statuses || [])
    : queryKeys.churches.status(statuses || []);

  return useFirestorePagination(
    queryKey,
    {
      collection: 'churches',
      orderByField: 'updatedAt',
      orderDirection: 'desc',
      filters,
      transform: (doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }),
    },
    config
  );
}

// Churches infinite scroll
export function useChurchesInfiniteScroll(
  diocese?: string,
  statuses?: string[],
  config: PaginationConfig = { pageSize: 20 }
) {
  const filters = [];
  if (diocese) {
    filters.push({ field: 'diocese', operator: '==', value: diocese });
  }
  if (statuses && statuses.length > 0) {
    filters.push({ field: 'status', operator: 'in', value: statuses });
  }

  const queryKey = ['infinite', 'churches', { diocese, statuses }];

  return useFirestoreInfiniteQuery(
    queryKey,
    {
      collection: 'churches',
      orderByField: 'updatedAt',
      orderDirection: 'desc',
      filters,
      transform: (doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }),
    },
    config
  );
}

// Announcements pagination
export function useAnnouncementsPagination(
  diocese?: string,
  scope?: string,
  config: PaginationConfig = { pageSize: 15 }
) {
  const filters = [];
  if (diocese) {
    filters.push({ field: 'diocese', operator: '==', value: diocese });
  }
  if (scope) {
    filters.push({ field: 'scope', operator: '==', value: scope });
  }

  const queryKey = diocese 
    ? queryKeys.announcements.diocese(diocese)
    : queryKeys.announcements.all();

  return useFirestorePagination(
    queryKey,
    {
      collection: 'announcements',
      orderByField: 'publishedAt',
      orderDirection: 'desc',
      filters,
      transform: (doc) => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
      }),
    },
    config
  );
}

// Feedback pagination
export function useFeedbackPagination(
  churchId?: string,
  config: PaginationConfig = { pageSize: 25 }
) {
  const filters = [];
  if (churchId) {
    filters.push({ field: 'churchId', operator: '==', value: churchId });
  }

  const queryKey = churchId 
    ? queryKeys.feedback.church(churchId)
    : queryKeys.feedback.all();

  return useFirestorePagination(
    queryKey,
    {
      collection: 'feedback',
      orderByField: 'submittedAt',
      orderDirection: 'desc',
      filters,
      transform: (doc) => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate(),
        visitedAt: doc.data().visitedAt?.toDate(),
      }),
    },
    config
  );
}

// Utility for prefetching next page
export const prefetchNextPage = async (
  queryClient: QueryClient,
  queryKey: string[],
  options: FirestorePaginationOptions,
  config: PaginationConfig = { pageSize: 20 }
) => {
  const paginator = new FirestorePaginator(options.collection, options);
  
  await queryClient.prefetchQuery({
    queryKey: [...queryKey, 'prefetch'],
    queryFn: () => paginator.getPage(config.pageSize),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Utility for search with pagination
export function useSearchPagination<T>(
  collectionName: string,
  searchFields: string[],
  searchQuery: string,
  config: PaginationConfig = { pageSize: 20 }
) {
  // Note: Firestore doesn't support full-text search natively
  // This is a basic implementation that filters after fetching
  // For production, consider using Algolia or ElasticSearch
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', collectionName, searchQuery, config.pageSize],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return { items: [], hasNextPage: false };
      }

      const q = firestoreQuery(
        collection(db, collectionName),
        orderBy('updatedAt', 'desc'),
        limit(config.pageSize * 3) // Fetch more to account for filtering
      );

      const snapshot = await getDocs(q);
      const allItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Client-side filtering (not ideal for large datasets)
      const filteredItems = allItems.filter(item =>
        searchFields.some(field =>
          item[field]?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      );

      return {
        items: filteredItems.slice(0, config.pageSize),
        hasNextPage: filteredItems.length > config.pageSize,
      };
    },
    enabled: Boolean(searchQuery.trim()),
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
  });

  return {
    items: data?.items || [],
    hasNextPage: Boolean(data?.hasNextPage),
    isLoading,
    error: error as Error | null,
  };
}

// Export all pagination utilities
export default {
  FirestorePaginator,
  useFirestoreInfiniteQuery,
  useFirestorePagination,
  useChurchesPagination,
  useChurchesInfiniteScroll,
  useAnnouncementsPagination,
  useFeedbackPagination,
  prefetchNextPage,
  useSearchPagination,
};