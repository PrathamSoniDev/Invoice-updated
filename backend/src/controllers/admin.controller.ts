import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { AppError, ErrorCodes } from '../utils/error';

class AdminController {
  // Dashboard
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const dashboard = await adminService.getAdminDashboard(companyId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      next(error);
    }
  }

  // Users
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const result = await adminService.getUsers(companyId, {
        search: req.query.search as string,
        status: req.query.status as string,
        role: req.query.role as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const user = await adminService.getUser(id, companyId);
      if (!user) {
        throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const user = await adminService.createUser(companyId, userId, req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const user = await adminService.updateUser(id, companyId, userId, req.body);
      if (!user) {
        throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const user = await adminService.suspendUser(id, companyId, userId);
      if (!user) {
        throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async activateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const user = await adminService.activateUser(id, companyId, userId);
      if (!user) {
        throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      await adminService.deleteUser(id, companyId, userId);
      res.json({ success: true, data: { message: 'User deleted' } });
    } catch (error) {
      next(error);
    }
  }

  async restoreUser(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const user = await adminService.restoreUser(id, companyId, userId);
      if (!user) {
        throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getUserStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const stats = await adminService.getUserStats(companyId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // Modules
  async getModules(req: Request, res: Response, next: NextFunction) {
    try {
      const modules = await adminService.getModules();
      res.json({ success: true, data: modules });
    } catch (error) {
      next(error);
    }
  }

  async getModule(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const module = await adminService.getModule(id);
      if (!module) {
        throw new AppError('Module not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }

  async updateModule(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const module = await adminService.updateModule(id, userId, req.body);
      res.json({ success: true, data: module });
    } catch (error) {
      next(error);
    }
  }

  async updateModuleRole(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const moduleId = req.params.moduleId;
      if (!moduleId) throw new AppError('Module ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const { role, permissions } = req.body;
      const moduleRole = await adminService.updateModuleRole(moduleId, role, userId, permissions);
      res.json({ success: true, data: moduleRole });
    } catch (error) {
      next(error);
    }
  }

  // Audit Logs
  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await adminService.getAuditLogs(companyId, {
        search: req.query.search as string,
        action: req.query.action as string,
        module: req.query.module as string,
        userId: req.query.userId as string,
        startDate,
        endDate,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAuditLogStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const stats = await adminService.getAuditLogStats(companyId, startDate, endDate);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // Activity Logs
  async getActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await adminService.getActivityLogs(companyId, page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  // API Usage
  async getApiUsageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const stats = await adminService.getApiUsageStats(companyId, startDate, endDate);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  // Company Stats
  async getCompanyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const stats = await adminService.getCompanyStats(companyId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
