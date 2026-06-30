import { Request, Response, NextFunction } from 'express';
import { customerService } from '../services/customer.service';
import { success, created, paginated } from '../utils/response';

export class CustomerController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const customer = await customerService.create(companyId, req.body, userId);
      res.status(201).json(created(customer));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const customer = await customerService.getById(id, companyId);
      res.status(200).json(success(customer));
    } catch (error) {
      next(error);
    }
  }

  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const result = await customerService.getMany(companyId, req.query as any);
      paginated(res, result.data, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const customer = await customerService.update(id, companyId, req.body, userId);
      res.status(200).json(success(customer));
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const customer = await customerService.delete(id, companyId, userId);
      res.status(200).json(success({ message: 'Customer deleted successfully', id: customer.id }));
    } catch (error) {
      next(error);
    }
  }

  async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const customer = await customerService.restore(id, companyId, userId);
      res.status(200).json(success(customer));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const stats = await customerService.getStats(companyId);
      res.status(200).json(success(stats));
    } catch (error) {
      next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { q, limit } = req.query;
      const customers = await customerService.search(companyId, String(q || ''), Number(limit) || 10);
      res.status(200).json(success(customers));
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
