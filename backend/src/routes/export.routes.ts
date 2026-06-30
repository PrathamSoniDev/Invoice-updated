import { Router } from 'express';
import { exportController } from '../controllers/export.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireModuleAccess } from '../middleware/module.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireModuleAccess('REPORTS', 'export'));

router.post('/', exportController.createExport.bind(exportController));
router.get('/history', exportController.getExportHistory.bind(exportController));
router.get('/:id', exportController.getExportStatus.bind(exportController));
router.get('/:id/download', exportController.downloadExport.bind(exportController));

export default router;
