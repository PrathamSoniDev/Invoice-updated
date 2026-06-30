import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { success } from '../utils/response';

export class DashboardController {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange } = req.query;

      const summary = await dashboardService.getSummary(companyId, dateRange as string);
      res.status(200).json(success(summary));
    } catch (error) {
      next(error);
    }
  }

  async getRevenueTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', groupBy = 'day' } = req.query;

      const trend = await dashboardService.getRevenueTrend(companyId, dateRange as string, undefined, groupBy as 'day' | 'week' | 'month');
      res.status(200).json(success(trend));
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', groupBy = 'day' } = req.query;

      const trend = await dashboardService.getInvoiceTrend(companyId, dateRange as string, undefined, groupBy as 'day' | 'week' | 'month');
      res.status(200).json(success(trend));
    } catch (error) {
      next(error);
    }
  }

  async getCustomerGrowthTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', groupBy = 'day' } = req.query;

      const trend = await dashboardService.getCustomerGrowthTrend(companyId, dateRange as string, undefined, groupBy as 'day' | 'week' | 'month');
      res.status(200).json(success(trend));
    } catch (error) {
      next(error);
    }
  }

  async getPaymentTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', groupBy = 'day' } = req.query;

      const trend = await dashboardService.getPaymentTrend(companyId, dateRange as string, undefined, groupBy as 'day' | 'week' | 'month');
      res.status(200).json(success(trend));
    } catch (error) {
      next(error);
    }
  }

  async getCollectionTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', groupBy = 'day' } = req.query;

      const trend = await dashboardService.getCollectionTrend(companyId, dateRange as string, undefined, groupBy as 'day' | 'week' | 'month');
      res.status(200).json(success(trend));
    } catch (error) {
      next(error);
    }
  }

  async getOutstandingTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { months = '6' } = req.query;

      const trend = await dashboardService.getOutstandingTrend(companyId, parseInt(months as string, 10));
      res.status(200).json(success(trend));
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceStatusDistribution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const distribution = await dashboardService.getInvoiceStatusDistribution(companyId);
      res.status(200).json(success(distribution));
    } catch (error) {
      next(error);
    }
  }

  async getPaymentGatewayUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const usage = await dashboardService.getPaymentGatewayUsage(companyId);
      res.status(200).json(success(usage));
    } catch (error) {
      next(error);
    }
  }

  async getTopCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { limit = '10', type = 'revenue' } = req.query;

      const customers = type === 'outstanding'
        ? await dashboardService.getTopOutstandingCustomers(companyId, parseInt(limit as string, 10))
        : await dashboardService.getTopCustomersByRevenue(companyId, parseInt(limit as string, 10));

      res.status(200).json(success(customers));
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { limit = '20' } = req.query;

      const activities = await dashboardService.getRecentActivities(companyId, parseInt(limit as string, 10));
      res.status(200).json(success(activities));
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const comparison = await dashboardService.getMonthlyComparison(companyId);
      res.status(200).json(success(comparison));
    } catch (error) {
      next(error);
    }
  }

  async getYearlyComparison(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const comparison = await dashboardService.getYearlyComparison(companyId);
      res.status(200).json(success(comparison));
    } catch (error) {
      next(error);
    }
  }

  async getChartData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { chartType, dateRange = 'last30days', groupBy = 'day' } = req.query;

      if (!chartType) {
        res.status(400).json({ error: 'chartType is required' });
        return;
      }

      const data = await dashboardService.getChartData(
        companyId,
        chartType as string,
        dateRange as string,
        undefined,
        groupBy as 'day' | 'week' | 'month'
      );

      res.status(200).json(success(data));
    } catch (error) {
      next(error);
    }
  }

  async refreshDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      await dashboardService.refreshDashboard(companyId);
      res.status(200).json(success({ message: 'Dashboard cache refreshed' }));
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
