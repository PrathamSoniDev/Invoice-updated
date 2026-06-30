import api, { ApiResponse, PaginatedResponse } from '@/utils/apiClient';
import type { CommunicationLog, MessageTemplate, ActivityLog, AuditLog, User } from '@/types';

// Backend communication log response
interface BackendCommunicationLog {
  id: string;
  channel: string;
  recipient: string;
  recipientName: string;
  subject: string;
  body: string;
  status: string;
  templateId: string | null;
  template: { id: string; name: string } | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedReason: string | null;
  relatedType: string | null;
  relatedId: string | null;
  customerId: string | null;
  createdAt: string;
}

interface BackendMessageTemplate {
  id: string;
  companyId: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: any;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface BackendActivityLog {
  id: string;
  companyId: string;
  userId: string | null;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  metadata: any;
  timestamp: string;
}

interface BackendAuditLog {
  id: string;
  companyId: string;
  userId: string | null;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  entityId: string;
  entityName: string;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  changes: any;
  timestamp: string;
}

interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar: string | null;
  phone: string | null;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  createdAt: string;
}

function transformCommunicationLog(backend: BackendCommunicationLog): CommunicationLog {
  return {
    id: backend.id,
    channel: backend.channel.toLowerCase() as CommunicationLog['channel'],
    recipient: backend.recipient,
    recipientName: backend.recipientName,
    subject: backend.subject,
    body: backend.body,
    status: backend.status.toLowerCase() as CommunicationLog['status'],
    templateId: backend.templateId || undefined,
    templateName: backend.template?.name || undefined,
    sentAt: backend.sentAt || '',
    deliveredAt: backend.deliveredAt || undefined,
    readAt: backend.readAt || undefined,
    relatedTo: backend.relatedType && backend.relatedId ? {
      type: backend.relatedType as 'invoice' | 'payment' | 'customer',
      id: backend.relatedId,
    } : undefined,
  };
}

function transformMessageTemplate(backend: BackendMessageTemplate): MessageTemplate {
  return {
    id: backend.id,
    name: backend.name,
    channel: backend.channel.toLowerCase() as MessageTemplate['channel'],
    subject: backend.subject || '',
    body: backend.body,
    variables: Array.isArray(backend.variables) ? backend.variables : [],
    createdAt: backend.createdAt,
  };
}

function transformActivityLog(backend: BackendActivityLog): ActivityLog {
  return {
    id: backend.id,
    userId: backend.userId || '',
    userName: backend.userName,
    action: backend.action,
    entity: backend.entity,
    entityId: backend.entityId,
    description: backend.description,
    timestamp: backend.timestamp,
    metadata: backend.metadata || undefined,
  };
}

function transformAuditLog(backend: BackendAuditLog): AuditLog {
  return {
    id: backend.id,
    userId: backend.userId || '',
    userName: backend.userName,
    userRole: backend.userRole.toLowerCase() as AuditLog['userRole'],
    action: backend.action.toLowerCase() as AuditLog['action'],
    module: backend.module,
    entityId: backend.entityId,
    entityName: backend.entityName,
    description: backend.description,
    ipAddress: backend.ipAddress || '',
    timestamp: backend.timestamp,
    changes: backend.changes || undefined,
  };
}

function transformUser(backend: BackendUser): User {
  return {
    id: backend.id,
    name: backend.name,
    email: backend.email,
    role: backend.role.toLowerCase() as User['role'],
    status: backend.status.toLowerCase() as User['status'],
    avatar: backend.avatar || undefined,
    phone: backend.phone || undefined,
    lastActive: backend.lastActiveAt || undefined,
    createdAt: backend.createdAt,
    permissions: [],
  };
}

export const communicationService = {
  async listLogs(params?: { search?: string; channel?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendCommunicationLog>>>('/communication/logs', { params });
    return {
      ...response.data.data,
      data: response.data.data.data.map(transformCommunicationLog),
    };
  },

  async listTemplates() {
    const response = await api.get<ApiResponse<BackendMessageTemplate[]>>('/communication/templates');
    return response.data.data.map(transformMessageTemplate);
  },

  async createTemplate(data: Omit<MessageTemplate, 'id' | 'createdAt'>) {
    const response = await api.post<ApiResponse<BackendMessageTemplate>>('/communication/templates', {
      name: data.name,
      channel: data.channel.toUpperCase(),
      subject: data.subject,
      body: data.body,
      variables: data.variables,
    });
    return transformMessageTemplate(response.data.data);
  },
};

export const activityService = {
  async list(limit = 10) {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendActivityLog>>>('/admin/activity-logs', {
      params: { limit },
    });
    return response.data.data.data.map(transformActivityLog);
  },
};

export const auditService = {
  async list(params?: { search?: string; action?: string; module?: string; page?: number; limit?: number }) {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendAuditLog>>>('/admin/audit-logs', { params });
    return {
      ...response.data.data,
      data: response.data.data.data.map(transformAuditLog),
    };
  },
};

export const userService = {
  async list() {
    const response = await api.get<ApiResponse<PaginatedResponse<BackendUser>>>('/admin/users');
    return response.data.data.data.map(transformUser);
  },

  async create(data: Omit<User, 'id' | 'createdAt' | 'lastActive'>) {
    const response = await api.post<ApiResponse<BackendUser>>('/admin/users', {
      name: data.name,
      email: data.email,
      role: data.role.toUpperCase(),
      status: data.status?.toUpperCase() || 'ACTIVE',
      phone: data.phone,
    });
    return transformUser(response.data.data);
  },

  async update(id: string, data: Partial<User>) {
    const response = await api.put<ApiResponse<BackendUser>>(`/admin/users/${id}`, {
      name: data.name,
      role: data.role?.toUpperCase(),
      status: data.status?.toUpperCase(),
      phone: data.phone,
    });
    return transformUser(response.data.data);
  },

  async suspend(id: string) {
    await api.post(`/admin/users/${id}/suspend`);
    return id;
  },

  async delete(id: string) {
    await api.delete(`/admin/users/${id}`);
    return id;
  },
};
