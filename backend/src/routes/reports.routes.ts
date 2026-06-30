import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireModuleAccess('REPORTS', 'read'));

// Revenue Reports
router.get('/revenue', reportsController.getRevenueReport.bind(reportsController));

// Invoice Reports
router.get('/invoices', reportsController.getInvoiceReport.bind(reportsController));
router.get('/invoices/aging', reportsController.getInvoiceAgingReport.bind(reportsController));

// Customer Reports
router.get('/customers/revenue', reportsController.getCustomerRevenueReport.bind(reportsController));
router.get('/customers/outstanding', reportsController.getOutstandingCustomersReport.bind(reportsController));
router.get('/customers/inactive', reportsController.getInactiveCustomersReport.bind(reportsController));

// Payment Reports
router.get('/payments', reportsController.getPaymentReport.bind(reportsController));

// Tax Reports
router.get('/tax', reportsController.getTaxReport.bind(reportsController));

// Gateway Reports
router.get('/gateways', reportsController.getGatewayReport.bind(reportsController));
router.get('/refunds', reportsController.getRefundReport.bind(reportsController));

// Financial Reports
router.get('/financial/monthly', reportsController.getMonthlyFinancialSummary.bind(reportsController));

// Saved Reports
router.get('/saved', reportsController.getSavedReports.bind(reportsController));
router.post('/saved', requireModuleAccess('REPORTS', 'create'), reportsController.saveReport.bind(reportsController));
router.delete('/saved/:id', requireModuleAccess('REPORTS', 'delete'), reportsController.deleteSavedReport.bind(reportsController));

export default router;
