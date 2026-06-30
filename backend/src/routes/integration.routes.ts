import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createIntegrationSchema,
  updateIntegrationSchema,
  startSyncSchema,
  integrationQuerySchema,
} from '../validators/integration.validator';

const router = Router();

router.use(authMiddleware);

router.get('/',
  requireModuleAccess('SETTINGS', 'read'),
  validateQuery(integrationQuerySchema),
  integrationController.getIntegrations
);

router.post('/',
  requireModuleAccess('SETTINGS', 'create'),
  validateBody(createIntegrationSchema),
  integrationController.createIntegration
);

router.get('/queue',
  requireModuleAccess('ADMIN', 'read'),
  integrationController.getQueueStatus
);

router.get('/:id',
  requireModuleAccess('SETTINGS', 'read'),
  integrationController.getIntegration
);

router.put('/:id',
  requireModuleAccess('SETTINGS', 'update'),
  validateBody(updateIntegrationSchema),
  integrationController.updateIntegration
);

router.delete('/:id',
  requireModuleAccess('SETTINGS', 'delete'),
  integrationController.deleteIntegration
);

router.post('/:id/test',
  requireModuleAccess('SETTINGS', 'update'),
  integrationController.testConnection
);

router.post('/:id/sync',
  requireModuleAccess('SETTINGS', 'update'),
  validateBody(startSyncSchema),
  integrationController.startSync
);

router.get('/:id/logs',
  requireModuleAccess('SETTINGS', 'read'),
  integrationController.getLogs
);

router.get('/:id/sync-history',
  requireModuleAccess('SETTINGS', 'read'),
  integrationController.getSyncHistory
);

export default router;
