'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const result = await api.listPlans();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 60_000,
  });
}

export function useBillingPlan() {
  return useQuery({
    queryKey: ['billing-plan'],
    queryFn: async () => {
      const result = await api.getBillingPlan();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    retry: false,
  });
}

export function useSelectPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: 'starter' | 'growth' | 'enterprise') => {
      const result = await api.selectPlan(planId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-plan'] });
    },
  });
}
