import { paymentRepository } from '../repositories/payment.repository';
import { invoiceRepository } from '../repositories/invoice.repository';
import { customerRepository } from '../repositories/customer.repository';
import { Payment, PaymentStatus } from '@prisma/client';
import { AppError, ErrorCodes } from '../utils/error';
import { emitToCompany } from '../socket';
import prisma from '../config/database';
import crypto from 'crypto';

class PaymentService {
  async recordPayment(data: {
    companyId: string;
    invoiceId?: string;
    customerId: string;
    amount: number;
    method: string;
    gateway?: string;
    transactionId?: string;
    userId?: string;
  }): Promise<Payment> {
    const customer = await customerRepository.findById(data.customerId, data.companyId);
    if (!customer) {
      throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
    }

    if (data.invoiceId) {
      const invoice = await invoiceRepository.findById(data.invoiceId, data.companyId);
      if (!invoice) {
        throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
      }

      if (invoice.status === 'CANCELLED') {
        throw new AppError('Cannot record payment on cancelled/void invoice', 400, ErrorCodes.VALIDATION_ERROR);
      }
    }

    const transactionId = data.transactionId || this.generateTransactionId();

    const payment = await paymentRepository.create({
      companyId: data.companyId,
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      amount: data.amount,
      method: data.method,
      gateway: data.gateway,
      transactionId,
      status: 'PAID',
    });

    if (data.invoiceId) {
      await invoiceRepository.recordPayment(data.invoiceId, data.companyId, data.amount);
      await invoiceRepository.addActivity(data.invoiceId, 'PAYMENT_RECORDED', `Payment of ₹${data.amount} recorded`, data.userId);

      const updatedInvoice = await invoiceRepository.findById(data.invoiceId, data.companyId);
      if (updatedInvoice && updatedInvoice.status === 'PAID') {
        await customerRepository.updateStats(data.customerId, data.companyId);
        emitToCompany(data.companyId, 'invoice:paid', { id: data.invoiceId });
      }
    }

    await this.logActivity(data.companyId, data.userId, 'PAYMENT_RECORDED', `Payment of ₹${data.amount} recorded`, {
      paymentId: payment.id,
      invoiceId: data.invoiceId,
      customerId: data.customerId,
    });

    emitToCompany(data.companyId, 'payment:received', {
      id: payment.id,
      amount: data.amount,
      customerId: data.customerId,
      invoiceId: data.invoiceId,
    });

    return payment;
  }

  async getById(id: string, companyId: string): Promise<Payment> {
    const payment = await paymentRepository.findById(id, companyId);
    if (!payment) {
      throw new AppError('Payment not found', 404, ErrorCodes.NOT_FOUND);
    }
    return payment;
  }

  async getMany(companyId: string, params: any): Promise<any> {
    return paymentRepository.findMany(companyId, params);
  }

  async updateStatus(id: string, companyId: string, status: PaymentStatus, userId?: string): Promise<Payment> {
    const existing = await paymentRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Payment not found', 404, ErrorCodes.NOT_FOUND);
    }

    const payment = await paymentRepository.updateStatus(id, status);

    await this.logActivity(companyId, userId, 'PAYMENT_STATUS_UPDATED', `Payment status updated to ${status}`, {
      paymentId: id,
      previousStatus: existing.status,
      newStatus: status,
    });

    return payment;
  }

  async refund(id: string, companyId: string, userId?: string): Promise<Payment> {
    const existing = await paymentRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Payment not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (existing.status !== 'PAID') {
      throw new AppError('Can only refund successful payments', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const payment = await paymentRepository.updateStatus(id, 'REFUNDED');

    if (existing.invoiceId) {
      const invoice = await invoiceRepository.findById(existing.invoiceId, companyId);
      if (invoice) {
        const newAmountPaid = Number(invoice.amountPaid) - Number(existing.amount);
        const newBalance = Number(invoice.total) - newAmountPaid;
        const newStatus: string = newAmountPaid >= Number(invoice.total) ? 'PAID' : 'SENT';

        await prisma.invoice.update({
          where: { id: existing.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus as any,
          },
        });

        await customerRepository.updateStats(existing.customerId, companyId);
      }
    }

    await this.logActivity(companyId, userId, 'PAYMENT_REFUNDED', `Payment of ₹${existing.amount} refunded`, {
      paymentId: id,
    });

    emitToCompany(companyId, 'payment:refunded', { id, amount: existing.amount });

    return payment;
  }

  async getStats(companyId: string) {
    return paymentRepository.getStats(companyId);
  }

  generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `TXN${timestamp}${random}`.toUpperCase();
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
        entity: 'payment',
        entityId: (metadata.paymentId as string) || '',
        action,
        description,
        metadata: metadata as any,
      },
    }).catch(() => {});
  }
}

export const paymentService = new PaymentService();
