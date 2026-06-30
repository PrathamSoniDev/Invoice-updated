import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { success, created, paginated } from '../utils/response';

export class PaymentController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const payment = await paymentService.recordPayment({
        companyId,
        ...req.body,
        userId,
      });
      res.status(201).json(created(payment));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const payment = await paymentService.getById(id, companyId);
      res.status(200).json(success(payment));
    } catch (error) {
      next(error);
    }
  }

  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const result = await paymentService.getMany(companyId, req.query as any);
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

  async refund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const payment = await paymentService.refund(id, companyId, userId);
      res.status(200).json(success(payment));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const stats = await paymentService.getStats(companyId);
      res.status(200).json(success(stats));
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
