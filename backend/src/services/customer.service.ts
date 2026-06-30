import { customerRepository, CustomerSearchParams, PaginatedResult } from '../repositories/customer.repository';
import { Customer } from '@prisma/client';
import { AppError, ErrorCodes } from '../utils/error';
import { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator';
import { emitToCompany } from '../socket';
import prisma from '../config/database';

class CustomerService {
  async create(companyId: string, data: CreateCustomerInput, userId?: string): Promise<Customer> {
    const existing = await customerRepository.existsByEmail(data.email, companyId);
    if (existing) {
      throw new AppError('Customer with this email already exists', 409, ErrorCodes.DUPLICATE_EMAIL);
    }

    if (data.gstNumber) {
      const existingGST = await customerRepository.findByGST(data.gstNumber, companyId);
      if (existingGST) {
        throw new AppError('Customer with this GST number already exists', 409, ErrorCodes.DUPLICATE_GST);
      }
    }

    const customer = await customerRepository.createCustomer({
      companyId,
      name: data.name,
      businessName: data.businessName,
      email: data.email,
      mobile: data.mobile,
      gstNumber: data.gstNumber,
      whatsapp: data.whatsapp,
      notes: data.notes,
      billingLine1: data.billingAddress.line1,
      billingLine2: data.billingAddress.line2,
      billingCity: data.billingAddress.city,
      billingState: data.billingAddress.state,
      billingPincode: data.billingAddress.pincode,
      billingCountry: data.billingAddress.country,
      shippingLine1: data.shippingAddress?.line1,
      shippingLine2: data.shippingAddress?.line2,
      shippingCity: data.shippingAddress?.city,
      shippingState: data.shippingAddress?.state,
      shippingPincode: data.shippingAddress?.pincode,
      shippingCountry: data.shippingAddress?.country,
      createdById: userId,
    });

    await this.logActivity(companyId, userId, 'CUSTOMER_CREATED', `Created customer: ${customer.name}`, { customerId: customer.id });

    emitToCompany(companyId, 'customer:created', { id: customer.id, name: customer.name });

    return customer;
  }

  async getById(id: string, companyId: string): Promise<Customer> {
    const customer = await customerRepository.findById(id, companyId);
    if (!customer) {
      throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
    }
    return customer;
  }

  async getMany(companyId: string, params: CustomerSearchParams): Promise<PaginatedResult<Customer>> {
    return customerRepository.findMany(companyId, params);
  }

  async update(id: string, companyId: string, data: UpdateCustomerInput, userId?: string): Promise<Customer> {
    const existing = await customerRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
    }

    if (data.email && data.email !== existing.email) {
      const emailExists = await customerRepository.existsByEmail(data.email, companyId, id);
      if (emailExists) {
        throw new AppError('Customer with this email already exists', 409, ErrorCodes.DUPLICATE_EMAIL);
      }
    }

    if (data.gstNumber && data.gstNumber !== existing.gstNumber) {
      const gstExists = await customerRepository.findByGST(data.gstNumber, companyId);
      if (gstExists && gstExists.id !== id) {
        throw new AppError('Customer with this GST number already exists', 409, ErrorCodes.DUPLICATE_GST);
      }
    }

    const updateData: any = { ...data, updatedById: userId };

    if (data.billingAddress) {
      updateData.billingLine1 = data.billingAddress.line1;
      updateData.billingLine2 = data.billingAddress.line2;
      updateData.billingCity = data.billingAddress.city;
      updateData.billingState = data.billingAddress.state;
      updateData.billingPincode = data.billingAddress.pincode;
      updateData.billingCountry = data.billingAddress.country;
      delete updateData.billingAddress;
    }

    if (data.shippingAddress) {
      updateData.shippingLine1 = data.shippingAddress.line1;
      updateData.shippingLine2 = data.shippingAddress.line2;
      updateData.shippingCity = data.shippingAddress.city;
      updateData.shippingState = data.shippingAddress.state;
      updateData.shippingPincode = data.shippingAddress.pincode;
      updateData.shippingCountry = data.shippingAddress.country;
      delete updateData.shippingAddress;
    }

    const customer = await customerRepository.updateCustomer(id, companyId, updateData);

    await this.logActivity(companyId, userId, 'CUSTOMER_UPDATED', `Updated customer: ${customer.name}`, { customerId: customer.id });

    emitToCompany(companyId, 'customer:updated', { id: customer.id, name: customer.name });

    return customer;
  }

  async delete(id: string, companyId: string, userId?: string): Promise<Customer> {
    const existing = await customerRepository.findById(id, companyId);
    if (!existing) {
      throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
    }

    const invoiceCount = await prisma.invoice.count({
      where: { customerId: id, deletedAt: null },
    });

    if (invoiceCount > 0) {
      throw new AppError(
        'Cannot delete customer with existing invoices',
        400,
        ErrorCodes.CUSTOMER_HAS_INVOICES
      );
    }

    const customer = await customerRepository.softDeleteCustomer(id, companyId);

    await this.logActivity(companyId, userId, 'CUSTOMER_DELETED', `Deleted customer: ${existing.name}`, { customerId: id });

    emitToCompany(companyId, 'customer:deleted', { id });

    return customer;
  }

  async restore(id: string, companyId: string, userId?: string): Promise<Customer> {
    const customer = await customerRepository.restoreCustomer(id, companyId);
    if (!customer) {
      throw new AppError('Customer not found', 404, ErrorCodes.CUSTOMER_NOT_FOUND);
    }

    await this.logActivity(companyId, userId, 'CUSTOMER_RESTORED', `Restored customer: ${customer.name}`, { customerId: id });

    return customer;
  }

  async getStats(companyId: string) {
    return customerRepository.getStats(companyId);
  }

  async search(companyId: string, query: string, limit: number = 10) {
    return customerRepository.search(companyId, query, limit);
  }

  async updateCustomerStats(customerId: string, companyId: string): Promise<void> {
    await customerRepository.updateStats(customerId, companyId);
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
        entity: 'customer',
        entityId: (metadata.customerId as string) || '',
        action,
        description,
        metadata: metadata as any,
      },
    }).catch(() => {});
  }
}

export const customerService = new CustomerService();
