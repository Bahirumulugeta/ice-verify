export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ICE Verification API',
    version: '1.0.0',
    description:
      'Provider-agnostic payment verification API for Ethiopia and beyond. Verify by reference, claim/consume payments to prevent reuse across systems, upload receipt images, and manage billing plans.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Use ice_test_... or ice_live_... API keys',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'ice_session',
        description: 'Dashboard session cookie from POST /auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'PAYMENT_ALREADY_CLAIMED' },
              message: { type: 'string' },
              requestId: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      CreateVerification: {
        type: 'object',
        required: ['reference'],
        properties: {
          provider: {
            type: 'string',
            example: 'telebirr',
            description: 'Optional when reference uniquely identifies the provider',
          },
          reference: { type: 'string', example: 'CJU5RZ5NM3' },
          accountSuffix: {
            type: 'string',
            example: '12345678',
            description: 'CBE: 8 digits, BOA: 5 digits',
          },
          phoneNumber: {
            type: 'string',
            example: '0912345678',
            description: 'Required for CBE Birr',
          },
          expectedAmount: { type: 'number', example: 1500 },
          currency: { type: 'string', example: 'ETB' },
          expectedReceiver: { type: 'string', example: '0912345678' },
          async: { type: 'boolean', default: false },
          rejectIfClaimed: {
            type: 'boolean',
            default: true,
            description: 'Fail with 409 if another merchant already claimed this payment',
          },
          autoClaim: {
            type: 'boolean',
            default: false,
            description: 'After a successful verify, claim/consume the payment for this merchant',
          },
          metadata: { type: 'object' },
        },
      },
      ClaimPayment: {
        type: 'object',
        required: ['provider', 'reference'],
        properties: {
          provider: { type: 'string', example: 'demo' },
          reference: { type: 'string', example: 'DEMO-VALID-001' },
          verificationId: { type: 'string' },
          externalOrderId: {
            type: 'string',
            description: 'Your order/invoice id in an external system',
          },
          metadata: { type: 'object' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/providers': {
      get: {
        summary: 'List providers',
        security: [],
        responses: { '200': { description: 'Provider list' } },
      },
    },
    '/plans': {
      get: {
        summary: 'List pricing plans',
        security: [],
        responses: { '200': { description: 'Plan catalog' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Dashboard login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Session cookie set' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current session user',
        responses: { '200': { description: 'User + merchant' } },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Clear session cookie',
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/verifications': {
      post: {
        summary: 'Create verification',
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateVerification' },
            },
          },
        },
        responses: {
          '200': { description: 'Verification result' },
          '409': {
            description: 'Payment already claimed or idempotency conflict',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      get: {
        summary: 'List verifications',
        responses: { '200': { description: 'Verification list' } },
      },
    },
    '/verifications/{id}': {
      get: {
        summary: 'Get verification',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Verification details' } },
      },
    },
    '/verifications/batch': {
      post: {
        summary: 'Batch verify payments',
        responses: { '200': { description: 'Batch results' } },
      },
    },
    '/verifications/image': {
      post: {
        summary: 'Verify from receipt image upload',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'reference'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  provider: { type: 'string' },
                  reference: { type: 'string' },
                  accountSuffix: { type: 'string' },
                  phoneNumber: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Extracted fields + verification' } },
      },
    },
    '/claims': {
      get: {
        summary: 'List payment claims for merchant',
        responses: { '200': { description: 'Claims' } },
      },
      post: {
        summary: 'Claim/consume a verified payment',
        description:
          'Marks a payment as consumed so other merchants/systems cannot reuse it. Requires a successful verification by the claiming merchant.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ClaimPayment' },
            },
          },
        },
        responses: {
          '201': { description: 'Claim created' },
          '409': { description: 'Already claimed' },
        },
      },
    },
    '/claims/{provider}/{reference}': {
      get: {
        summary: 'Check if a payment is already claimed',
        parameters: [
          { name: 'provider', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'reference', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Claim status' } },
      },
    },
    '/claims/{id}/release': {
      post: {
        summary: 'Release a claim (refunds / cancellations)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Claim released' } },
      },
    },
    '/billing/plan': {
      get: {
        summary: 'Current merchant plan',
        responses: { '200': { description: 'Subscription + plan' } },
      },
      post: {
        summary: 'Select / change plan',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['planId'],
                properties: {
                  planId: { type: 'string', enum: ['starter', 'growth', 'enterprise'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated subscription' } },
      },
    },
    '/api-keys': {
      get: { summary: 'List API keys', responses: { '200': { description: 'Keys' } } },
      post: { summary: 'Create API key', responses: { '201': { description: 'Created key' } } },
    },
    '/webhooks': {
      get: { summary: 'List webhooks', responses: { '200': { description: 'Webhooks' } } },
      post: { summary: 'Create webhook', responses: { '201': { description: 'Created' } } },
    },
    '/usage': {
      get: { summary: 'Usage metrics', responses: { '200': { description: 'Usage' } } },
    },
  },
} as const;
