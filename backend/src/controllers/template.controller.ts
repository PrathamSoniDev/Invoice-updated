import { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/template.service';
import { AppError, ErrorCodes } from '../utils/error';

class TemplateController {
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const templates = await templateService.getTemplates(companyId, {
        search: req.query.search as string,
        status: req.query.status as string,
        type: req.query.type as string,
      });
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
      const template = await templateService.getTemplate(id, companyId);
      if (!template) {
        throw new AppError('Template not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async getDefaultTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const template = await templateService.getDefaultTemplate(companyId);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const template = await templateService.createTemplate(companyId, userId, req.body);
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
      const template = await templateService.updateTemplate(id, companyId, userId, req.body);
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
      await templateService.deleteTemplate(id, companyId, userId);
      res.json({ success: true, data: { message: 'Template deleted' } });
    } catch (error) {
      next(error);
    }
  }

  async setAsDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const template = await templateService.setAsDefault(id, companyId, userId);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async activateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const template = await templateService.activateTemplate(id, companyId, userId);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async deactivateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const template = await templateService.deactivateTemplate(id, companyId, userId);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async getVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const versions = await templateService.getVersions(id, companyId);
      res.json({ success: true, data: versions });
    } catch (error) {
      next(error);
    }
  }

  async rollbackToVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      const versionId = req.params.versionId;
      if (!id) throw new AppError('Template ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      if (!versionId) throw new AppError('Version ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const template = await templateService.rollbackToVersion(id, versionId, companyId, userId);
      res.json({ success: true, data: template });
    } catch (error) {
      next(error);
    }
  }

  async previewTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const preview = await templateService.previewTemplate(id, companyId);
      res.json({ success: true, data: preview });
    } catch (error) {
      next(error);
    }
  }

  // User Assignments
  async getUserAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const assignments = await templateService.getUserAssignments(companyId);
      res.json({ success: true, data: assignments });
    } catch (error) {
      next(error);
    }
  }

  async getUserAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const targetUserId = req.params.userId;
      if (!targetUserId) throw new AppError('User ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const assignment = await templateService.getUserAssignment(targetUserId, companyId);
      res.json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  async setUserTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const { targetUserId, templateId } = req.body;
      const assignment = await templateService.setUserTemplate(companyId, userId, targetUserId, templateId);
      res.json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  async getMyTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const assignment = await templateService.getUserAssignment(userId, companyId);
      res.json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }

  // Stats
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const stats = await templateService.getStats(companyId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const templateController = new TemplateController();
