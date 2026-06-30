import { Request, Response, NextFunction } from 'express';
import { invoiceService } from '../services/invoice.service';
import { success, created, paginated } from '../utils/response';

export class InvoiceController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const invoice = await invoiceService.create(companyId, req.body, userId);
      res.status(201).json(created(invoice));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const invoice = await invoiceService.getById(id, companyId);
      res.status(200).json(success(invoice));
    } catch (error) {
      next(error);
    }
  }

  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const result = await invoiceService.getMany(companyId, req.query as any);
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
      const invoice = await invoiceService.update(id, companyId, req.body, userId);
      res.status(200).json(success(invoice));
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
      const invoice = await invoiceService.delete(id, companyId, userId);
      res.status(200).json(success({ message: 'Invoice deleted successfully', id: invoice.id }));
    } catch (error) {
      next(error);
    }
  }

  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const invoice = await invoiceService.send(id, companyId, userId);
      res.status(200).json(success(invoice));
    } catch (error) {
      next(error);
    }
  }

  async markViewed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const invoice = await invoiceService.markAsViewed(id, companyId);
      res.status(200).json(success(invoice));
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const invoice = await invoiceService.cancel(id, companyId, userId);
      res.status(200).json(success(invoice));
    } catch (error) {
      next(error);
    }
  }

  async void(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const invoice = await invoiceService.markAsVoid(id, companyId, userId);
      res.status(200).json(success(invoice));
    } catch (error) {
      next(error);
    }
  }

  async duplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const invoice = await invoiceService.duplicate(id, companyId, userId);
      res.status(201).json(created(invoice));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const stats = await invoiceService.getStats(companyId);
      res.status(200).json(success(stats));
    } catch (error) {
      next(error);
    }
  }

  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const { amount } = req.body;
      const invoice = await invoiceService.recordPayment(id, companyId, amount, userId);
      res.status(200).json(success(invoice));
    } catch (error) {
      next(error);
    }
  }
}

export const invoiceController = new InvoiceController();
