import { Router } from 'express';
import { templateController } from '../controllers/template.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateQuerySchema,
  userAssignmentSchema,
} from '../validators/template.validator';

const router = Router();

router.use(authMiddleware);

// Templates
router.get('/',
  requireModuleAccess('SETTINGS', 'read'),
  validateQuery(templateQuerySchema),
  templateController.getTemplates
);

router.get('/default',
  requireModuleAccess('SETTINGS', 'read'),
  templateController.getDefaultTemplate
);

router.get('/stats',
  requireModuleAccess('SETTINGS', 'read'),
  templateController.getStats
);

router.post('/',
  requireModuleAccess('SETTINGS', 'create'),
  validateBody(createTemplateSchema),
  templateController.createTemplate
);

router.get('/:id',
  requireModuleAccess('SETTINGS', 'read'),
  templateController.getTemplate
);

router.put('/:id',
  requireModuleAccess('SETTINGS', 'update'),
  validateBody(updateTemplateSchema),
  templateController.updateTemplate
);

router.delete('/:id',
  requireModuleAccess('SETTINGS', 'delete'),
  templateController.deleteTemplate
);

router.post('/:id/default',
  requireModuleAccess('SETTINGS', 'update'),
  templateController.setAsDefault
);

router.post('/:id/activate',
  requireModuleAccess('SETTINGS', 'update'),
  templateController.activateTemplate
);

router.post('/:id/deactivate',
  requireModuleAccess('SETTINGS', 'update'),
  templateController.deactivateTemplate
);

// Template Versions
router.get('/:id/versions',
  requireModuleAccess('SETTINGS', 'read'),
  templateController.getVersions
);

router.post('/:id/versions/:versionId/rollback',
  requireModuleAccess('SETTINGS', 'update'),
  templateController.rollbackToVersion
);

// Preview
router.get('/:id/preview',
  requireModuleAccess('SETTINGS', 'read'),
  templateController.previewTemplate
);

// User Assignments
router.get('/assignments',
  requireModuleAccess('ADMIN', 'read'),
  templateController.getUserAssignments
);

router.get('/assignments/:userId',
  requireModuleAccess('ADMIN', 'read'),
  templateController.getUserAssignment
);

router.post('/assignments',
  requireModuleAccess('ADMIN', 'update'),
  validateBody(userAssignmentSchema),
  templateController.setUserTemplate
);

// Current user's template
router.get('/my',
  templateController.getMyTemplate
);

export default router;
