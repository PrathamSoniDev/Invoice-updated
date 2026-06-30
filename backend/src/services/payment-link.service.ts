import { paymentLinkRepository } from '../repositories/payment-link.repository';
import { customerRepository } from '../repositories/customer.repository';
import { invoiceRepository } from '../repositories/invoice.repository';
import { PaymentLink, PaymentLinkStatus } from '@prisma/client';
import { AppError, ErrorCodes } from '../utils/error';
import { emitToCompany } from '../socket';
import prisma from '../config/database';
import { nanoid } from 'nanoid';

class PaymentLinkService {
  async create(data: {
    companyId: string;
    customerId: string;
    invoiceId?: string;
    amount: number;
    gateway: 'RAZORPAY' | 'PAYTM';
    description?: string;
    expiryDays?: number;
    userId?: string;
  }): Promise<PaymentLink> {
    const customer = await customerRepository.findById(data.customerId, data.companyId);
    if (!customer) {
      throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
    }

    if (data.invoiceId) {
      const invoice = await invoiceRepository.findById(data.invoiceId, data.companyId);
      if (!invoice) {
        throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
      }

      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
        throw new AppError('Cannot create payment link for this invoice', 400, ErrorCodes.VALIDATION_ERROR);
      }
    }

    const linkId = `pl_${nanoid(12)}`;
    const expiryDate = new Date(Date.now() + (data.expiryDays || 7) * 24 * 60 * 60 * 1000);

    // In production, we would call the gateway API to create a payment link
    // For now, we create a placeholder URL
    const url = `${process.env['APP_URL'] || 'http://localhost:5173'}/pay/${linkId}`;

    const paymentLink = await paymentLinkRepository.create({
      companyId: data.companyId,
      linkId,
      customerId: data.customerId,
      invoiceId: data.invoiceId,
      amount: data.amount,
      gateway: data.gateway,
      description: data.description,
      expiryDate,
      url,
    });

    await this.logActivity(data.companyId, data.userId, 'PAYMENT_LINK_CREATED', `Payment link created for ₹${data.amount}`, {
      paymentLinkId: paymentLink.id,
      linkId,
    });

    emitToCompany(data.companyId, 'payment-link:created', { id: paymentLink.id, linkId });

    return paymentLink;
  }

  async getById(id: string, companyId: string): Promise<PaymentLink> {
    const link = await paymentLinkRepository.findById(id, companyId);
    if (!link) {
      throw new AppError('Payment link not found', 404, ErrorCodes.NOT_FOUND);
    }
    return link;
  }

  async getByLinkId(linkId: string): Promise<PaymentLink> {
    const link = await paymentLinkRepository.findByLinkId(linkId);
    if (!link) {
      throw new AppError('Payment link not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (link.status !== 'PENDING') {
      throw new AppError('Payment link is no longer active', 400, ErrorCodes.VALIDATION_ERROR);
    }

    if (link.expiryDate < new Date()) {
      await paymentLinkRepository.updateStatus(link.id, 'EXPIRED');
      throw new AppError('Payment link has expired', 400, ErrorCodes.VALIDATION_ERROR);
    }

    return link;
  }

  async getMany(companyId: string, params: any): Promise<any> {
    return paymentLinkRepository.findMany(companyId, params);
  }

  async cancel(id: string, companyId: string, userId?: string): Promise<PaymentLink> {
    const existing = await paymentLinkRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Payment link not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (existing.status !== 'PENDING') {
      throw new AppError('Can only cancel pending payment links', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const link = await paymentLinkRepository.updateStatus(id, 'EXPIRED');

    await this.logActivity(companyId, userId, 'PAYMENT_LINK_CANCELLED', 'Payment link cancelled', { paymentLinkId: id });

    emitToCompany(companyId, 'payment-link:cancelled', { id });

    return link;
  }

  async markAsPaid(id: string, companyId: string, userId?: string): Promise<PaymentLink> {
    const link = await paymentLinkRepository.updateStatus(id, 'PAID');

    await this.logActivity(companyId, userId, 'PAYMENT_LINK_PAID', 'Payment link marked as paid', { paymentLinkId: id });

    emitToCompany(companyId, 'payment-link:paid', { id });

    return link;
  }

  async getStats(companyId: string) {
    return paymentLinkRepository.getStats(companyId);
  }

  async processExpiredLinks(): Promise<number> {
    return paymentLinkRepository.markExpired();
  }

  private async logActivity(
    companyId: string,
    userId: string | undefined,
    action: string,
    description: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!userId) return;

    await prisma.activityLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        entity: 'payment_link',
        entityId: (metadata.paymentLinkId as string) || '',
        action,
        description,
        metadata: metadata as any,
      },
    }).catch(() => {});
  }
}

export const paymentLinkService = new PaymentLinkService();
