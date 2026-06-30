import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';
import { validateBody } from '../middleware/validation.middleware';
import {
  updateCompanyProfileSchema,
  updateCompanySettingsSchema,
  upsertBankInfoSchema,
  updateInvoiceSettingsSchema,
  updateCommunicationSettingsSchema,
  updateUserSettingsSchema,
  createTaxConfigurationSchema,
  updateTaxConfigurationSchema,
} from '../validators/settings.validator';

const router = Router();

router.use(authMiddleware);

// Company Profile
router.get('/profile', requireModuleAccess('SETTINGS', 'read'), settingsController.getCompanyProfile);
router.put('/profile', requireModuleAccess('SETTINGS', 'update'), validateBody(updateCompanyProfileSchema), settingsController.updateCompanyProfile);

// Company General Settings
router.get('/company', requireModuleAccess('SETTINGS', 'read'), settingsController.getCompanySettings);
router.put('/company', requireModuleAccess('SETTINGS', 'update'), validateBody(updateCompanySettingsSchema), settingsController.updateCompanySettings);

// Bank Info
router.get('/bank', requireModuleAccess('SETTINGS', 'read'), settingsController.getBankInfo);
router.put('/bank', requireModuleAccess('SETTINGS', 'update'), validateBody(upsertBankInfoSchema), settingsController.upsertBankInfo);
router.delete('/bank', requireModuleAccess('SETTINGS', 'delete'), settingsController.deleteBankInfo);

// Invoice Settings
router.get('/invoice', requireModuleAccess('SETTINGS', 'read'), settingsController.getInvoiceSettings);
router.put('/invoice', requireModuleAccess('SETTINGS', 'update'), validateBody(updateInvoiceSettingsSchema), settingsController.updateInvoiceSettings);

// Communication Settings
router.get('/communication', requireModuleAccess('SETTINGS', 'read'), settingsController.getCommunicationSettings);
router.put('/communication', requireModuleAccess('SETTINGS', 'update'), validateBody(updateCommunicationSettingsSchema), settingsController.updateCommunicationSettings);

// Gateway Settings
router.get('/gateway', requireModuleAccess('SETTINGS', 'read'), settingsController.getGatewaySettings);

// Tax Configurations
router.get('/tax', requireModuleAccess('SETTINGS', 'read'), settingsController.getTaxConfigurations);
router.post('/tax', requireModuleAccess('SETTINGS', 'create'), validateBody(createTaxConfigurationSchema), settingsController.createTaxConfiguration);
router.get('/tax/:id', requireModuleAccess('SETTINGS', 'read'), settingsController.getTaxConfiguration);
router.put('/tax/:id', requireModuleAccess('SETTINGS', 'update'), validateBody(updateTaxConfigurationSchema), settingsController.updateTaxConfiguration);
router.delete('/tax/:id', requireModuleAccess('SETTINGS', 'delete'), settingsController.deleteTaxConfiguration);

// User Settings
router.get('/user', settingsController.getUserSettings);
router.put('/user', validateBody(updateUserSettingsSchema), settingsController.updateUserSettings);

// Complete Settings Bundle
router.get('/complete', requireModuleAccess('SETTINGS', 'read'), settingsController.getCompleteSettings);

export default router;
