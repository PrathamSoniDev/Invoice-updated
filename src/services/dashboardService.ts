/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId } from '@/lib/database';
import type { DashboardMetrics, RevenueTrendPoint, InvoiceTrendPoint, CustomerGrowthPoint } from '@/types';

export const dashboardService = {
  async getSummary(): Promise<DashboardMetrics> {
    const companyId = await getCurrentCompanyId();

    // Get invoice counts and totals
    const { data: invoices } = await supabase
      .from('invoices')
      .select('status, total')
      .eq('companyId', companyId)
      .is('deletedAt', null);

    // Get customer count
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .is('deletedAt', null);

    // Get payment link count
    const { count: totalPaymentLinks } = await supabase
      .from('payment_links')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .is('deletedAt', null);

    // Get payment stats
    const { data: payments } = await supabase
      .from('payments')
      .select('status, amount')
      .eq('companyId', companyId);

    const totalRevenue = (invoices || [])
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);

    const paidRevenue = (invoices || [])
      .filter((i) => i.status === 'PAID')
      .reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);

    const pendingRevenue = (invoices || [])
      .filter((i) => ['SENT', 'VIEWED', 'OVERDUE'].includes(i.status))
      .reduce((sum, i) => sum + parseFloat(i.total || '0'), 0);

    const successfulPayments = (payments || []).filter((p) => p.status === 'PAID').length;
    const failedPayments = (payments || []).filter((p) => p.status === 'FAILED').length;

    return {
      totalInvoices: invoices?.length || 0,
      totalCustomers: totalCustomers || 0,
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      totalPaymentLinks: totalPaymentLinks || 0,
      successfulPayments,
      failedPayments,
    };
  },

  async getRevenueTrend(months: number = 6): Promise<RevenueTrendPoint[]> {
    const companyId = await getCurrentCompanyId();
    const trend: RevenueTrendPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i, 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, total')
        .eq('companyId', companyId)
        .is('deletedAt', null)
        .gte('issueDate', startDate.toISOString())
        .lt('issueDate', endDate.toISOString());

      const revenue = (invoices || []).reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);
      const paid = (invoices || [])
        .filter((inv) => inv.status === 'PAID')
        .reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);

      trend.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue,
        paid,
        pending: revenue - paid,
      });
    }

    return trend;
  },

  async getInvoiceTrend(months: number = 6): Promise<InvoiceTrendPoint[]> {
    const companyId = await getCurrentCompanyId();
    const trend: InvoiceTrendPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i, 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('status')
        .eq('companyId', companyId)
        .is('deletedAt', null)
        .gte('issueDate', startDate.toISOString())
        .lt('issueDate', endDate.toISOString());

      const created = invoices?.length || 0;
      const paid = invoices?.filter((inv) => inv.status === 'PAID').length || 0;
      const overdue = invoices?.filter((inv) => inv.status === 'OVERDUE').length || 0;

      trend.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        created,
        paid,
        overdue,
      });
    }

    return trend;
  },

  async getCustomerGrowth(months: number = 6): Promise<CustomerGrowthPoint[]> {
    const companyId = await getCurrentCompanyId();
    const trend: CustomerGrowthPoint[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i, 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      // Get new customers in this month
      const { count: newCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', companyId)
        .is('deletedAt', null)
        .gte('createdAt', startDate.toISOString())
        .lt('createdAt', endDate.toISOString());

      // Get total customers up to this month
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', companyId)
        .is('deletedAt', null)
        .lt('createdAt', endDate.toISOString());

      trend.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: totalCustomers || 0,
        new: newCustomers || 0,
      });
    }

    return trend;
  },

  async getTopCustomers(limit: number = 5): Promise<{ id: string; name: string; revenue: number }[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, totalRevenue')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('totalRevenue', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      revenue: parseFloat(c.totalRevenue) || 0,
    }));
  },

  async getRecentInvoices(limit: number = 5): Promise<any[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('invoices')
      .select('id, number, status, total, issueDate, customers!invoices_customerId_fkey(name, email)')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status.toLowerCase(),
      total: parseFloat(inv.total || '0'),
      date: inv.issueDate,
      customerName: (inv.customers as any)?.name,
      customerEmail: (inv.customers as any)?.email,
    }));
  },

  async getRecentPayments(limit: number = 5): Promise<any[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, method, status, date, customers!payments_customerId_fkey(name)')
      .eq('companyId', companyId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((p) => ({
      id: p.id,
      amount: parseFloat(p.amount || '0'),
      method: p.method?.toLowerCase(),
      status: p.status.toLowerCase(),
      date: p.date,
      customerName: (p.customers as any)?.name,
    }));
  },

  async getRecentActivities(limit: number = 10): Promise<any[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((a) => ({
      id: a.id,
      action: a.action,
      description: a.description,
      entityType: a.entityType,
      entityId: a.entityId,
      timestamp: a.createdAt,
      userName: a.userName,
    }));
  },

  async getPaymentDistribution(): Promise<{ name: string; value: number; color: string }[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('payments')
      .select('method')
      .eq('companyId', companyId)
      .eq('status', 'PAID');

    if (error) throw error;

    const distribution: Record<string, number> = {};
    (data || []).forEach((p) => {
      const method = p.method.toLowerCase();
      distribution[method] = (distribution[method] || 0) + 1;
    });

    const colors: Record<string, string> = {
      upi: '#3B82F6',
      card: '#10B981',
      netbanking: '#F59E0B',
      wallet: '#8B5CF6',
      cash: '#EF4444',
      cheque: '#6B7280',
    };

    return Object.entries(distribution).map(([method, count]) => ({
      name: method.toUpperCase(),
      value: count,
      color: colors[method] || '#6B7280',
    }));
  },

  async getInvoiceStatusDistribution(): Promise<{ name: string; value: number; color: string }[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('invoices')
      .select('status')
      .eq('companyId', companyId)
      .is('deletedAt', null);

    if (error) throw error;

    const distribution: Record<string, number> = {};
    (data || []).forEach((inv) => {
      const status = inv.status.toLowerCase();
      distribution[status] = (distribution[status] || 0) + 1;
    });

    const colors: Record<string, string> = {
      draft: '#6B7280',
      sent: '#3B82F6',
      viewed: '#8B5CF6',
      paid: '#10B981',
      overdue: '#EF4444',
      cancelled: '#9CA3AF',
    };

    return Object.entries(distribution).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colors[status] || '#6B7280',
    }));
  },

  async refresh(): Promise<void> {
    // Recalculate all computed fields if needed
    // This is a placeholder for any cache invalidation or recalculation logic
  },

  async getChartData(type: string, months: number): Promise<{ data: any[] }> {
    switch (type) {
      case 'revenue-trend':
        return { data: await this.getRevenueTrend(months) };
      case 'invoice-trend':
        return { data: await this.getInvoiceTrend(months) };
      case 'customer-growth':
        return { data: await this.getCustomerGrowth(months) };
      case 'payment-distribution':
        return { data: await this.getPaymentDistribution() };
      default:
        return { data: [] };
    }
  },
};

// Export with the expected name for backwards compatibility
export const dashboardApi = dashboardService;
