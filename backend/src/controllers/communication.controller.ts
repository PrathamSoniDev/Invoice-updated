import { Request, Response, NextFunction } from 'express';
import { communicationService } from '../services/communication.service';
import { AppError, ErrorCodes } from '../utils/error';

class CommunicationController {
  // Templates
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const templates = await communicationService.getTemplates(companyId);
      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  }

  async getTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const template = await communicationService.getTemplate(id, companyId);
      if (!template) {
        throw new AppError('Template not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const template = await communicationService.createTemplate(companyId, userId, req.body);
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const template = await communicationService.updateTemplate(id, companyId, userId, req.body);
      if (!template) {
        throw new AppError('Template not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      await communicationService.deleteTemplate(id, companyId, userId);
      res.json({ success: true, data: { message: 'Template deleted' } });
    } catch (error) {
      next(error);
    }
  }

  async setDefaultTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);

      const template = await communicationService.getTemplate(id, companyId);
      if (!template) {
        throw new AppError('Template not found', 404, ErrorCodes.NOT_FOUND);
      }

      const updated = await communicationService.setDefaultTemplate(id, companyId, userId, template.channel as any);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  // Logs
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const result = await communicationService.getLogs(companyId, {
        search: req.query.search as string,
        channel: req.query.channel as string,
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLog(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const log = await communicationService.getLog(id, companyId);
      if (!log) {
        throw new AppError('Communication log not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }

  // Send Communications
  async sendEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const result = await communicationService.sendEmail(companyId, userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async sendWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const result = await communicationService.sendWhatsApp(companyId, userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async sendInvoiceEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const invoiceId = req.params.invoiceId;
      if (!invoiceId) throw new AppError('Invoice ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const result = await communicationService.sendInvoiceEmail(companyId, userId, invoiceId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async sendPaymentReminderWhatsApp(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const invoiceId = req.params.invoiceId;
      if (!invoiceId) throw new AppError('Invoice ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const result = await communicationService.sendPaymentReminderWhatsApp(companyId, userId, invoiceId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // Stats
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const stats = await communicationService.getStats(companyId, startDate, endDate);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  async getQueueStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await communicationService.getQueueStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}

export const communicationController = new CommunicationController();
