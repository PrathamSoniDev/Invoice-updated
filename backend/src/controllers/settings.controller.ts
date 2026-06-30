import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { AppError, ErrorCodes } from '../utils/error';

class SettingsController {
  async getCompanyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const profile = await settingsService.getCompanyProfile(companyId);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  async updateCompanyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const profile = await settingsService.updateCompanyProfile(companyId, userId, req.body);
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }

  async getCompanySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const settings = await settingsService.getCompanySettings(companyId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateCompanySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const settings = await settingsService.updateCompanySettings(companyId, userId, req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async getBankInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const bankInfo = await settingsService.getBankInfo(companyId);
      res.json({ success: true, data: bankInfo });
    } catch (error) {
      next(error);
    }
  }

  async upsertBankInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const bankInfo = await settingsService.upsertBankInfo(companyId, userId, req.body);
      res.json({ success: true, data: bankInfo });
    } catch (error) {
      next(error);
    }
  }

  async deleteBankInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      await settingsService.deleteBankInfo(companyId, userId);
      res.json({ success: true, data: { message: 'Bank info deleted' } });
    } catch (error) {
      next(error);
    }
  }

  async getInvoiceSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const settings = await settingsService.getInvoiceSettings(companyId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateInvoiceSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const settings = await settingsService.updateInvoiceSettings(companyId, userId, req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async getCommunicationSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const settings = await settingsService.getCommunicationSettings(companyId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateCommunicationSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const settings = await settingsService.updateCommunicationSettings(companyId, userId, req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async getGatewaySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const settings = await settingsService.getGatewaySettings(companyId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  // Tax Configurations
  async getTaxConfigurations(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const configurations = await settingsService.getTaxConfigurations(companyId);
      res.json({ success: true, data: configurations });
    } catch (error) {
      next(error);
    }
  }

  async getTaxConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const configuration = await settingsService.getTaxConfiguration(id, companyId);
      if (!configuration) {
        throw new AppError('Tax configuration not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: configuration });
    } catch (error) {
      next(error);
    }
  }

  async createTaxConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const configuration = await settingsService.createTaxConfiguration(companyId, userId, req.body);
      res.status(201).json({ success: true, data: configuration });
    } catch (error) {
      next(error);
    }
  }

  async updateTaxConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      const configuration = await settingsService.updateTaxConfiguration(id, companyId, userId, req.body);
      if (!configuration) {
        throw new AppError('Tax configuration not found', 404, ErrorCodes.NOT_FOUND);
      }
      res.json({ success: true, data: configuration });
    } catch (error) {
      next(error);
    }
  }

  async deleteTaxConfiguration(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.user!.id;
      const id = req.params.id;
      if (!id) throw new AppError('ID is required', 400, ErrorCodes.VALIDATION_ERROR);
      await settingsService.deleteTaxConfiguration(id, companyId, userId);
      res.json({ success: true, data: { message: 'Tax configuration deleted' } });
    } catch (error) {
      next(error);
    }
  }

  // User Settings
  async getUserSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const settings = await settingsService.getUserSettings(userId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  async updateUserSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const settings = await settingsService.updateUserSettings(userId, req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  // Complete Settings Bundle
  async getCompleteSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId;
      const settings = await settingsService.getCompleteSettings(companyId);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
