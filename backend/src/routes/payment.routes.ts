import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { paymentLinkController } from '../controllers/payment-link.controller';
import { paymentGatewayController } from '../controllers/payment-gateway.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';
import {
  createPaymentSchema,
  paymentQuerySchema,
  createPaymentLinkSchema,
  paymentLinkQuerySchema,
  razorpayCredentialsSchema,
  paytmCredentialsSchema,
} from '../validators/payment.validator';
import { idParamSchema } from '../validators/common.validator';

const router = Router();

// All payment routes require authentication
router.use(authMiddleware);

// Payment Gateway Settings
router.get('/gateway', requireModuleAccess('SETTINGS', 'read'), paymentGatewayController.getSettings.bind(paymentGatewayController));
router.post(
  '/gateway/razorpay',
  requireModuleAccess('SETTINGS', 'configure'),
  validateBody(razorpayCredentialsSchema),
  paymentGatewayController.saveRazorpay.bind(paymentGatewayController)
);
router.post(
  '/gateway/paytm',
  requireModuleAccess('SETTINGS', 'configure'),
  validateBody(paytmCredentialsSchema),
  paymentGatewayController.savePaytm.bind(paymentGatewayController)
);
router.post(
  '/gateway/razorpay/test',
  requireModuleAccess('SETTINGS', 'read'),
  paymentGatewayController.testRazorpay.bind(paymentGatewayController)
);
router.delete(
  '/gateway/:gateway',
  requireModuleAccess('SETTINGS', 'configure'),
  paymentGatewayController.disconnect.bind(paymentGatewayController)
);

// Payment Links
router.get(
  '/links',
  requireModuleAccess('PAYMENT_LINKS', 'read'),
  validateQuery(paymentLinkQuerySchema),
  paymentLinkController.getMany.bind(paymentLinkController)
);
router.get(
  '/links/stats',
  requireModuleAccess('PAYMENT_LINKS', 'read'),
  paymentLinkController.getStats.bind(paymentLinkController)
);
router.get(
  '/links/:id',
  requireModuleAccess('PAYMENT_LINKS', 'read'),
  validateParams(idParamSchema),
  paymentLinkController.getById.bind(paymentLinkController)
);
router.post(
  '/links',
  requireModuleAccess('PAYMENT_LINKS', 'create'),
  validateBody(createPaymentLinkSchema),
  paymentLinkController.create.bind(paymentLinkController)
);
router.post(
  '/links/:id/cancel',
  requireModuleAccess('PAYMENT_LINKS', 'update'),
  validateParams(idParamSchema),
  paymentLinkController.cancel.bind(paymentLinkController)
);

// Public route for payment link page (no auth required)
router.get('/public/:linkId', paymentLinkController.getByLinkId.bind(paymentLinkController));

// Payments
router.get(
  '/',
  requireModuleAccess('PAYMENT_LINKS', 'read'),
  validateQuery(paymentQuerySchema),
  paymentController.getMany.bind(paymentController)
);
router.get(
  '/stats',
  requireModuleAccess('PAYMENT_LINKS', 'read'),
  paymentController.getStats.bind(paymentController)
);
router.get(
  '/:id',
  requireModuleAccess('PAYMENT_LINKS', 'read'),
  validateParams(idParamSchema),
  paymentController.getById.bind(paymentController)
);
router.post(
  '/',
  requireModuleAccess('PAYMENT_LINKS', 'create'),
  validateBody(createPaymentSchema),
  paymentController.create.bind(paymentController)
);
router.post(
  '/:id/refund',
  requireModuleAccess('PAYMENT_LINKS', 'update'),
  validateParams(idParamSchema),
  paymentController.refund.bind(paymentController)
);

export default router;
