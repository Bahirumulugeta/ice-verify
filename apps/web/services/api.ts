import type {
  ApiResponse,
  CreateVerificationParams,
} from '@ice/api-client';
import { API_BASE_URL, DEMO_API_KEY } from '@/lib/constants';

export type { ApiResponse, CreateVerificationParams };

export interface VerificationData {
  verificationId: string;
  status: string;
  verified: boolean;
  provider: string;
  reference: string;
  amount?: number;
  currency?: string;
  expectedAmount?: number;
  actualAmount?: number;
  expectedReceiver?: string;
  actualReceiver?: string;
  receiverMatched?: boolean;
  payment?: {
    amount?: number;
    currency?: string;
    sender?: string | null;
    receiver?: string | null;
    payerName?: string | null;
    creditedPartyName?: string | null;
    transactionDate?: string | null;
    providerStatus?: string | null;
    serviceFee?: string | null;
    totalPaidAmount?: string | null;
    bankName?: string | null;
  };
  risk?: {
    score: number;
    level: string;
    flags: Array<{ code: string; message: string; severity: string }>;
  };
  environment?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  claimed?: boolean;
  claimId?: string;
  message?: string;
}

export interface ExtendedCreateVerificationParams extends CreateVerificationParams {
  accountSuffix?: string;
  phoneNumber?: string;
  rejectIfClaimed?: boolean;
}

export interface ListVerificationsParams {
  limit?: number;
  offset?: number;
  status?: string;
  provider?: string;
  search?: string;
}

export interface PaginatedVerifications {
  items: VerificationData[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  environment: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  actorType: string;
  createdAt: string;
}

export interface ProviderSummary {
  name: string;
  displayName: string;
  integrationStatus: 'available' | 'pending' | 'disabled';
  capabilities?: Record<string, boolean>;
}

export interface UsageData {
  days: number;
  metrics: Record<string, number>;
  verificationStatus: Record<string, number>;
}

export interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  description?: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface PaymentClaimRecord {
  id: string;
  merchantId: string;
  provider: string;
  reference: string;
  verificationId?: string | null;
  externalOrderId?: string | null;
  status: 'CLAIMED' | 'RELEASED' | 'EXPIRED';
  claimedAt: string;
  releasedAt?: string | null;
}

export interface ClaimPaymentParams {
  provider: string;
  reference: string;
  verificationId?: string;
  externalOrderId?: string;
  metadata?: Record<string, unknown>;
}

export interface ClaimStatusData {
  provider: string;
  reference: string;
  claimed: boolean;
  claim: PaymentClaimRecord | null;
}

export interface PlanRecord {
  id: string;
  name: string;
  priceMonthlyUsd: number | null;
  verificationQuota: number | null;
  features: string[];
  highlighted?: boolean;
}

export interface BillingPlanData {
  subscription: {
    id: string;
    merchantId: string;
    planId: string;
    status: string;
    renewsAt: string | null;
  } | null;
  plan: PlanRecord;
}

export interface ImageVerificationData {
  extracted: {
    provider: string;
    reference: string;
    accountSuffix?: string;
    phoneNumber?: string;
  };
  verification?: VerificationData;
  file?: { name: string; size: number; mime: string };
}

class ApiClient {
  constructor(
    private readonly baseUrl: string = API_BASE_URL,
    private readonly apiKey: string = DEMO_API_KEY,
  ) {}

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      idempotencyKey?: string;
      auth?: boolean;
    } = {},
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (options.auth !== false) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        credentials: 'include',
      });

      return (await response.json()) as ApiResponse<T>;
    } catch {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the ICE Verification API. Is the server running?',
        },
      };
    }
  }

  login(email: string, password: string) {
    return this.request<{
      user: { id: string; email: string; name: string };
      merchant: { id: string; name: string; slug: string; role: string } | null;
      session: { type: string; cookie?: string; note?: string };
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    });
  }

  me() {
    return this.request<{
      authType: string;
      user?: { id: string; email: string; name: string | null; role: string };
      merchant: { id: string; name: string; role?: string; environment?: string };
    }>('/api/v1/auth/me');
  }

  logout() {
    return this.request<{ loggedOut: boolean }>('/api/v1/auth/logout', {
      method: 'POST',
      auth: false,
    });
  }

  createVerification(params: ExtendedCreateVerificationParams, idempotencyKey?: string) {
    return this.request<VerificationData>('/api/v1/verifications', {
      method: 'POST',
      body: params,
      idempotencyKey,
    });
  }

  getVerification(id: string) {
    return this.request<VerificationData>(`/api/v1/verifications/${id}`);
  }

  listVerifications(params: ListVerificationsParams = {}) {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', String(params.limit));
    if (params.offset) query.set('offset', String(params.offset));
    if (params.status) query.set('status', params.status);
    if (params.provider) query.set('provider', params.provider);
    if (params.search) query.set('search', params.search);
    const qs = query.toString();
    return this.request<PaginatedVerifications>(
      `/api/v1/verifications${qs ? `?${qs}` : ''}`,
    );
  }

  async verifyImage(formData: FormData): Promise<ApiResponse<ImageVerificationData>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/verifications/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
        },
        body: formData,
        credentials: 'include',
      });
      return (await response.json()) as ApiResponse<ImageVerificationData>;
    } catch {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the ICE Verification API. Is the server running?',
        },
      };
    }
  }

  claimPayment(params: ClaimPaymentParams) {
    return this.request<PaymentClaimRecord>('/api/v1/claims', {
      method: 'POST',
      body: params,
    });
  }

  listClaims() {
    return this.request<PaymentClaimRecord[]>('/api/v1/claims');
  }

  releaseClaim(claimId: string, reason?: string) {
    return this.request<PaymentClaimRecord>(`/api/v1/claims/${claimId}/release`, {
      method: 'POST',
      body: reason ? { reason } : {},
    });
  }

  getClaimStatus(provider: string, reference: string) {
    return this.request<ClaimStatusData>(
      `/api/v1/claims/${encodeURIComponent(provider)}/${encodeURIComponent(reference)}`,
    );
  }

  listPlans() {
    return this.request<PlanRecord[]>('/api/v1/plans', { auth: false });
  }

  getBillingPlan() {
    return this.request<BillingPlanData>('/api/v1/billing/plan');
  }

  selectPlan(planId: 'starter' | 'growth' | 'enterprise') {
    return this.request<{ id: string; planId: string; status: string }>('/api/v1/billing/plan', {
      method: 'POST',
      body: { planId },
    });
  }

  listProviders() {
    return this.request<ProviderSummary[]>('/api/v1/providers');
  }

  getProvider(name: string) {
    return this.request<ProviderSummary>(`/api/v1/providers/${name}`);
  }

  listApiKeys() {
    return this.request<ApiKeyRecord[]>('/api/v1/api-keys');
  }

  listWebhooks() {
    return this.request<WebhookRecord[]>('/api/v1/webhooks');
  }

  getUsage() {
    return this.request<UsageData>('/api/v1/usage');
  }

  listAuditLogs() {
    return this.request<AuditLogEntry[]>('/api/v1/audit-logs');
  }

  healthCheck() {
    return this.request<{ status: string; service: string; version: string }>(
      '/api/v1/health',
    );
  }

  providerHealth() {
    return this.request<
      Array<{ provider: string; healthy: boolean; latencyMs: number; message?: string }>
    >('/api/v1/health/providers');
  }
}

export const api = new ApiClient();
export { ApiClient };
