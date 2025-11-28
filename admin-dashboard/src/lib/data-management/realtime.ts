import { useEffect, useRef, useState, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
  doc,
} from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { queryKeys } from './queryClient';

// Types for real-time data
export interface RealtimeConfig {
  enabled?: boolean;
  throttle?: number;
  retryDelay?: number;
  maxRetries?: number;
}

export interface RealtimeListener {
  unsubscribe: () => void;
  isConnected: boolean;
  error: Error | null;
  lastUpdated: Date | null;
}

export interface RealtimeStats {
  pendingCount: number;
  reviewCount: number;
  approvedCount: number;
  revisionCount: number;
  totalCount: number;
  lastUpdated: Date;
}

// Base real-time hook
export function useRealtimeQuery<T>(
  queryKey: string[],
  collectionPath: string,
  queryConstraints: any[] = [],
  config: RealtimeConfig = {}
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const {
    enabled = true,
    throttle = 1000,
    retryDelay = 5000,
    maxRetries = 3,
  } = config;

  const startListener = useCallback(() => {
    if (!enabled || unsubscribeRef.current) return;

    try {
      const q = query(collection(db, collectionPath), ...queryConstraints);

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamps to JS dates
            createdAt: doc.data().createdAt?.toDate?.(),
            updatedAt: doc.data().updatedAt?.toDate?.(),
          }));

          // Update React Query cache
          queryClient.setQueryData(queryKey, data);
          
          setIsConnected(true);
          setError(null);
          setLastUpdated(new Date());
          retryCountRef.current = 0;
        },
        (err: Error) => {
          console.error('Firestore listener error:', err);
          setError(err);
          setIsConnected(false);

          // Retry logic
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            retryTimeoutRef.current = setTimeout(() => {
              unsubscribeRef.current?.();
              unsubscribeRef.current = null;
              startListener();
            }, retryDelay * retryCountRef.current);
          }
        }
      );

      unsubscribeRef.current = unsubscribe;
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
    }
  }, [queryKey, collectionPath, queryConstraints, enabled, queryClient, maxRetries, retryDelay]);

  const stopListener = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      startListener();
    }

    return stopListener;
  }, [enabled, startListener, stopListener]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListener();
    };
  }, [stopListener]);

  return {
    unsubscribe: stopListener,
    isConnected,
    error,
    lastUpdated,
    retryCount: retryCountRef.current,
  };
}

// Real-time church statistics
export function useRealtimeChurchStats(
  diocese?: string,
  config: RealtimeConfig = {}
) {
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const queryClient = useQueryClient();

  const constraints = [];
  if (diocese) {
    constraints.push(where('diocese', '==', diocese));
  }

  const listener = useRealtimeQuery(
    diocese ? queryKeys.churches.diocese(diocese) : queryKeys.churches.all(),
    'churches',
    constraints,
    config
  );

  useEffect(() => {
    const queryKey = diocese ? queryKeys.churches.diocese(diocese) : queryKeys.churches.all();
    
    // Subscribe to cache updates
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && 
          JSON.stringify(event.query.queryKey) === JSON.stringify(queryKey)) {
        
        const churches = event.query.state.data as any[];
        if (churches) {
          const newStats: RealtimeStats = {
            pendingCount: churches.filter(c => c.status === 'pending').length,
            reviewCount: churches.filter(c => c.status === 'heritage_review').length,
            approvedCount: churches.filter(c => c.status === 'approved').length,
            revisionCount: 0, // Deprecated - no longer using needs_revision status
            totalCount: churches.length,
            lastUpdated: new Date(),
          };
          
          setStats(newStats);
        }
      }
    });

    return unsubscribe;
  }, [diocese, queryClient]);

  return {
    ...listener,
    stats,
  };
}

// Real-time pending churches for review queue
export function useRealtimePendingChurches(
  diocese?: string,
  config: RealtimeConfig = {}
) {
  const constraints = [
    where('status', '==', 'pending'),
    orderBy('updatedAt', 'desc'),
    limit(20)
  ];

  if (diocese) {
    constraints.unshift(where('diocese', '==', diocese));
  }

  const queryKey = diocese 
    ? queryKeys.churches.dioceseStatus(diocese, ['pending'])
    : queryKeys.churches.status(['pending']);

  return useRealtimeQuery(
    queryKey,
    'churches',
    constraints,
    config
  );
}

// Real-time announcements
export function useRealtimeAnnouncements(
  diocese?: string,
  config: RealtimeConfig = {}
) {
  const constraints = [
    orderBy('publishedAt', 'desc'),
    limit(10)
  ];

  if (diocese) {
    constraints.unshift(where('diocese', '==', diocese));
  }

  const queryKey = diocese 
    ? queryKeys.announcements.diocese(diocese)
    : queryKeys.announcements.all();

  return useRealtimeQuery(
    queryKey,
    'announcements',
    constraints,
    config
  );
}

