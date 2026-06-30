import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireModuleAccess('DASHBOARD', 'read'));

router.get('/revenue', analyticsController.getRevenueAnalytics.bind(analyticsController));
router.get('/invoices', analyticsController.getInvoiceAnalytics.bind(analyticsController));
router.get('/customers', analyticsController.getCustomerAnalytics.bind(analyticsController));
router.get('/payments', analyticsController.getPaymentAnalytics.bind(analyticsController));
router.get('/average-invoice', analyticsController.getAverageInvoiceValue.bind(analyticsController));
router.get('/collection-rate', analyticsController.getCollectionRate.bind(analyticsController));
router.get('/outstanding', analyticsController.getOutstandingAnalytics.bind(analyticsController));
router.get('/moving-average', analyticsController.getMovingAverage.bind(analyticsController));
router.get('/comparison', analyticsController.getPeriodComparison.bind(analyticsController));

export default router;
