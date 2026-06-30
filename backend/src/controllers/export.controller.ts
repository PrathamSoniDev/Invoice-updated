import { Request, Response, NextFunction } from 'express';
import { exportService, ExportFormat } from '../services/export.service';
import { success, created } from '../utils/response';
import fs from 'fs';
import path from 'path';

export class ExportController {
  async createExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { reportType, format, startDate, endDate, filters } = req.body;

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      } : undefined;

      const result = await exportService.queueExport(
        companyId,
        userId,
        reportType,
        format as ExportFormat,
        dateRange,
        filters
      );

      res.status(202).json(created(result));
    } catch (error) {
      next(error);
    }
  }

  async getExportStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('Export ID is required');

      const status = await exportService.getExportStatus(companyId, id);
      if (!status) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }

      res.status(200).json(success(status));
    } catch (error) {
      next(error);
    }
  }

  async getExportHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { limit = '20' } = req.query;

      const history = await exportService.getExportHistory(companyId, parseInt(limit as string, 10));
      res.status(200).json(success(history));
    } catch (error) {
      next(error);
    }
  }

  async downloadExport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('Export ID is required');

      const download = await exportService.downloadExport(companyId, id);
      if (!download) {
        res.status(404).json({ error: 'Export not found or file expired' });
        return;
      }

      res.setHeader('Content-Type', download.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${download.fileName}"`);

      const fileStream = fs.createReadStream(download.filePath);
      fileStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

export const exportController = new ExportController();
