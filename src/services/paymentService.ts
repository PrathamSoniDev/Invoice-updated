import api, { ApiResponse, PaginatedResponse } from '@/utils/apiClient';
import type { PaymentLink, Payment } from '@/types';

// Backend payment link response format
interface BackendPaymentLink {
  id: string;
  linkId: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    businessName: string;
  };
  invoiceId: string | null;
  amount: string;
  currency: string;
  gateway: string;
  status: string;
  gatewayLinkId: string | null;
  url: string | null;
  expiryDate: string;
  paidAt: string | null;
  description: string | null;
  createdAt: string;
}

interface BackendPayment {
  id: string;
  companyId: string;
  invoiceId: string | null;
  paymentLinkId: string | null;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    businessName: string;
  };
  invoice: {
    id: string;
    number: string;
  } | null;
  amount: string;
  method: string;
  status: string;
  gateway: string | null;
  transactionId: string;
  gatewayResponse: any;
  date: string;
  createdAt: string;
}

// Transform backend format to frontend format
function transformPaymentLink(backend: BackendPaymentLink): PaymentLink {
  return {
    id: backend.id,
    linkId: backend.linkId,
    customerId: backend.customerId,
    customerName: backend.customer.name,
    amount: parseFloat(backend.amount) || 0,
    currency: backend.currency,
    gateway: backend.gateway.toLowerCase() as PaymentLink['gateway'],
    status: backend.status.toLowerCase() as PaymentLink['status'],
    url: backend.url || '',
    expiryDate: backend.expiryDate,
    createdAt: backend.createdAt,
    paidAt: backend.paidAt || undefined,
    description: backend.description || undefined,
  };
}

function transformPayment(backend: BackendPayment): Payment {
  return {
    id: backend.id,
    invoiceId: backend.invoiceId || '',
    invoiceNumber: backend.invoice?.number || '',
    customerId: backend.customerId,
    customerName: backend.customer.name,
    amount: parseFloat(backend.amount) || 0,
    method: backend.method.toLowerCase() as Payment['method'],
    status: backend.status.toLowerCase() as Payment['status'],
    gateway: backend.gateway?.toLowerCase() as Payment['gateway'] | undefined,
    transactionId: backend.transactionId,
    date: backend.date,
  };
}

export const paymentService = {
  // Payment Links
  async listLinks(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendPaymentLink>>>('/payment-links', { params });
    return {
      ...response.data.data,
      data: response.data.data.data.map(transformPaymentLink),
    };
  },

  async getLink(id: string) {
    const response = await api.get<ApiResponse<BackendPaymentLink>>(`/payment-links/${id}`);
    return transformPaymentLink(response.data.data);
  },

  async createLink(data: { customerId: string; amount: number; gateway: string; description?: string; expiryDays?: number }) {
    const response = await api.post<ApiResponse<BackendPaymentLink>>('/payment-links', {
      customerId: data.customerId,
      amount: data.amount,
      gateway: data.gateway.toUpperCase(),
      description: data.description,
      expiryDays: data.expiryDays || 30,
    });
    return transformPaymentLink(response.data.data);
  },

  // Payments
  async listPayments(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendPayment>>>('/payments', { params });
    return {
      ...response.data.data,
      data: response.data.data.data.map(transformPayment),
    };
  },

  async getPayment(id: string) {
    const response = await api.get<ApiResponse<BackendPayment>>(`/payments/${id}`);
    return transformPayment(response.data.data);
  },

  async recordPayment(data: { invoiceId?: string; customerId: string; amount: number; method: string }) {
    const response = await api.post<ApiResponse<BackendPayment>>('/payments', {
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      amount: data.amount,
      method: data.method.toUpperCase(),
    });
    return transformPayment(response.data.data);
  },
};
