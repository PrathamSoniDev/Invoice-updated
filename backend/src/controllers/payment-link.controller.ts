import { Request, Response, NextFunction } from 'express';
import { paymentLinkService } from '../services/payment-link.service';
import { success, created, paginated } from '../utils/response';

export class PaymentLinkController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const paymentLink = await paymentLinkService.create({
        companyId,
        ...req.body,
        userId,
      });
      res.status(201).json(created(paymentLink));
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('ID is required');
      const paymentLink = await paymentLinkService.getById(id, companyId);
      res.status(200).json(success(paymentLink));
    } catch (error) {
      next(error);
    }
  }

  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const result = await paymentLinkService.getMany(companyId, req.query as any);
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

  async getByLinkId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { linkId } = req.params;
      if (!linkId) throw new Error('Link ID is required');
      const paymentLink = await paymentLinkService.getByLinkId(linkId);
      res.status(200).json(success(paymentLink));
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
      const paymentLink = await paymentLinkService.cancel(id, companyId, userId);
      res.status(200).json(success(paymentLink));
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const stats = await paymentLinkService.getStats(companyId);
      res.status(200).json(success(stats));
    } catch (error) {
      next(error);
    }
  }
}

export const paymentLinkController = new PaymentLinkController();
