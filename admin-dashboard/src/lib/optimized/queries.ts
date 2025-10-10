import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getChurchesByDiocese, 
  getChurchesByStatus,
  updateChurchStatus,
  type Church, 
  type ChurchStatus 
} from '@/lib/churches';
import type { Diocese } from '@/contexts/AuthContext';

// Query Keys Factory
export const churchKeys = {
  all: ['churches'] as const,
  diocese: (diocese: Diocese) => [...churchKeys.all, 'diocese', diocese] as const,
  status: (statuses: ChurchStatus[]) => [...churchKeys.all, 'status', ...statuses] as const,
  dioceseStatus: (diocese: Diocese, statuses: ChurchStatus[]) => 
    [...churchKeys.diocese(diocese), 'status', ...statuses] as const,
} as const;

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
  const pendingStatuses: ChurchStatus[] = ['pending', 'needs_revision', 'heritage_review'];
  
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
    const pendingStatuses: ChurchStatus[] = ['pending', 'needs_revision', 'heritage_review'];
    queryClient.prefetchQuery({
      queryKey: churchKeys.dioceseStatus(diocese, pendingStatuses),
      queryFn: () => getChurchesByDiocese(diocese, pendingStatuses),
      staleTime: 1 * 60 * 1000,
    });
  };
  
  return { prefetchDiocese, prefetchPending };
};