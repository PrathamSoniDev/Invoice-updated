import api, { ApiResponse, PaginatedResponse } from '@/utils/apiClient';
import type { Invoice } from '@/types';

// Backend invoice response format
interface BackendInvoice {
  id: string;
  number: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    businessName: string;
  };
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  amountPaid: string;
  balance: string;
  notes: string | null;
  terms: string | null;
  items: BackendInvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

interface BackendInvoiceItem {
  id: string;
  description: string;
  hsnCode: string | null;
  quantity: string;
  rate: string;
  discount: string;
  taxRate: string;
  amount: string;
}

// Input type for creating an invoice
interface CreateInvoiceInput {
  customerId: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    discount?: number;
    taxRate?: number;
  }>;
  discountAmount?: number;
  notes?: string;
  terms?: string;
}

// Transform backend format to frontend format
function transformInvoice(backend: BackendInvoice): Invoice {
  return {
    id: backend.id,
    number: backend.number,
    customerId: backend.customerId,
    customerName: backend.customer.name,
    customerEmail: backend.customer.email,
    status: backend.status.toLowerCase() as Invoice['status'],
    issueDate: backend.issueDate,
    dueDate: backend.dueDate,
    lineItems: backend.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: parseFloat(item.quantity) || 0,
      rate: parseFloat(item.rate) || 0,
      discount: parseFloat(item.discount) || 0,
      taxRate: parseFloat(item.taxRate) || 0,
      amount: parseFloat(item.amount) || 0,
    })),
    subtotal: parseFloat(backend.subtotal) || 0,
    taxAmount: parseFloat(backend.taxAmount) || 0,
    discountAmount: parseFloat(backend.discountAmount) || 0,
    total: parseFloat(backend.total) || 0,
    amountPaid: parseFloat(backend.amountPaid) || 0,
    balance: parseFloat(backend.balance) || 0,
    notes: backend.notes || undefined,
    terms: backend.terms || undefined,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

export const invoiceService = {
  async list(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendInvoice>>>('/invoices', { params });
    return {
      ...response.data.data,
      data: response.data.data.data.map(transformInvoice),
    };
  },

  async get(id: string) {
    const response = await api.get<ApiResponse<BackendInvoice>>(`/invoices/${id}`);
    return transformInvoice(response.data.data);
  },

  async create(data: CreateInvoiceInput) {
    const response = await api.post<ApiResponse<BackendInvoice>>('/invoices', {
      customerId: data.customerId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      items: data.items.map((item) => ({
        description: item.description,
        hsnCode: null,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
      })),
      discountAmount: data.discountAmount || 0,
      notes: data.notes || null,
      terms: data.terms || null,
    });
    return transformInvoice(response.data.data);
  },

  async update(id: string, data: Partial<CreateInvoiceInput>) {
    const response = await api.put<ApiResponse<BackendInvoice>>(`/invoices/${id}`, {
      customerId: data.customerId,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      items: data.items?.map((item) => ({
        description: item.description,
        hsnCode: null,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
      })),
      discountAmount: data.discountAmount,
      notes: data.notes,
      terms: data.terms,
    });
    return transformInvoice(response.data.data);
  },

  async delete(id: string) {
    await api.delete(`/invoices/${id}`);
    return true;
  },

  async send(id: string) {
    const response = await api.post<ApiResponse<BackendInvoice>>(`/invoices/${id}/send`);
    return transformInvoice(response.data.data);
  },

  async markAsPaid(id: string) {
    const response = await api.post<ApiResponse<BackendInvoice>>(`/invoices/${id}/paid`);
    return transformInvoice(response.data.data);
  },

  async cancel(id: string) {
    const response = await api.post<ApiResponse<BackendInvoice>>(`/invoices/${id}/cancel`);
    return transformInvoice(response.data.data);
  },

  async duplicate(id: string) {
    const response = await api.post<ApiResponse<BackendInvoice>>(`/invoices/${id}/duplicate`);
    return transformInvoice(response.data.data);
  },
};
