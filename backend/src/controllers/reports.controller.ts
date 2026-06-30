import { Request, Response, NextFunction } from 'express';
import { reportsService } from '../services/reports.service';
import { success, created } from '../utils/response';

export class ReportsController {
  async getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', startDate, endDate } = req.query;

      const customDateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const report = await reportsService.getRevenueReport(companyId, dateRange as string, customDateRange);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', status, startDate, endDate } = req.query;

      const customDateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const report = await reportsService.getInvoiceReport(companyId, dateRange as string, customDateRange, status as string);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceAgingReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const report = await reportsService.getInvoiceAgingReport(companyId);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getCustomerRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', startDate, endDate } = req.query;

      const customDateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const report = await reportsService.getCustomerRevenueReport(companyId, dateRange as string, customDateRange);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getOutstandingCustomersReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const report = await reportsService.getOutstandingCustomersReport(companyId);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getInactiveCustomersReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { months = '6' } = req.query;

      const report = await reportsService.getInactiveCustomersReport(companyId, parseInt(months as string, 10));
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getPaymentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', status, startDate, endDate } = req.query;

      const customDateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const report = await reportsService.getPaymentReport(companyId, dateRange as string, customDateRange, status as string);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getTaxReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', startDate, endDate } = req.query;

      const customDateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const report = await reportsService.getTaxReport(companyId, dateRange as string, customDateRange);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getGatewayReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', startDate, endDate } = req.query;

      const customDateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const report = await reportsService.getGatewaySuccessReport(companyId, dateRange as string, customDateRange);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getRefundReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { dateRange = 'last30days', startDate, endDate } = req.query;

      const customDateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      } : undefined;

      const report = await reportsService.getRefundReport(companyId, dateRange as string, customDateRange);
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyFinancialSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { year = new Date().getFullYear().toString() } = req.query;

      const report = await reportsService.getMonthlyFinancialSummary(companyId, parseInt(year as string, 10));
      res.status(200).json(success(report));
    } catch (error) {
      next(error);
    }
  }

  async saveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.userId;
      const { reportType, config } = req.body;

      const saved = await reportsService.saveReport(companyId, userId, reportType, config);
      res.status(201).json(created(saved));
    } catch (error) {
      next(error);
    }
  }

  async getSavedReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const reports = await reportsService.getSavedReports(companyId);
      res.status(200).json(success(reports));
    } catch (error) {
      next(error);
    }
  }

  async deleteSavedReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      if (!id) throw new Error('Report ID is required');

      await reportsService.deleteSavedReport(companyId, id);
      res.status(200).json(success({ message: 'Report deleted successfully' }));
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
