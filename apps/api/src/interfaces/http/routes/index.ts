import { Router } from 'express';
import multer from 'multer';
import type { AppContainer } from '../../../container.js';
import { apiKeyAuth, requireRoles } from '../middleware/auth.js';
import { createVerificationController } from '../controllers/verification-controller.js';
import {
  createApiKeysController,
  createAuditController,
  createAuthController,
  createHealthController,
  createProvidersController,
  createUsageController,
  createWebhooksController,
} from '../controllers/misc-controllers.js';
import { createClaimsController } from '../controllers/claims-controller.js';
import { createPlansController } from '../controllers/plans-controller.js';
import { createImageController } from '../controllers/image-controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, WebP, or PDF uploads are allowed'));
  },
});

export function createApiRouter(container: AppContainer): Router {
  const router = Router();
  const auth = apiKeyAuth(container.prisma, container.cache, container.config);
  const admin = requireRoles('OWNER', 'ADMIN');

  const verifications = createVerificationController(container);
  const providers = createProvidersController(container);
  const health = createHealthController(container);
  const apiKeys = createApiKeysController(container);
  const webhooks = createWebhooksController(container);
  const usage = createUsageController(container);
  const authController = createAuthController(container);
  const audit = createAuditController(container);
  const claims = createClaimsController(container);
  const plans = createPlansController(container);
  const images = createImageController(container);

  router.get('/health', health.root);
  router.get('/health/live', health.live);
  router.get('/health/ready', health.ready);
  router.get('/health/providers', health.providers);

  router.get('/providers', providers.list);
  router.get('/providers/:provider', providers.get);
  router.get('/providers/:provider/capabilities', providers.capabilities);

  router.get('/plans', plans.list);
  router.post('/auth/login', authController.login);
  router.post('/auth/logout', authController.logout);
  router.get('/auth/me', auth, authController.me);

  router.post('/verifications', auth, verifications.create);
  router.get('/verifications', auth, verifications.list);
  router.get('/verifications/:id', auth, verifications.get);
  router.post('/verifications/batch', auth, verifications.batch);
  router.post('/verifications/parse', auth, verifications.parse);
  router.post('/verifications/image', auth, upload.single('file'), images.verify);

  router.get('/claims', auth, claims.list);
  router.post('/claims', auth, claims.claim);
  router.get('/claims/:provider/:reference', auth, claims.status);
  router.post('/claims/:id/release', auth, admin, claims.release);

  router.get('/billing/plan', auth, plans.current);
  router.post('/billing/plan', auth, admin, plans.select);

  router.get('/api-keys', auth, admin, apiKeys.list);
  router.post('/api-keys', auth, admin, apiKeys.create);
  router.delete('/api-keys/:id', auth, admin, apiKeys.revoke);

  router.get('/webhooks', auth, webhooks.list);
  router.post('/webhooks', auth, admin, webhooks.create);
  router.delete('/webhooks/:id', auth, admin, webhooks.delete);
  router.post('/webhooks/:id/test', auth, admin, webhooks.test);
  router.post('/webhooks/:id/retry', auth, admin, webhooks.retry);

  router.get('/usage', auth, usage.get);
  router.get('/audit-logs', auth, admin, audit.list);

  return router;
}
