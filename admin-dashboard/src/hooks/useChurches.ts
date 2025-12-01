import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChurchService } from '@/services/churchService';
import type { Church, ChurchFilters, ChurchReviewAction, ChurchFormData } from '@/types/church';
import type { Diocese } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Hook for fetching churches with filters
export function useChurches(filters?: ChurchFilters) {
  return useQuery<Church[]>({
    queryKey: ['churches', filters],
    queryFn: () => ChurchService.getChurches(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook for real-time church subscription
export function useChurchesRealtime(filters?: ChurchFilters) {
  const [churches, setChurches] = useState<Church[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const unsubscribe = ChurchService.subscribeToChurches(
      (newChurches) => {
        setChurches(newChurches);
        setIsLoading(false);
      },
      filters
    );

    return unsubscribe;
  }, [filters]);

  return { churches, isLoading, error };
}

// Hook for single church
export function useChurch(id: string) {
  return useQuery<Church | null>({
    queryKey: ['church', id],
    queryFn: () => ChurchService.getChurch(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook for pending churches (for Chancery review)
export function usePendingChurches(diocese?: Diocese) {
  return useQuery<Church[]>({
    queryKey: ['churches', 'pending', diocese],
    queryFn: () => ChurchService.getPendingChurches(diocese),
    staleTime: 1 * 60 * 1000, // 1 minute for pending items
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

// Hook for church review actions
export function useChurchReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (action: ChurchReviewAction) => ChurchService.reviewChurch(action),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      queryClient.invalidateQueries({ queryKey: ['church', variables.churchId] });

      const actionMessages = {
        approve: 'Church approved successfully',
        forward_to_museum: 'Forwarded to Museum Researcher for heritage review',
      };

      toast({
        title: 'Review Completed',
        description: actionMessages[variables.action],
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Review Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook for creating/updating churches
export function useChurchMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: { formData: ChurchFormData; diocese: Diocese; userId: string }) =>
      ChurchService.createChurch(data.formData, data.diocese, data.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      toast({
        title: 'Church Created',
        description: 'Church submission has been sent for review',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Creation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; formData: ChurchFormData; diocese: Diocese; userId: string }) =>
      ChurchService.updateChurch(data.id, data.formData, data.diocese, data.userId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      queryClient.invalidateQueries({ queryKey: ['church', variables.id] });
      toast({
        title: 'Church Updated',
        description: 'Church information has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
  };
}

// Hook for church unpublishing (soft delete - changes status to draft)
export function useDeleteChurch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => ChurchService.deleteChurch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churches'] });
      toast({
        title: 'Church Unpublished',
        description: 'Church has been hidden from the mobile app and can be republished later.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Unpublish Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}