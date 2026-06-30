import { Router } from 'express';
import { communicationController } from '../controllers/communication.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';
import {
  createTemplateSchema,
  updateTemplateSchema,
  sendEmailSchema,
  sendWhatsAppSchema,
  logQuerySchema,
} from '../validators/communication.validator';

const router = Router();

router.use(authMiddleware);

// Templates
router.get('/templates', requireModuleAccess('EMAIL', 'read'), communicationController.getTemplates);
router.post('/templates', requireModuleAccess('EMAIL', 'create'), validateBody(createTemplateSchema), communicationController.createTemplate);
router.get('/templates/:id', requireModuleAccess('EMAIL', 'read'), communicationController.getTemplate);
router.put('/templates/:id', requireModuleAccess('EMAIL', 'update'), validateBody(updateTemplateSchema), communicationController.updateTemplate);
router.delete('/templates/:id', requireModuleAccess('EMAIL', 'delete'), communicationController.deleteTemplate);
router.post('/templates/:id/default', requireModuleAccess('EMAIL', 'update'), communicationController.setDefaultTemplate);

// Logs
router.get('/logs', requireModuleAccess('EMAIL', 'read'), validateQuery(logQuerySchema), communicationController.getLogs);
router.get('/logs/:id', requireModuleAccess('EMAIL', 'read'), communicationController.getLog);

// Send Communications
router.post('/send/email', requireModuleAccess('EMAIL', 'create'), validateBody(sendEmailSchema), communicationController.sendEmail);
router.post('/send/whatsapp', requireModuleAccess('WHATSAPP', 'create'), validateBody(sendWhatsAppSchema), communicationController.sendWhatsApp);
router.post('/send/invoice/:invoiceId/email', requireModuleAccess('EMAIL', 'create'), communicationController.sendInvoiceEmail);
router.post('/send/invoice/:invoiceId/whatsapp', requireModuleAccess('WHATSAPP', 'create'), communicationController.sendPaymentReminderWhatsApp);

// Stats
router.get('/stats', requireModuleAccess('EMAIL', 'read'), communicationController.getStats);
router.get('/queue/status', requireModuleAccess('ADMIN', 'read'), communicationController.getQueueStatus);

export default router;
