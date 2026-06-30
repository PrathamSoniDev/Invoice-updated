import { Router } from 'express';
import { customerController } from '../controllers/customer.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';
import { createCustomerSchema, updateCustomerSchema, customerQuerySchema } from '../validators/customer.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

router.use(authMiddleware);
router.use(requireModuleAccess('CUSTOMERS', 'read'));

router.get(
  '/',
  validateQuery(customerQuerySchema),
  customerController.getMany.bind(customerController)
);

router.get(
  '/stats',
  customerController.getStats.bind(customerController)
);

router.get(
  '/search',
  customerController.search.bind(customerController)
);

router.get(
  '/:id',
  validateParams(idParamSchema),
  customerController.getById.bind(customerController)
);

router.post(
  '/',
  requireModuleAccess('CUSTOMERS', 'create'),
  validateBody(createCustomerSchema),
  customerController.create.bind(customerController)
);

router.patch(
  '/:id',
  requireModuleAccess('CUSTOMERS', 'update'),
  validateParams(idParamSchema),
  validateBody(updateCustomerSchema),
  customerController.update.bind(customerController)
);

router.delete(
  '/:id',
  requireModuleAccess('CUSTOMERS', 'delete'),
  validateParams(idParamSchema),
  customerController.delete.bind(customerController)
);

router.post(
  '/:id/restore',
  requireModuleAccess('CUSTOMERS', 'update'),
  validateParams(idParamSchema),
  customerController.restore.bind(customerController)
);

export default router;
