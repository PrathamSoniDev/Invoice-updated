import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { success } from '../utils/response';

export class AnalyticsController {
  async getRevenueAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { period = 'month' } = req.query;

      const analytics = await analyticsService.calculateRevenueAnalytics(companyId, period as 'week' | 'month' | 'quarter' | 'year');
      res.status(200).json(success(analytics));
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { period = 'month' } = req.query;

      const analytics = await analyticsService.calculateInvoiceAnalytics(companyId, period as 'week' | 'month' | 'quarter' | 'year');
      res.status(200).json(success(analytics));
    } catch (error) {
      next(error);
    }
  }

  async getCustomerAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { period = 'month' } = req.query;

      const analytics = await analyticsService.calculateCustomerAnalytics(companyId, period as 'week' | 'month' | 'quarter' | 'year');
      res.status(200).json(success(analytics));
    } catch (error) {
      next(error);
    }
  }

  async getPaymentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { period = 'month' } = req.query;

      const analytics = await analyticsService.calculatePaymentAnalytics(companyId, period as 'week' | 'month' | 'quarter' | 'year');
      res.status(200).json(success(analytics));
    } catch (error) {
      next(error);
    }
  }

  async getAverageInvoiceValue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { period = 'month' } = req.query;

      const avg = await analyticsService.calculateAverageInvoiceValue(companyId, period as 'month' | 'quarter' | 'year');
      res.status(200).json(success(avg));
    } catch (error) {
      next(error);
    }
  }

  async getCollectionRate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { period = 'month' } = req.query;

      const rate = await analyticsService.calculateCollectionRate(companyId, period as 'month' | 'quarter' | 'year');
      res.status(200).json(success(rate));
    } catch (error) {
      next(error);
    }
  }

  async getOutstandingAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const analytics = await analyticsService.calculateOutstandingAnalytics(companyId);
      res.status(200).json(success(analytics));
    } catch (error) {
      next(error);
    }
  }

  async getMovingAverage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { metric = 'revenue', window = '7' } = req.query;

      const movingAvg = await analyticsService.getMovingAverage(
        companyId,
        metric as 'revenue' | 'payments',
        parseInt(window as string, 10)
      );
      res.status(200).json(success(movingAvg));
    } catch (error) {
      next(error);
    }
  }

  async getPeriodComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const {
        periodType = 'month',
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
      } = req.query;

      if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
        res.status(400).json({ error: 'Date ranges are required' });
        return;
      }

      const comparison = await analyticsService.getPeriodComparison(
        companyId,
        periodType as 'week' | 'month' | 'quarter' | 'year',
        new Date(currentStart as string),
        new Date(currentEnd as string),
        new Date(previousStart as string),
        new Date(previousEnd as string)
      );

      res.status(200).json(success(comparison));
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
