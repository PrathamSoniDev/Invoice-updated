import api, { ApiResponse, PaginatedResponse } from '@/utils/apiClient';
import type { Customer } from '@/types';

// Backend customer response format
interface BackendCustomer {
  id: string;
  name: string;
  businessName: string;
  gstNumber: string | null;
  email: string;
  mobile: string;
  whatsapp: string | null;
  notes: string | null;
  status: string;
  billingLine1: string;
  billingLine2: string | null;
  billingCity: string;
  billingState: string;
  billingPincode: string;
  billingCountry: string;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPincode: string | null;
  shippingCountry: string | null;
  totalInvoices: number;
  totalRevenue: string;
  outstandingAmount: string;
  createdAt: string;
  updatedAt: string;
}

// Transform backend format to frontend format
function transformCustomer(backend: BackendCustomer): Customer {
  return {
    id: backend.id,
    name: backend.name,
    businessName: backend.businessName,
    gstNumber: backend.gstNumber || '',
    email: backend.email,
    mobile: backend.mobile,
    whatsapp: backend.whatsapp || '',
    billingAddress: {
      line1: backend.billingLine1,
      line2: backend.billingLine2 || undefined,
      city: backend.billingCity,
      state: backend.billingState,
      pincode: backend.billingPincode,
      country: backend.billingCountry,
    },
    shippingAddress: backend.shippingLine1 ? {
      line1: backend.shippingLine1,
      line2: backend.shippingLine2 || undefined,
      city: backend.shippingCity || '',
      state: backend.shippingState || '',
      pincode: backend.shippingPincode || '',
      country: backend.shippingCountry || '',
    } : {
      line1: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
    },
    notes: backend.notes || undefined,
    status: backend.status === 'active' ? 'active' : 'inactive',
    totalInvoices: backend.totalInvoices,
    totalRevenue: parseFloat(backend.totalRevenue) || 0,
    outstandingAmount: parseFloat(backend.outstandingAmount) || 0,
    createdAt: backend.createdAt,
    updatedAt: backend.updatedAt,
  };
}

// Transform frontend format to backend format
function toBackendFormat(customer: Partial<Customer> & { name: string; businessName: string; email: string; mobile: string }) {
  return {
    name: customer.name,
    businessName: customer.businessName,
    gstNumber: customer.gstNumber || null,
    email: customer.email,
    mobile: customer.mobile,
    whatsapp: customer.whatsapp || null,
    notes: customer.notes || null,
    billingLine1: customer.billingAddress?.line1 || '',
    billingLine2: customer.billingAddress?.line2 || null,
    billingCity: customer.billingAddress?.city || '',
    billingState: customer.billingAddress?.state || '',
    billingPincode: customer.billingAddress?.pincode || '',
    billingCountry: customer.billingAddress?.country || 'India',
    shippingLine1: customer.shippingAddress?.line1 || null,
    shippingLine2: customer.shippingAddress?.line2 || null,
    shippingCity: customer.shippingAddress?.city || null,
    shippingState: customer.shippingAddress?.state || null,
    shippingPincode: customer.shippingAddress?.pincode || null,
    shippingCountry: customer.shippingAddress?.country || null,
  };
}

export const customerService = {
  async list(params?: { search?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendCustomer>>>('/customers', { params });
    return {
      ...response.data.data,
      data: response.data.data.data.map(transformCustomer),
    };
  },

  async get(id: string) {
    const response = await api.get<ApiResponse<BackendCustomer>>(`/customers/${id}`);
    return transformCustomer(response.data.data);
  },

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalInvoices' | 'totalRevenue' | 'outstandingAmount'>) {
    const response = await api.post<ApiResponse<BackendCustomer>>('/customers', toBackendFormat(data));
    return transformCustomer(response.data.data);
  },

  async update(id: string, data: Partial<Customer>) {
    const response = await api.put<ApiResponse<BackendCustomer>>(`/customers/${id}`, toBackendFormat(data as any));
    return transformCustomer(response.data.data);
  },

  async delete(id: string) {
    await api.delete(`/customers/${id}`);
    return true;
  },
};
