import { Request, Response, NextFunction } from 'express';
import { paymentGatewayService } from '../services/payment-gateway.service';
import { success } from '../utils/response';

export class PaymentGatewayController {
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const settings = await paymentGatewayService.getSettings(companyId);

      // Don't return secrets
      const safeSettings = settings ? {
        id: settings.id,
        razorpayStatus: settings.razorpayStatus,
        razorpayKeyId: settings.razorpayKeyId ? `${settings.razorpayKeyId.slice(0, 8)}...` : null,
        hasRazorpayWebhook: !!settings.razorpayWebhookSecret,
        paytmStatus: settings.paytmStatus,
        paytmMerchantId: settings.paytmMerchantId ? `${settings.paytmMerchantId.slice(0, 4)}...` : null,
      } : null;

      res.status(200).json(success(safeSettings));
    } catch (error) {
      next(error);
    }
  }

  async saveRazorpay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const settings = await paymentGatewayService.saveRazorpayCredentials(companyId, req.body);

      res.status(200).json(success({
        id: settings.id,
        razorpayStatus: settings.razorpayStatus,
        razorpayKeyId: settings.razorpayKeyId ? `${settings.razorpayKeyId.slice(0, 8)}...` : null,
      }));
    } catch (error) {
      next(error);
    }
  }

  async savePaytm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const settings = await paymentGatewayService.savePaytmCredentials(companyId, req.body);

      res.status(200).json(success({
        id: settings.id,
        paytmStatus: settings.paytmStatus,
        paytmMerchantId: settings.paytmMerchantId ? `${settings.paytmMerchantId.slice(0, 4)}...` : null,
      }));
    } catch (error) {
      next(error);
    }
  }

  async testRazorpay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const result = await paymentGatewayService.testRazorpayConnection(companyId);
      res.status(200).json(success(result));
    } catch (error) {
      next(error);
    }
  }

  async disconnect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { gateway } = req.params;

      const settings = await paymentGatewayService.disconnectGateway(companyId, gateway as 'RAZORPAY' | 'PAYTM');
      res.status(200).json(success({
        id: settings.id,
        razorpayStatus: settings.razorpayStatus,
        paytmStatus: settings.paytmStatus,
      }));
    } catch (error) {
      next(error);
    }
  }
}

export const paymentGatewayController = new PaymentGatewayController();