// Real-time feedback monitoring
export function useRealtimeFeedback(
  churchId?: string,
  config: RealtimeConfig = {}
) {
  const constraints = [
    orderBy('submittedAt', 'desc'),
    limit(50)
  ];

  if (churchId) {
    constraints.unshift(where('churchId', '==', churchId));
  }

  const queryKey = churchId 
    ? queryKeys.feedback.church(churchId)
    : queryKeys.feedback.all();

  return useRealtimeQuery(
    queryKey,
    'feedback',
    constraints,
    config
  );
}

// Real-time single document listener
export function useRealtimeDocument<T>(
  collection: string,
  documentId: string,
  config: RealtimeConfig = {}
) {
  const queryClient = useQueryClient();
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  const { enabled = true } = config;

  useEffect(() => {
    if (!enabled || !documentId) return;

    const docRef = doc(db, collection, documentId);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          const docData = {
            id: snapshot.id,
            ...snapshot.data(),
            createdAt: snapshot.data()?.createdAt?.toDate?.(),
            updatedAt: snapshot.data()?.updatedAt?.toDate?.(),
          } as T;

          setData(docData);
          setIsConnected(true);
          setError(null);
          setLastUpdated(new Date());

          // Update React Query cache
          const queryKey = [collection, documentId];
          queryClient.setQueryData(queryKey, docData);
        } else {
          setData(null);
        }
      },
      (err: Error) => {
        console.error(`Document listener error for ${collection}/${documentId}:`, err);
        setError(err);
        setIsConnected(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [collection, documentId, enabled, queryClient]);

  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    data,
    unsubscribe,
    isConnected,
    error,
    lastUpdated,
  };
}

// Real-time connection status hook
export function useFirestoreConnection() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection status on mount
    if (navigator.onLine) {
      setLastOnline(new Date());
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    lastOnline,
    isOffline: !isOnline,
  };
}

// Batch real-time listeners manager
export class RealtimeListenerManager {
  private listeners: Map<string, Unsubscribe> = new Map();
  private queryClient: any;

  constructor(queryClient: any) {
    this.queryClient = queryClient;
  }

  addListener(
    key: string,
    collectionPath: string,
    queryConstraints: any[] = [],
    queryKey: string[]
  ) {
    // Remove existing listener if it exists
    this.removeListener(key);

    const q = query(collection(db, collectionPath), ...queryConstraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.(),
        updatedAt: doc.data().updatedAt?.toDate?.(),
      }));

      this.queryClient.setQueryData(queryKey, data);
    });

    this.listeners.set(key, unsubscribe);
  }

  removeListener(key: string) {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  removeAllListeners() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  getActiveListeners() {
    return Array.from(this.listeners.keys());
  }
}

// Hook to use the batch listener manager
export function useRealtimeListenerManager() {
  const queryClient = useQueryClient();
  const managerRef = useRef<RealtimeListenerManager | null>(null);

  if (!managerRef.current) {
    managerRef.current = new RealtimeListenerManager(queryClient);
  }

  useEffect(() => {
    return () => {
      managerRef.current?.removeAllListeners();
    };
  }, []);

  return managerRef.current;
}

// Optimized real-time dashboard hook
export function useRealtimeDashboard(diocese: string) {
  const manager = useRealtimeListenerManager();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!diocese) return;

    // Add critical listeners
    manager.addListener(
      'church-stats',
      'churches',
      [where('diocese', '==', diocese)],
      queryKeys.churches.diocese(diocese)
    );

    manager.addListener(
      'pending-reviews',
      'churches',
      [
        where('diocese', '==', diocese),
        where('status', '==', 'pending'),
        orderBy('updatedAt', 'desc'),
        limit(10)
      ],
      queryKeys.churches.dioceseStatus(diocese, ['pending'])
    );

    manager.addListener(
      'recent-announcements',
      'announcements',
      [
        where('diocese', '==', diocese),
        orderBy('publishedAt', 'desc'),
        limit(5)
      ],
      queryKeys.announcements.diocese(diocese)
    );

    setIsInitialized(true);

    return () => {
      manager.removeAllListeners();
      setIsInitialized(false);
    };
  }, [diocese, manager]);

  return {
    isInitialized,
    activeListeners: manager.getActiveListeners(),
    manager,
  };
}

export default {
  useRealtimeQuery,
  useRealtimeChurchStats,
  useRealtimePendingChurches,
  useRealtimeAnnouncements,
  useRealtimeFeedback,
  useRealtimeDocument,
  useFirestoreConnection,
  useRealtimeListenerManager,
  useRealtimeDashboard,
  RealtimeListenerManager,
};