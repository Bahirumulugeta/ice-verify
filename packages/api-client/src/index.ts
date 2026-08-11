export interface IceVerificationOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export interface CreateVerificationParams {
  provider: string;
  reference: string;
  expectedAmount?: number;
  currency?: string;
  expectedReceiver?: string;
  metadata?: Record<string, unknown>;
  async?: boolean;
}

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
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: { requestId?: string };
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class IceVerification {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: IceVerificationOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'http://localhost:4000').replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  readonly verifications = {
    create: async (
      params: CreateVerificationParams,
      options?: { idempotencyKey?: string },
    ): Promise<ApiResponse<VerificationData>> => {
      return this.request<VerificationData>('/api/v1/verifications', {
        method: 'POST',
        body: params,
        idempotencyKey: options?.idempotencyKey,
      });
    },
    get: async (id: string): Promise<ApiResponse<VerificationData>> => {
      return this.request<VerificationData>(`/api/v1/verifications/${id}`, {
        method: 'GET',
      });
    },
  };

  readonly providers = {
    list: async (): Promise<ApiResponse<unknown>> => {
      return this.request('/api/v1/providers', { method: 'GET' });
    },
    get: async (provider: string): Promise<ApiResponse<unknown>> => {
      return this.request(`/api/v1/providers/${provider}`, { method: 'GET' });
    },
  };

  private async request<T>(
    path: string,
    options: {
      method: string;
      body?: unknown;
      idempotencyKey?: string;
    },
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const json = (await response.json()) as ApiResponse<T>;
    return json;
  }
}
