import { Request, Response, NextFunction } from 'express';
import { integrationService } from '../services/integration.service';
import { AppError, ErrorCodes } from '../utils/error';

class IntegrationController {
  async getIntegrations(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const integrations = await integrationService.getIntegrations(companyId, {
        search: req.query.search as string,
        status: req.query.status as string,
        provider: req.query.provider as string,
      });
      res.json({ success: true, data: integrations });
    } catch (error) {
      next(error);
    }
  }

  async getIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const integration = await integrationService.getIntegration(id, companyId);
      if (!integration) {
        throw new AppError('Integration not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: integration });
    } catch (error) {
      next(error);
    }
  }

  async createIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const integration = await integrationService.createIntegration(companyId, userId, req.body);
      res.status(201).json({ success: true, data: integration });
    } catch (error) {
      next(error);
    }
  }

  async updateIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const integration = await integrationService.updateIntegration(id, companyId, userId, req.body);
      if (!integration) {
        throw new AppError('Integration not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: integration });
    } catch (error) {
      next(error);
    }
  }

  async deleteIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      await integrationService.deleteIntegration(id, companyId, userId);
      res.json({ success: true, data: { message: 'Integration deleted' } });
    } catch (error) {
      next(error);
    }
  }

  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const result = await integrationService.testConnection(id, companyId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async startSync(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const result = await integrationService.startSync(id, companyId, userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const result = await integrationService.getLogs(id, companyId, {
        level: req.query.level as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getSyncHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const result = await integrationService.getSyncHistory(id, companyId, {
        entityType: req.query.entityType as string,
        status: req.query.status as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getQueueStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await integrationService.getQueueStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }
}

export const integrationController = new IntegrationController();
