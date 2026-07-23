/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { supabase } from "@/lib/supabase";
import {
  getCurrentCompanyId,
  getCurrentUserId,
  paginate,
  logActivity,
} from "@/lib/database";
import type { CommunicationLog, MessageTemplate } from "@/types";

// Reports Service
export const reportsService = {
  async getInvoiceReport(params?: any): Promise<any> {
    const companyId = await getCurrentCompanyId();

    let query = supabase
      .from("invoices")
      .select("*, customers!invoices_customerId_fkey(name, email)")
      .eq("companyId", companyId)
      .is("deletedAt", null);

    if (params?.startDate) {
      query = query.gte("issueDate", params.startDate);
    }
    if (params?.endDate) {
      query = query.lte("issueDate", params.endDate);
    }
    if (params?.status) {
      query = query.eq("status", params.status.toUpperCase());
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((inv) => ({
      id: inv.id,
      number: inv.number,
      customerName: (inv.customers as any)?.name,
      customerEmail: (inv.customers as any)?.email,
      status: inv.status.toLowerCase(),
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      total: parseFloat(inv.total),
      amountPaid: parseFloat(inv.amountPaid),
      balance: parseFloat(inv.balance),
    }));
  },

  async getAgingReport(_params?: any): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("invoices")
      .select("*, customers!invoices_customerId_fkey(name, email)")
      .eq("companyId", companyId)
      .in("status", ["SENT", "VIEWED", "OVERDUE"])
      .is("deletedAt", null);

    if (error) throw error;

    const now = new Date();
    const agingBuckets = {
      current: { range: "0-30", amount: 0, count: 0 },
      days31to60: { range: "31-60", amount: 0, count: 0 },
      days61to90: { range: "61-90", amount: 0, count: 0 },
      over90: { range: "90+", amount: 0, count: 0 },
    };

    (data || []).forEach((inv) => {
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const balance = parseFloat(inv.balance);

      if (daysOverdue <= 30) {
        agingBuckets.current.amount += balance;
        agingBuckets.current.count++;
      } else if (daysOverdue <= 60) {
        agingBuckets.days31to60.amount += balance;
        agingBuckets.days31to60.count++;
      } else if (daysOverdue <= 90) {
        agingBuckets.days61to90.amount += balance;
        agingBuckets.days61to90.count++;
      } else {
        agingBuckets.over90.amount += balance;
        agingBuckets.over90.count++;
      }
    });

    return Object.values(agingBuckets);
  },

  async getCustomerRevenueReport(_params?: any): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("customers")
      .select("id, name, email, totalRevenue, outstandingAmount, totalInvoices")
      .eq("companyId", companyId)
      .is("deletedAt", null)
      .order("totalRevenue", { ascending: false });

    if (error) throw error;

    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      totalRevenue: parseFloat(c.totalRevenue),
      outstandingAmount: parseFloat(c.outstandingAmount),
      invoiceCount: c.totalInvoices,
    }));
  },

  async getOutstandingReport(_params?: any): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("invoices")
      .select("*, customers!invoices_customerId_fkey(name, email)")
      .eq("companyId", companyId)
      .gt("balance", 0)
      .is("deletedAt", null);

    if (error) throw error;

    return (data || []).map((inv) => ({
      id: inv.id,
      number: inv.number,
      customerName: (inv.customers as any)?.name,
      customerEmail: (inv.customers as any)?.email,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      total: parseFloat(inv.total),
      balance: parseFloat(inv.balance),
      daysOverdue: Math.floor(
        (Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24),
      ),
    }));
  },

  async getPaymentReport(params?: any): Promise<any> {
    const companyId = await getCurrentCompanyId();

    let query = supabase
      .from("payments")
      .select(
        "*, customers!payments_customerId_fkey(name, email), invoices!payments_invoiceId_fkey(number)",
      )
      .eq("companyId", companyId);

    if (params?.startDate) {
      query = query.gte("date", params.startDate);
    }
    if (params?.endDate) {
      query = query.lte("date", params.endDate);
    }
    if (params?.method) {
      query = query.eq("method", params.method.toUpperCase());
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((p) => ({
      id: p.id,
      amount: parseFloat(p.amount),
      method: p.method.toLowerCase(),
      status: p.status.toLowerCase(),
      date: p.date,
      customerName: (p.customers as any)?.name,
      invoiceNumber: (p.invoices as any)?.number,
      transactionId: p.transactionId,
    }));
  },

  async getTaxReport(_params?: any): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id, number, taxAmount, total, issueDate, customers!invoices_customerId_fkey(name)",
      )
      .eq("companyId", companyId)
      .is("deletedAt", null);

    if (error) throw error;

    return (data || []).map((inv) => ({
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      customerName: (inv.customers as any)?.name,
      taxAmount: parseFloat(inv.taxAmount),
      total: parseFloat(inv.total),
      issueDate: inv.issueDate,
    }));
  },

  async getGatewayReport(_params?: any): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("payments")
      .select("gateway, amount, status")
      .eq("companyId", companyId)
      .not("gateway", "is", null);

    if (error) throw error;

    const gatewayStats: Record<
      string,
      { total: number; count: number; success: number }
    > = {};

    (data || []).forEach((p) => {
      const gateway = p.gateway?.toLowerCase() || "unknown";
      if (!gatewayStats[gateway]) {
        gatewayStats[gateway] = { total: 0, count: 0, success: 0 };
      }
      gatewayStats[gateway].total += parseFloat(p.amount);
      gatewayStats[gateway].count++;
      if (p.status === "PAID") {
        gatewayStats[gateway].success++;
      }
    });

    return Object.entries(gatewayStats).map(([gateway, stats]) => ({
      gateway,
      total: stats.total,
      count: stats.count,
      successRate: stats.count > 0 ? (stats.success / stats.count) * 100 : 0,
    }));
  },

  async getFinancialSummary(params?: { dateRange?: string }): Promise<any> {
    const companyId = await getCurrentCompanyId();

    let invoiceQuery = supabase
      .from('invoices')
      .select('status, total, taxAmount, balance, issueDate')
      .eq('companyId', companyId)
      .is('deletedAt', null);

    let paymentQuery = supabase
      .from('payments')
      .select('amount, status, date')
      .eq('companyId', companyId);

    // Apply date filter
    if (params?.dateRange) {
      const from = new Date();

      switch (params.dateRange) {
        case '7d':
          from.setDate(from.getDate() - 7);
          break;
        case '30d':
          from.setDate(from.getDate() - 30);
          break;
        case '3m':
          from.setMonth(from.getMonth() - 3);
          break;
        case '6m':
          from.setMonth(from.getMonth() - 6);
          break;
        case '12m':
          from.setMonth(from.getMonth() - 12);
          break;
      }

      invoiceQuery = invoiceQuery.gte('issueDate', from.toISOString());
      paymentQuery = paymentQuery.gte('date', from.toISOString());
    }

    const [{ data: invoices }, { data: payments }] = await Promise.all([
      invoiceQuery,
      paymentQuery,
    ]);

    const totalRevenue = (invoices || [])
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);

    const totalTax = (invoices || []).reduce(
      (sum, i) => sum + parseFloat(i.taxAmount || '0'),
      0,
    );

    const totalPayments = (payments || [])
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);

    return {
      totalRevenue,
      totalTax,
      totalPayments,
      pendingRevenue: (invoices || [])
        .filter((i) => ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status))
        .reduce((sum, i) => sum + parseFloat(i.balance || '0'), 0),
    };
  },

  async getSavedReports(): Promise<any[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("saved_reports")
      .select("*")
      .eq("companyId", companyId);

    if (error) throw error;

    return (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      config: r.config,
      lastRunAt: r.lastRunAt,
      createdAt: r.createdAt,
    }));
  },

  async saveReport(input: {
    name: string;
    type: string;
    config: any;
  }): Promise<any> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("saved_reports")
      .insert({
        companyId,
        name: input.name,
        type: input.type,
        config: input.config,
        createdById: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async deleteSavedReport(id: string): Promise<void> {
    await supabase.from("saved_reports").delete().eq("id", id);
  },
};

// Communication Service
export const communicationService = {
  async listLogs(params?: {
    search?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: CommunicationLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const companyId = await getCurrentCompanyId();
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    let query = supabase
      .from("communication_logs")
      .select("*", { count: "exact" })
      .eq("companyId", companyId)
      .order("createdAt", { ascending: false });

    if (params?.channel && params.channel !== "all") {
      query = query.eq("channel", params.channel.toUpperCase());
    }

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status.toUpperCase());
    }

    if(params?.search && params?.search.trim() !== ""){
      query = query.or(`recipientName.ilike.%${params?.search}%,subject.ilike.%${params?.search}%`)
    }

    const result = await paginate<any>(query, page, limit);

    return {
      ...result,
      data: result.data.map((log) => ({
        id: log.id,
        channel: log.channel.toLowerCase() as CommunicationLog["channel"],
        recipient: log.recipient,
        recipientName: log.recipientName,
        subject: log.subject,
        body: log.body,
        status: log.status.toLowerCase() as CommunicationLog["status"],
        templateId: log.templateId || undefined,
        templateName: log.templateName || undefined,
        sentAt: log.sentAt || "",
        deliveredAt: log.deliveredAt || undefined,
        readAt: log.readAt || undefined,
        relatedTo:
          log.relatedType && log.relatedId
            ? {
                type: log.relatedType as "invoice" | "payment" | "customer",
                id: log.relatedId,
              }
            : undefined,
      })),
    };
  },

  async listTemplates(): Promise<MessageTemplate[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('companyId', companyId)

    if (error) throw error;

    return (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      channel: t.channel.toLowerCase() as MessageTemplate['channel'],
      subject: t.subject ?? '',
      body: t.body ?? '',
      variables: Array.isArray(t.variables)
        ? t.variables
        : JSON.parse(t.variables || '[]'),
      createdAt: t.createdAt,

      isDefault: t.isDefault,
      isActive: t.isActive,
      updatedAt: t.updatedAt,
    }));
  },

  async createTemplate(
    input: Omit<MessageTemplate, "id" | "createdAt">,
  ): Promise<MessageTemplate> {
    const companyId = await getCurrentCompanyId();

    const { data: existing, error: existingError } = await supabase
        .from("message_templates")
        .select("*")
        .eq("companyId", companyId)
        .eq("channel", input.channel.toUpperCase());

      if (existingError) throw existingError;

      if ((existing?.length ?? 0) >= 2) {
        throw new Error(
          `Maximum 2 ${input.channel} templates are allowed.`
        );
      } 

    const { data, error } = await supabase
      .from("message_templates")
      .insert({
          companyId,
          name: input.name,
          channel: input.channel.toUpperCase(),
          subject: input.subject,
          body: input.body,
          variables: input.variables,
          isDefault: false,
          isActive: existing.length === 0,
      })      
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      channel: data.channel.toLowerCase() as MessageTemplate["channel"],
      subject: data.subject || "",
      body: data.body,
      variables: Array.isArray(data.variables) ? data.variables : [],
      isDefault: data.isDefault,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async setDefaultTemplate(id: string): Promise<void> {
    const companyId = await getCurrentCompanyId();

    // Selected template
    const { data: template, error: templateError } = await supabase
      .from("message_templates")
      .select("channel")
      .eq("id", id)
      .eq("companyId", companyId)
      .single();

    if (templateError) throw templateError;

    // Disable all templates of same channel
    const { error: resetError } = await supabase
      .from("message_templates")
      .update({ isDefault: false })
      .eq("companyId", companyId)
      .eq("channel", template.channel);

    if (resetError) throw resetError;

    // Selected template is default template
    const { error: updateError } = await supabase
      .from("message_templates")
      .update({
        isDefault: true,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("companyId", companyId);

    if (updateError) throw updateError;
  },

  async setActiveTemplate(templateId: string): Promise<void> {
    const companyId = await getCurrentCompanyId();

    // Find selected template
    const { data: template, error } = await supabase
      .from("message_templates")
      .select("channel")
      .eq("companyId", companyId)
      .eq("id", templateId)
      .single();

    if (error) throw error;
    if (!template) throw new Error("Template not found");

    // Disable all templates of same channel
    const { error: disableError } = await supabase
      .from("message_templates")
      .update({ isActive: false })
      .eq("companyId", companyId)
      .eq("channel", template.channel);

    if (disableError) throw disableError;

    // Activate selected template
    const { error: activeError } = await supabase
      .from("message_templates")
      .update({ isActive: true })
      .eq("companyId", companyId)
      .eq("id", templateId);

    if (activeError) throw activeError;
  },

  async updateTemplate(
    id: string,
    input: Omit<MessageTemplate, 'id' | 'createdAt'>
  ): Promise<MessageTemplate> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('message_templates')
      .update({
        name: input.name,
        channel: input.channel.toUpperCase(),
        subject: input.subject,
        body: input.body,
        variables: input.variables,
        isActive: input.isActive,
        isDefault: input.isDefault,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('companyId', companyId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      channel: data.channel.toLowerCase() as MessageTemplate['channel'],
      subject: data.subject ?? '',
      body: data.body,
      variables: Array.isArray(data.variables) ? data.variables : [],
      isActive: data.isActive,
      isDefault: data.isDefault,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async deleteTemplate(templateId: string): Promise<void> {
    const companyId = await getCurrentCompanyId();

    const { error } = await supabase
      .from("message_templates")
      .delete()
      .eq("companyId", companyId)
      .eq("id", templateId);

    if (error) throw error;
  },

  async sendInvoiceEmail(invoiceId: string, channel: string): Promise<any> {
    const companyId = await getCurrentCompanyId();

    // Scope invoice lookup by company so email actions cannot target another tenant.
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, customers!invoices_customerId_fkey(name, email)")
      .eq("companyId", companyId)
      .eq("id", invoiceId)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Invoice not found");

    const { data: template, error : templateErr } = await supabase
      .from("message_templates")
      .select("*")
      .eq("companyId", companyId)
      .eq("channel", channel)
      .eq("isActive", true)
      .single();

    if (templateErr) throw templateErr;
    if (!template) throw new Error(`Template not found for ${channel} logs communication`);

    // Log the communication
    const { data: log, error } = await supabase
      .from("communication_logs")
      .insert({
        companyId,
        // channel: "EMAIL",
        channel,
        templateId : template?.id,
        templateName: template?.name,
        recipient: (invoice.customers as any)?.email,
        recipientName: (invoice.customers as any)?.name,
        subject: `Invoice ${invoice.number}`,
        body: `Invoice ${invoice.number} for amount ${invoice.total}`,
        status: "SENT",
        sentAt: new Date().toISOString(),
        relatedType: "invoice",
        relatedId: invoiceId,
        customerId: invoice.customerId,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "SENT",
        sentAt: new Date().toISOString(),
      })
      .eq("companyId", companyId)
      .eq("id", invoiceId);

    if (updateError) throw updateError;

    await logActivity(
      "update",
      "invoice",
      invoiceId,
      `Sent invoice ${invoice.number} via email`,
    );

    return log;
  },

  async getStats(startDate?: Date, endDate?: Date): Promise<any> {
    const companyId = await getCurrentCompanyId();

    let query = supabase
      .from("communication_logs")
      .select("channel, status")
      .eq("companyId", companyId);

    if (startDate) {
      query = query.gte("createdAt", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("createdAt", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      email: { sent: 0, delivered: 0, read: 0, failed: 0 },
      whatsapp: { sent: 0, delivered: 0, read: 0, failed: 0 },
      sms: { sent: 0, delivered: 0, read: 0, failed: 0 },
    };

    (data || []).forEach((log) => {
      const channel = log.channel.toLowerCase() as keyof typeof stats;
      const status = log.status.toLowerCase();

      if (stats[channel]) {
        if (status === "sent") stats[channel].sent++;
        else if (status === "delivered") stats[channel].delivered++;
        else if (status === "read") stats[channel].read++;
        else if (status === "failed") stats[channel].failed++;
      }
    });

    return stats;
  },
};

// Exports Service
export const exportsService = {
  async queueExport(input: {
    reportType: string;
    format: string;
    dateRange?: string;
    filters?: any;
  }): Promise<{ exportId: string; status: string }> {
    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("export_history")
      .insert({
        companyId,
        userId,
        type: input.reportType,
        format: input.format,
        config: { dateRange: input.dateRange, filters: input.filters },
        status: "PENDING",
      })
      .select()
      .single();

    if (error) throw error;

    // In a real app, this would queue a background job
    // For now, we'll just mark it as completed immediately
    const { error: completeError } = await supabase
      .from("export_history")
      .update({
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        fileUrl: `/exports/${data.id}.${input.format}`,
      })
      .eq("companyId", companyId)
      .eq("id", data.id);

    if (completeError) throw completeError;

    return { exportId: data.id, status: "COMPLETED" };
  },

  async getExportStatus(id: string): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("export_history")
      .select("*")
      .eq("companyId", companyId)
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      status: data.status.toLowerCase(),
      fileType: data.format,
      fileUrl: data.fileUrl,
      error: data.error,
    };
  },

  async downloadExport(id: string): Promise<Blob> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("export_history")
      .select("*")
      .eq("companyId", companyId)
      .eq("id", id)
      .single();

    if (error) throw error;

    // Return a dummy blob for now
    return new Blob([JSON.stringify(data.config || {})], {
      type: "application/json",
    });
  },

  async getExportHistory(): Promise<any[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("export_history")
      .select("*")
      .eq("companyId", companyId)
      .order("createdAt", { ascending: false });

    if (error) throw error;

    return (data || []).map((e) => ({
      id: e.id,
      type: e.type,
      format: e.format,
      status: e.status.toLowerCase(),
      createdAt: e.createdAt,
      completedAt: e.completedAt,
    }));
  },
};

// Analytics Service
export const analyticsService = {
  async getRevenueAnalytics(_period?: string): Promise<any> {
    // Use the dashboard service's revenue trend
    return reportsService.getFinancialSummary();
  },

  async getInvoiceAnalytics(_period?: string): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("invoices")
      .select("status")
      .eq("companyId", companyId)
      .is("deletedAt", null);

    if (error) throw error;

    const statusCounts: Record<string, number> = {};
    (data || []).forEach((inv) => {
      const status = inv.status.toLowerCase();
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return statusCounts;
  },

  async getCustomerAnalytics(_period?: string): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { count: total } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("companyId", companyId)
      .is("deletedAt", null);

    const { count: active } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("companyId", companyId)
      .eq("status", "active")
      .is("deletedAt", null);

    return { total: total || 0, active: active || 0 };
  },

  async getPaymentAnalytics(_period?: string): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("payments")
      .select("method, status")
      .eq("companyId", companyId);

    if (error) throw error;

    const methodCounts: Record<string, number> = {};
    (data || []).forEach((p) => {
      const method = p.method?.toLowerCase() || "unknown";
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    return methodCounts;
  },

  async getOutstandingAnalytics(): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from("invoices")
      .select("balance")
      .eq("companyId", companyId)
      .gt("balance", 0)
      .is("deletedAt", null);

    if (error) throw error;

    const totalOutstanding = (data || []).reduce(
      (sum, inv) => sum + parseFloat(inv.balance || "0"),
      0,
    );
    const count = (data || []).length;

    return { total: totalOutstanding, count };
  },

  async getMovingAverage(metric: string, _days?: number): Promise<any> {
    // Return mock moving average data
    return {
      metric,
      average: 0,
      trend: "stable",
    };
  },
};

// Export with backwards compatible names
export const reportsApi = reportsService;
export const communicationApi = communicationService;
export const exportsApi = exportsService;
export const analyticsApi = analyticsService;
