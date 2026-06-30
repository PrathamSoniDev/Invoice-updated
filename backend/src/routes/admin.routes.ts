import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createUserSchema,
  updateUserSchema,
  updateModuleSchema,
  updateModuleRoleSchema,
  userQuerySchema,
  auditLogQuerySchema,
  activityLogQuerySchema,
} from '../validators/admin.validator';

const router = Router();

router.use(authMiddleware);
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Users
router.get('/users', validateQuery(userQuerySchema), adminController.getUsers);
router.post('/users', validateBody(createUserSchema), adminController.createUser);
router.get('/users/stats', adminController.getUserStats);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', validateBody(updateUserSchema), adminController.updateUser);
router.post('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/activate', adminController.activateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/restore', adminController.restoreUser);

// Modules
router.get('/modules', adminController.getModules);
router.get('/modules/:id', adminController.getModule);
router.put('/modules/:id', validateBody(updateModuleSchema), adminController.updateModule);
router.put('/modules/:moduleId/roles', validateBody(updateModuleRoleSchema), adminController.updateModuleRole);

// Audit Logs
router.get('/audit-logs', validateQuery(auditLogQuerySchema), adminController.getAuditLogs);
router.get('/audit-logs/stats', adminController.getAuditLogStats);

// Activity Logs
router.get('/activity-logs', validateQuery(activityLogQuerySchema), adminController.getActivityLogs);

// API Usage
router.get('/api-usage', adminController.getApiUsageStats);

// Company Stats
router.get('/company-stats', adminController.getCompanyStats);

export default router;
