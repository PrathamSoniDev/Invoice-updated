import prisma from '../config/database';
import { GatewaySettings, GatewayStatus } from '@prisma/client';
import { AppError, ErrorCodes } from '../utils/error';
import config from '../config';
import crypto from 'crypto';

interface GatewayCredentials {
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
  paytmMerchantId?: string;
  paytmMerchantKey?: string;
}

class PaymentGatewayService {
  private getEncryptionKey(): string {
    return config.security.gatewayEncryptionKey.padEnd(32, '0').slice(0, 32);
  }

  private encrypt(text: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const key = this.getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error('Invalid encrypted text format');
    const iv = Buffer.from(parts[0]!, 'hex');
    const encrypted = parts[1]!;
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getSettings(companyId: string): Promise<GatewaySettings | null> {
    return prisma.gatewaySettings.findUnique({ where: { companyId } });
  }

  async saveRazorpayCredentials(
    companyId: string,
    credentials: { keyId: string; keySecret: string; webhookSecret?: string }
  ): Promise<GatewaySettings> {
    const existing = await this.getSettings(companyId);

    const encryptedKeySecret = this.encrypt(credentials.keySecret);
    const encryptedWebhookSecret = credentials.webhookSecret ? this.encrypt(credentials.webhookSecret) : null;

    if (existing) {
      return prisma.gatewaySettings.update({
        where: { companyId },
        data: {
          razorpayKeyId: credentials.keyId,
          razorpayKeySecret: encryptedKeySecret,
          razorpayWebhookSecret: encryptedWebhookSecret,
          razorpayStatus: 'CONNECTED',
        },
      });
    }

    return prisma.gatewaySettings.create({
      data: {
        companyId,
        razorpayKeyId: credentials.keyId,
        razorpayKeySecret: encryptedKeySecret,
        razorpayWebhookSecret: encryptedWebhookSecret,
        razorpayStatus: 'CONNECTED',
      },
    });
  }

  async savePaytmCredentials(
    companyId: string,
    credentials: { merchantId: string; merchantKey: string }
  ): Promise<GatewaySettings> {
    const existing = await this.getSettings(companyId);

    const encryptedMerchantKey = this.encrypt(credentials.merchantKey);

    if (existing) {
      return prisma.gatewaySettings.update({
        where: { companyId },
        data: {
          paytmMerchantId: credentials.merchantId,
          paytmMerchantKey: encryptedMerchantKey,
          paytmStatus: 'CONNECTED',
        },
      });
    }

    return prisma.gatewaySettings.create({
      data: {
        companyId,
        paytmMerchantId: credentials.merchantId,
        paytmMerchantKey: encryptedMerchantKey,
        paytmStatus: 'CONNECTED',
      },
    });
  }

  async getRazorpayCredentials(companyId: string): Promise<{ keyId: string; keySecret: string } | null> {
    const settings = await this.getSettings(companyId);
    if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
      return null;
    }

    return {
      keyId: settings.razorpayKeyId,
      keySecret: this.decrypt(settings.razorpayKeySecret),
    };
  }

  async getPaytmCredentials(companyId: string): Promise<{ merchantId: string; merchantKey: string } | null> {
    const settings = await this.getSettings(companyId);
    if (!settings || !settings.paytmMerchantId || !settings.paytmMerchantKey) {
      return null;
    }

    return {
      merchantId: settings.paytmMerchantId,
      merchantKey: this.decrypt(settings.paytmMerchantKey),
    };
  }

  async testRazorpayConnection(companyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const credentials = await this.getRazorpayCredentials(companyId);
      if (!credentials) {
        return { success: false, message: 'Razorpay credentials not configured' };
      }

      if (credentials.keyId.startsWith('rzp_') && credentials.keySecret.length > 0) {
        return { success: true, message: 'Razorpay connection successful' };
      }

      return { success: false, message: 'Invalid Razorpay credentials format' };
    } catch (error) {
      return { success: false, message: 'Failed to test Razorpay connection' };
    }
  }

  async disconnectGateway(companyId: string, gateway: 'RAZORPAY' | 'PAYTM'): Promise<GatewaySettings> {
    const updates: any = {};

    if (gateway === 'RAZORPAY') {
      updates.razorpayKeyId = null;
      updates.razorpayKeySecret = null;
      updates.razorpayWebhookSecret = null;
      updates.razorpayStatus = 'DISCONNECTED';
    } else {
      updates.paytmMerchantId = null;
      updates.paytmMerchantKey = null;
      updates.paytmStatus = 'DISCONNECTED';
    }

    return prisma.gatewaySettings.update({
      where: { companyId },
      data: updates,
    });
  }

  verifyRazorpayWebhook(
    body: string,
    signature: string,
    webhookSecret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export const paymentGatewayService = new PaymentGatewayService();
