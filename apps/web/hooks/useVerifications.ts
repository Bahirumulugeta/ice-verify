'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExtendedCreateVerificationParams } from '@/services/api';
import { api } from '@/services/api';

export function useVerifications(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  provider?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['verifications', params],
    queryFn: async () => {
      const result = await api.listVerifications(params);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useVerification(id: string) {
  return useQuery({
    queryKey: ['verification', id],
    queryFn: async () => {
      const result = await api.getVerification(id);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: ExtendedCreateVerificationParams & { idempotencyKey?: string }) => {
      const { idempotencyKey, ...body } = params;
      const result = await api.createVerification(body, idempotencyKey);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
    },
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: async () => {
      const result = await api.listProviders();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const result = await api.listApiKeys();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useWebhooks() {
  return useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const result = await api.listWebhooks();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const result = await api.getUsage();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const result = await api.listAuditLogs();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const result = await api.healthCheck();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    refetchInterval: 30_000,
  });
}

export function useProviderHealth() {
  return useQuery({
    queryKey: ['provider-health'],
    queryFn: async () => {
      const result = await api.providerHealth();
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    refetchInterval: 60_000,
  });
}
