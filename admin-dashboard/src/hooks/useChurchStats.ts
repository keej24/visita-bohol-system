import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChurchService } from '@/services/churchService';
import { ParishService } from '@/services/parishService';
import type { Church, ChurchStatus } from '@/types/church';
import type { Diocese } from '@/contexts/AuthContext';

interface ChurchStats {
  totalChurches: number;
  totalParishes: number;
  activeUsers: number;
  heritageCount: number;
  pendingCount: number;
  approvedCount: number;
  churchesByStatus: Record<ChurchStatus, Church[]>;
  isLoading: boolean;
  error: Error | null;
}

export function useChurchStats(diocese: Diocese): ChurchStats {
  const { data: churches, isLoading: churchesLoading, error: churchesError } = useQuery<Church[]>({
    queryKey: ['churches', diocese],
    queryFn: () => ChurchService.getChurchesForDiocese(diocese),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for permission errors
      if (failureCount >= 3) return false;
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return false;
      }
      return true;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const { data: parishCount, isLoading: parishesLoading, error: parishesError } = useQuery<number>({
    queryKey: ['parishes', diocese, 'count'],
    queryFn: () => ParishService.getParishCountForDiocese(diocese),
    staleTime: 10 * 60 * 1000, // 10 minutes (parishes change less frequently)
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return false;
      }
      return true;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const { data: activeUsersCount, isLoading: activeUsersLoading, error: activeUsersError } = useQuery<number>({
    queryKey: ['activeUsers', diocese, 'count'],
    queryFn: () => ParishService.getActiveUsersCountForDiocese(diocese),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      const errorMessage = error?.message?.toLowerCase() || '';
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        return false;
      }
      return true;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  const stats = useMemo(() => {
    if (!churches) {
      return {
        totalChurches: 0,
        totalParishes: parishCount || 0,
        activeUsers: activeUsersCount || 0,
        heritageCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        churchesByStatus: {} as Record<ChurchStatus, Church[]>,
      };
    }

    const churchesByStatus = churches.reduce((acc, church) => {
      const status = church.status;
      if (!acc[status]) acc[status] = [];
      acc[status].push(church);
      return acc;
    }, {} as Record<ChurchStatus, Church[]>);

    const heritageCount = churches.filter(
      (c) => c.classification === 'ICP' || c.classification === 'NCT'
    ).length;

    const pendingStatuses: ChurchStatus[] = ['pending', 'heritage_review'];
    const pendingCount = churches.filter((c) =>
      pendingStatuses.includes(c.status)
    ).length;

    const approvedCount = churches.filter((c) => c.status === 'approved').length;

    return {
      totalChurches: churches.length,
      totalParishes: parishCount || 0,
      activeUsers: activeUsersCount || 0,
      heritageCount,
      pendingCount,
      approvedCount,
      churchesByStatus,
    };
  }, [churches, parishCount, activeUsersCount]);

  return {
    ...stats,
    isLoading: churchesLoading || parishesLoading || activeUsersLoading,
    error: churchesError || parishesError || activeUsersError,
  };
}