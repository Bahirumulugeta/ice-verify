'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClaimPaymentParams } from '@/services/api';
import { api } from '@/services/api';

export function useClaims() {
  return useQuery({
    queryKey: ['claims'],
    queryFn: async () => {
      const result = await api.listClaims();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useClaimPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: ClaimPaymentParams) => {
      const result = await api.claimPayment(params);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
}

export function useReleaseClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ claimId, reason }: { claimId: string; reason?: string }) => {
      const result = await api.releaseClaim(claimId, reason);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
    },
  });
}

export function useClaimStatus(provider: string, reference: string, enabled = false) {
  return useQuery({
    queryKey: ['claim-status', provider, reference],
    queryFn: async () => {
      const result = await api.getClaimStatus(provider, reference);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: enabled && Boolean(provider && reference),
  });
}
