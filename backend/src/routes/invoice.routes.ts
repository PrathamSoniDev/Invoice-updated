import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';
import { createInvoiceSchema, updateInvoiceSchema, invoiceQuerySchema } from '../validators/invoice.validator';
import { idParamSchema } from '../validators/common.validator';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);
router.use(requireModuleAccess('INVOICES', 'read'));

router.get(
  '/',
  validateQuery(invoiceQuerySchema),
  invoiceController.getMany.bind(invoiceController)
);

router.get(
  '/stats',
  invoiceController.getStats.bind(invoiceController)
);

router.get(
  '/:id',
  validateParams(idParamSchema),
  invoiceController.getById.bind(invoiceController)
);

router.post(
  '/',
  requireModuleAccess('INVOICES', 'create'),
  validateBody(createInvoiceSchema),
  invoiceController.create.bind(invoiceController)
);

router.patch(
  '/:id',
  requireModuleAccess('INVOICES', 'update'),
  validateParams(idParamSchema),
  validateBody(updateInvoiceSchema),
  invoiceController.update.bind(invoiceController)
);

router.delete(
  '/:id',
  requireModuleAccess('INVOICES', 'delete'),
  validateParams(idParamSchema),
  invoiceController.delete.bind(invoiceController)
);

router.post(
  '/:id/send',
  requireModuleAccess('INVOICES', 'update'),
  validateParams(idParamSchema),
  invoiceController.send.bind(invoiceController)
);

router.post(
  '/:id/viewed',
  validateParams(idParamSchema),
  invoiceController.markViewed.bind(invoiceController)
);

router.post(
  '/:id/cancel',
  requireModuleAccess('INVOICES', 'update'),
  validateParams(idParamSchema),
  invoiceController.cancel.bind(invoiceController)
);

router.post(
  '/:id/void',
  requireModuleAccess('INVOICES', 'update'),
  validateParams(idParamSchema),
  invoiceController.void.bind(invoiceController)
);

router.post(
  '/:id/duplicate',
  requireModuleAccess('INVOICES', 'create'),
  validateParams(idParamSchema),
  invoiceController.duplicate.bind(invoiceController)
);

router.post(
  '/:id/payment',
  requireModuleAccess('PAYMENT_LINKS', 'create'),
  validateParams(idParamSchema),
  validateBody(z.object({ amount: z.number().positive() })),
  invoiceController.recordPayment.bind(invoiceController)
);

export default router;
