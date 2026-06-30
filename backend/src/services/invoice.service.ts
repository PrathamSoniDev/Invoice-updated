import { invoiceRepository, InvoiceSearchParams, PaginatedResult, InvoiceWithItems } from '../repositories/invoice.repository';
import { customerRepository } from '../repositories/customer.repository';
import { Invoice, InvoiceStatus } from '@prisma/client';
import { AppError, ErrorCodes } from '../utils/error';
import { CreateInvoiceInput, UpdateInvoiceInput } from '../validators/invoice.validator';
import { emitToCompany } from '../socket';
import prisma from '../config/database';

interface InvoiceCalculation {
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  balance: number;
}

interface InvoiceItem {
  description: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  discount?: number;
  taxRate: number;
}

class InvoiceService {
  calculateTotals(items: InvoiceItem[], globalDiscount: number = 0): InvoiceCalculation {
    let subtotal = 0;
    let taxAmount = 0;

    for (const item of items) {
      const itemSubtotal = item.quantity * item.rate;
      const itemDiscount = item.discount || 0;
      const taxableAmount = itemSubtotal - itemDiscount;
      const itemTax = taxableAmount * (item.taxRate / 100);

      subtotal += itemSubtotal;
      taxAmount += itemTax;
    }

    const discountAmount = globalDiscount;
    const total = subtotal - discountAmount + taxAmount;
    const balance = total;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };
  }

  async create(companyId: string, data: CreateInvoiceInput, userId?: string): Promise<Invoice> {
    const customer = await customerRepository.findById(data.customerId, companyId);
    if (!customer) {
      throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
    }

    const settings = await prisma.invoiceSettings.findUnique({ where: { companyId } });
    const prefix = settings?.prefix || 'INV';
    const number = await invoiceRepository.getNextInvoiceNumber(companyId, prefix);

    const itemsWithAmounts = data.items.map((item, idx) => ({
      description: item.description,
      hsnCode: item.hsnCode,
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount || 0,
      taxRate: item.taxRate,
      amount: (item.quantity * item.rate) - (item.discount || 0) + ((item.quantity * item.rate - (item.discount || 0)) * item.taxRate / 100),
    }));

    const totals = this.calculateTotals(data.items, data.discountAmount);

    const invoice = await invoiceRepository.createInvoice({
      companyId,
      customerId: data.customerId,
      number,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      balance: totals.balance,
      notes: data.notes,
      terms: data.terms || settings?.defaultTerms || undefined,
      placeOfSupply: data.placeOfSupply,
      reverseCharge: data.reverseCharge,
      createdById: userId,
      items: itemsWithAmounts,
    });

    await invoiceRepository.addActivity(invoice.id, 'CREATED', 'Invoice created', userId);

    await this.logActivity(companyId, userId, 'INVOICE_CREATED', `Created invoice ${number}`, { invoiceId: invoice.id, number });

    emitToCompany(companyId, 'invoice:created', { id: invoice.id, number, customerId: data.customerId });

    return invoice;
  }

  async getById(id: string, companyId: string): Promise<InvoiceWithItems> {
    const invoice = await invoiceRepository.findById(id, companyId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }
    return invoice;
  }

  async getMany(companyId: string, params: InvoiceSearchParams): Promise<PaginatedResult<InvoiceWithItems>> {
    return invoiceRepository.findMany(companyId, params);
  }

  async update(id: string, companyId: string, data: UpdateInvoiceInput, userId?: string): Promise<Invoice> {
    const existing = await invoiceRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError('Can only update draft invoices', 400, ErrorCodes.VALIDATION_ERROR);
    }

    if (data.customerId) {
      const customer = await customerRepository.findById(data.customerId, companyId);
      if (!customer) {
        throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
      }
    }

    let updateData: any = { ...data, updatedById: userId };

    if (data.items && data.items.length > 0) {
      const totals = this.calculateTotals(data.items, data.discountAmount || Number(existing.discountAmount));

      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

      const itemsWithAmounts = data.items.map((item, idx) => ({
        description: item.description,
        hsnCode: item.hsnCode,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount || 0,
        taxRate: item.taxRate,
        amount: (item.quantity * item.rate) - (item.discount || 0) + ((item.quantity * item.rate - (item.discount || 0)) * item.taxRate / 100),
      }));

      await prisma.invoiceItem.createMany({
        data: itemsWithAmounts.map((item, idx) => ({
          invoiceId: id,
          ...item,
          sortOrder: idx,
        })),
      });

      updateData.subtotal = totals.subtotal;
      updateData.taxAmount = totals.taxAmount;
      updateData.discountAmount = totals.discountAmount;
      updateData.total = totals.total;
      updateData.balance = totals.total - Number(existing.amountPaid);

      delete updateData.items;
    }

    const invoice = await invoiceRepository.updateInvoice(id, companyId, updateData);

    await invoiceRepository.addActivity(id, 'UPDATED', 'Invoice updated', userId);

    emitToCompany(companyId, 'invoice:updated', { id: invoice.id, number: invoice.number });

    return invoice;
  }

  async delete(id: string, companyId: string, userId?: string): Promise<Invoice> {
    const existing = await invoiceRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (Number(existing.amountPaid) > 0) {
      throw new AppError('Cannot delete invoice with payments', 400, ErrorCodes.INVOICE_HAS_PAYMENTS);
    }

    const invoice = await invoiceRepository.softDelete(id, companyId);

    await this.logActivity(companyId, userId, 'INVOICE_DELETED', `Deleted invoice ${existing.number}`, { invoiceId: id });

    emitToCompany(companyId, 'invoice:deleted', { id });

    return invoice;
  }

  async send(id: string, companyId: string, userId?: string): Promise<Invoice> {
    const existing = await invoiceRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (existing.status !== 'DRAFT') {
      throw new AppError('Can only send draft invoices', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const invoice = await invoiceRepository.updateStatus(id, companyId, 'SENT');

    await invoiceRepository.addActivity(id, 'SENT', 'Invoice sent to customer', userId);

    await this.logActivity(companyId, userId, 'INVOICE_SENT', `Sent invoice ${existing.number}`, { invoiceId: id });

    emitToCompany(companyId, 'invoice:sent', { id: invoice.id, number: invoice.number });

    return invoice;
  }

  async markAsViewed(id: string, companyId: string): Promise<Invoice> {
    const existing = await invoiceRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (existing.status !== 'SENT') {
      throw new AppError('Invoice must be sent first', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const invoice = await invoiceRepository.updateStatus(id, companyId, 'VIEWED');

    await invoiceRepository.addActivity(id, 'VIEWED', 'Invoice viewed by customer');

    emitToCompany(companyId, 'invoice:viewed', { id: invoice.id, number: invoice.number });

    return invoice;
  }

  async cancel(id: string, companyId: string, userId?: string): Promise<Invoice> {
    const existing = await invoiceRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (existing.status === 'PAID') {
      throw new AppError('Cannot cancel paid invoice', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const invoice = await invoiceRepository.updateStatus(id, companyId, 'CANCELLED');

    await invoiceRepository.addActivity(id, 'CANCELLED', 'Invoice cancelled', userId);

    await this.logActivity(companyId, userId, 'INVOICE_CANCELLED', `Cancelled invoice ${existing.number}`, { invoiceId: id });

    emitToCompany(companyId, 'invoice:cancelled', { id: invoice.id, number: invoice.number });

    return invoice;
  }

  async markAsVoid(id: string, companyId: string, userId?: string): Promise<Invoice> {
    const existing = await invoiceRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (existing.status === 'PAID') {
      throw new AppError('Cannot void paid invoice', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const invoice = await invoiceRepository.updateStatus(id, companyId, 'CANCELLED');

    await invoiceRepository.addActivity(id, 'VOIDED', 'Invoice marked as void', userId);

    await this.logActivity(companyId, userId, 'INVOICE_VOIDED', `Voided invoice ${existing.number}`, { invoiceId: id });

    emitToCompany(companyId, 'invoice:voided', { id: invoice.id, number: invoice.number });

    return invoice;
  }

  async duplicate(id: string, companyId: string, userId?: string): Promise<Invoice> {
    const invoice = await invoiceRepository.duplicate(id, companyId, userId);

    await invoiceRepository.addActivity(invoice.id, 'DUPLICATED', `Invoice duplicated from ${id}`, userId);

    emitToCompany(companyId, 'invoice:created', { id: invoice.id, number: invoice.number });

    return invoice;
  }

  async getStats(companyId: string) {
    return invoiceRepository.getStats(companyId);
  }

  async recordPayment(id: string, companyId: string, amount: number, userId?: string): Promise<Invoice> {
    const existing = await invoiceRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Invoice not found', 404, ErrorCodes.INVOICE_NOT_FOUND);
    }

    if (existing.status === 'CANCELLED') {
      throw new AppError('Cannot record payment on cancelled/void invoice', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const invoice = await invoiceRepository.recordPayment(id, companyId, amount);

    await invoiceRepository.addActivity(id, 'PAYMENT_RECORDED', `Payment of ₹${amount} recorded`, userId);

    if (invoice.status === 'PAID') {
      await customerRepository.updateStats(existing.customerId, companyId);
      emitToCompany(companyId, 'invoice:paid', { id: invoice.id, number: invoice.number });
    }

    emitToCompany(companyId, 'invoice:updated', { id: invoice.id, number: invoice.number });

    return invoice;
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
        entity: 'invoice',
        entityId: (metadata.invoiceId as string) || '',
        action,
        description,
        metadata: metadata as any,
      },
    }).catch(() => {});
  }
}

export const invoiceService = new InvoiceService();
