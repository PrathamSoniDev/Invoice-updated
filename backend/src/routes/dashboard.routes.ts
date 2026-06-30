import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireModuleAccess('DASHBOARD', 'read'));

router.get('/summary', dashboardController.getSummary.bind(dashboardController));

router.get('/charts/revenue', dashboardController.getRevenueTrend.bind(dashboardController));
router.get('/charts/invoices', dashboardController.getInvoiceTrend.bind(dashboardController));
router.get('/charts/customers', dashboardController.getCustomerGrowthTrend.bind(dashboardController));
router.get('/charts/payments', dashboardController.getPaymentTrend.bind(dashboardController));
router.get('/charts/collections', dashboardController.getCollectionTrend.bind(dashboardController));
router.get('/charts/outstanding', dashboardController.getOutstandingTrend.bind(dashboardController));
router.get('/charts/invoice-status', dashboardController.getInvoiceStatusDistribution.bind(dashboardController));
router.get('/charts/payment-gateways', dashboardController.getPaymentGatewayUsage.bind(dashboardController));
router.get('/charts', dashboardController.getChartData.bind(dashboardController));

router.get('/top-customers', dashboardController.getTopCustomers.bind(dashboardController));
router.get('/recent-activities', dashboardController.getRecentActivities.bind(dashboardController));

router.get('/comparison/monthly', dashboardController.getMonthlyComparison.bind(dashboardController));
router.get('/comparison/yearly', dashboardController.getYearlyComparison.bind(dashboardController));

router.post('/refresh', dashboardController.refreshDashboard.bind(dashboardController));

export default router;
