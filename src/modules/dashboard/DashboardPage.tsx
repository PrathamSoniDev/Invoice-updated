import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard, MetricCard } from '@/components/common/StatCard';
import { ChartWrapper } from '@/components/common/ChartWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ActivityTimeline } from '@/components/common/ActivityTimeline';
import {
  FileText, Users, Wallet, TrendingUp, CreditCard, CheckCircle, XCircle,
  Clock, ArrowRight, Plus, Link as LinkIcon, BarChart3, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { dashboardApi } from '@/utils/api';
import { invoiceService } from '@/services/invoiceService';
import { formatCurrency, formatDate, getInitials } from '@/utils';

interface DashboardMetrics {
  totalInvoices: number;
  totalCustomers: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  totalPaymentLinks: number;
  successfulPayments: number;
  failedPayments: number;
}

interface RevenueTrendPoint {
  month: string;
  revenue: number;
  paid: number;
  pending: number;
}

interface InvoiceTrendPoint {
  month: string;
  created: number;
  paid: number;
  overdue: number;
}

interface CustomerGrowthPoint {
  month: string;
  total: number;
  new: number;
}

interface PaymentDistributionPoint {
  name: string;
  value: number;
  color: string;
}

interface RecentInvoice {
  id: string;
  number: string;
  customerName: string;
  total: number;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  userName: string;
  action: string;
  description: string;
  timestamp: string;
}

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

const COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

export function DashboardPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalInvoices: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    pendingRevenue: 0,
    totalPaymentLinks: 0,
    successfulPayments: 0,
    failedPayments: 0,
  });
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [invoiceTrend, setInvoiceTrend] = useState<InvoiceTrendPoint[]>([]);
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowthPoint[]>([]);
  const [paymentDistribution, setPaymentDistribution] = useState<PaymentDistributionPoint[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [summary, revenue, invoices, customers, payments, recentInvs, recentActs] = await Promise.all([
        dashboardApi.getSummary().catch(() => null),
        dashboardApi.getChartData('revenue-trend').catch(() => ({ data: [] })),
        dashboardApi.getChartData('invoice-trend').catch(() => ({ data: [] })),
        dashboardApi.getChartData('customer-growth').catch(() => ({ data: [] })),
        dashboardApi.getChartData('payment-distribution').catch(() => ({ data: [] })),
        invoiceService.list({ limit: 5 }).catch(() => ({ data: [] })),
        dashboardApi.getRecentActivities(10).catch(() => ({ data: [] })),
      ]);

      if (summary) {
        setMetrics({
          totalInvoices: summary.totalInvoices || 0,
          totalCustomers: summary.totalCustomers || 0,
          totalRevenue: summary.totalRevenue || 0,
          paidRevenue: summary.paidRevenue || 0,
          pendingRevenue: summary.pendingRevenue || 0,
          totalPaymentLinks: summary.totalPaymentLinks || 0,
          successfulPayments: summary.successfulPayments || 0,
          failedPayments: summary.failedPayments || 0,
        });
      }

      setRevenueTrend(revenue?.data || []);
      setInvoiceTrend(invoices?.data || []);
      setCustomerGrowth(customers?.data || []);
      setPaymentDistribution(payments?.data || []);
      setRecentInvoices(recentInvs?.data || []);
      setActivities(Array.isArray(recentActs) ? recentActs : recentActs?.data || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'New Invoice', icon: FileText, path: '/invoices/new', color: 'bg-primary/10 text-primary' },
    { label: 'Add Customer', icon: Plus, path: '/customers/new', color: 'bg-success/10 text-success' },
    { label: 'Payment Link', icon: LinkIcon, path: '/payment-links/new', color: 'bg-info/10 text-info' },
    { label: 'View Reports', icon: BarChart3, path: '/reports', color: 'bg-warning/10 text-warning' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's what's happening with your business.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/reports')}>View Reports</Button>
          <Button size="sm" onClick={() => navigate('/invoices/new')} className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon={Wallet} accent="primary" trend={{ value: 12.5, label: 'vs last month' }} />
        <StatCard title="Total Invoices" value={metrics.totalInvoices} icon={FileText} accent="info" trend={{ value: 8.2, label: 'vs last month' }} />
        <StatCard title="Total Customers" value={metrics.totalCustomers} icon={Users} accent="success" trend={{ value: 5.1, label: 'vs last month' }} />
        <StatCard title="Payment Links" value={metrics.totalPaymentLinks} icon={CreditCard} accent="warning" trend={{ value: -2.3, label: 'vs last month' }} />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Paid Revenue" value={formatCurrency(metrics.paidRevenue)} subtitle="Collected" icon={CheckCircle} />
        <MetricCard title="Pending Revenue" value={formatCurrency(metrics.pendingRevenue)} subtitle="Awaiting payment" icon={Clock} />
        <MetricCard title="Successful Payments" value={metrics.successfulPayments} subtitle="Completed" icon={TrendingUp} />
        <MetricCard title="Failed Payments" value={metrics.failedPayments} subtitle="Requires attention" icon={XCircle} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartWrapper
          title="Revenue Trend"
          description="Monthly revenue overview"
          icon={TrendingUp}
          className="lg:col-span-2"
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>Details</Button>}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revGradient)" name="Total Revenue" />
              <Area type="monotone" dataKey="paid" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#paidGradient)" name="Paid" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Payment Distribution" description="By status" icon={CreditCard}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={paymentDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {paymentDistribution.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartWrapper title="Invoice Trend" description="Monthly invoice statistics" icon={FileText}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={invoiceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Created" />
              <Bar dataKey="paid" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Paid" />
              <Bar dataKey="overdue" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Overdue" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Customer Growth" description="New customers over time" icon={Users}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={customerGrowth} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="customerGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#customerGradient)" name="Total Customers" />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--info))" strokeWidth={2} fill="transparent" name="New Customers" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      {/* Quick Actions & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className={`flex flex-col items-center gap-2 rounded-lg p-4 transition-colors hover:bg-muted/50 ${action.color}`}
                >
                  <action.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="lg:col-span-2 shadow-soft">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/invoices')} className="gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.id}
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                        {getInitials(invoice.customerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">{invoice.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(invoice.total)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(invoice.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <Card className="shadow-soft">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline items={activities.map((a) => ({
              id: a.id,
              userName: a.userName,
              action: a.action,
              description: a.description,
              timestamp: a.timestamp,
            }))} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
