/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ChartWrapper } from '@/components/common/ChartWrapper';
import { ExportButton } from '@/components/common/ExportButton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/common/DataTable';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatCurrency, formatDate } from '@/utils';
import { reportsApi, dashboardApi } from '@/utils/api';
import { invoiceService } from '@/services/invoiceService';
import { customerService } from '@/services/customerService';
import { paymentService } from '@/services/paymentService';
import { BarChart3, Wallet, FileText, TrendingUp, Clock, AlertTriangle, Loader2, CalendarClock, Trash2 } from 'lucide-react';
import type { Invoice, Customer, Payment, CompanyInfo } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { ReportConfig } from '@/utils/reportExport';
import { scheduledReportsService, type ScheduledReport, type ReportFrequency } from '@/services/scheduledReportsService';
import { toast } from 'sonner';

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

type ReportType = 'overview' | 'invoices' | 'customers' | 'payments' | 'tax';

type ExportRow = Record<string, string | number>;

const fallbackCompany: CompanyInfo = {
  name: 'InvoiceGen',
  legalName: 'InvoiceGen',
  gstNumber: '',
  panNumber: '',
  email: '',
  phone: '',
  website: '',
  address: {
    line1: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  },
};

const dateRangeLabels: Record<string, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '12m': 'Last 12 months',
};

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('12m');
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { company } = useSettingsStore();

  const months =
  dateRange === "7d" ? 1 :
  dateRange === "30d" ? 1 :
  dateRange === "3m" ? 3 : 
  dateRange === "6m" ? 6 :
  12;

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    paidRevenue: 0,
    outstanding: 0,
    overdueAmount: 0,
  });
  const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
  const [invoiceTrend, setInvoiceTrend] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // ---- Scheduled report delivery ----
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<ReportFrequency>('weekly');
  const [scheduleEmails, setScheduleEmails] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      const list = await scheduledReportsService.list();
      setSchedules(list);
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCreateSchedule = async () => {
    const emails = scheduleEmails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast.error('Add at least one recipient email');
      return;
    }
    setScheduleSaving(true);
    try {
      await scheduledReportsService.create({
        reportType: activeReport,
        filters: { dateRange },
        frequency: scheduleFrequency,
        recipientEmails: emails,
      });
      toast.success('Report scheduled');
      setScheduleDialogOpen(false);
      setScheduleEmails('');
      await loadSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule report');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await scheduledReportsService.delete(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      toast.success('Schedule removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove schedule');
    }
  };

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, invoiceTrendData, revenue, invoicesData, customersData, paymentsData] = await Promise.all([
        reportsApi.getFinancialSummary({ dateRange }).catch(() => null),
        dashboardApi.getChartData("invoice-trend", months).catch(() => ({ data: [] })),
        dashboardApi.getChartData('revenue-trend', months).catch(() => ({ data: [] })),
        invoiceService.list({ limit: 100 }).catch(() => ({ data: [] })),
        customerService.list({ limit: 100 }).catch(() => ({ data: [] })),
        paymentService.listPayments({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      if (summaryData) {
        setSummary({
          totalRevenue: summaryData.totalRevenue || 0,
          paidRevenue: summaryData.totalPayments || 0,
          outstanding: summaryData.pendingRevenue || 0,
          overdueAmount: summaryData.totalTax || 0,
        });        
      }

      setRevenueTrend(revenue?.data || []);
      setInvoiceTrend(invoiceTrendData?.data || []);
      setInvoices(invoicesData.data || []);
      setCustomers(customersData.data || []);
      setPayments(paymentsData.data || []);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const dateRangeLabel = dateRangeLabels[dateRange] || 'All time';

  const taxData = useMemo(() => invoices.map((inv) => ({
    id: inv.id,
    invoice: inv.number,
    customer: inv.customerName,
    subtotal: inv.subtotal,
    tax: inv.taxAmount,
    total: inv.total,
    date: formatDate(inv.issueDate),
  })), [invoices]);

  const summaryCards = useMemo(() => [
    { label: 'Total Revenue', value: formatCurrency(summary.totalRevenue) },
    { label: 'Paid Revenue', value: formatCurrency(summary.paidRevenue) },
    { label: 'Outstanding', value: formatCurrency(summary.outstanding) },
    { label: 'Overdue Amount', value: formatCurrency(summary.overdueAmount) },
  ], [summary]);

  const exportConfigs = useMemo<Record<ReportType, ReportConfig>>(() => {
    const base = {
      dateRange: dateRangeLabel,
      userName: user?.name || 'Current user',
      company: company || user?.companyInfo || fallbackCompany,
      summaryCards,
    };

    return {
      overview: {
        ...base,
        title: 'Overview Report',
        columns: [
          { key: 'label', label: 'Period' },
          { key: 'revenue', label: 'Revenue' },
          { key: 'created', label: 'Invoices Created' },
          { key: 'paid', label: 'Invoices Paid' },
        ],        
      rows: revenueTrend.map((rev, index) => ({
          label: rev.month,
          revenue: formatCurrency(rev.revenue),
          created: invoiceTrend[index]?.created ?? 0,
          paid: invoiceTrend[index]?.paid ?? 0,
      })),
        chartData: revenueTrend.map((point) => ({ label: String(point.month ?? ''), value: Number(point.revenue ?? 0) })),
      },
      invoices: {
        ...base,
        title: 'Invoice Report',
        columns: [
          { key: 'number', label: 'Invoice #' },
          { key: 'customer', label: 'Customer' },
          { key: 'date', label: 'Date' },
          { key: 'total', label: 'Total' },
          { key: 'tax', label: 'Tax' },
        ],
        rows: invoices.map((invoice): ExportRow => ({
          number: invoice.number,
          customer: invoice.customerName,
          date: formatDate(invoice.issueDate, 'short'),
          total: formatCurrency(invoice.total),
          tax: formatCurrency(invoice.taxAmount),
        })),
      },
      customers: {
        ...base,
        title: 'Customer Revenue Report',
        columns: [
          { key: 'name', label: 'Customer' },
          { key: 'business', label: 'Business' },
          { key: 'invoices', label: 'Invoices' },
          { key: 'revenue', label: 'Revenue' },
          { key: 'outstanding', label: 'Outstanding' },
        ],
        rows: customers.map((customer): ExportRow => ({
          name: customer.name,
          business: customer.businessName,
          invoices: customer.totalInvoices,
          revenue: formatCurrency(customer.totalRevenue),
          outstanding: formatCurrency(customer.outstandingAmount),
        })),
      },
      payments: {
        ...base,
        title: 'Payment Report',
        columns: [
          { key: 'invoice', label: 'Invoice #' },
          { key: 'customer', label: 'Customer' },
          { key: 'date', label: 'Date' },
          { key: 'amount', label: 'Amount' },
          { key: 'method', label: 'Method' },
          { key: 'status', label: 'Status' },
        ],
        rows: payments.map((payment): ExportRow => ({
          invoice: payment.invoiceNumber,
          customer: payment.customerName,
          date: formatDate(payment.date, 'short'),
          amount: formatCurrency(payment.amount),
          method: payment.method,
          status: payment.status,
        })),
      },
      tax: {
        ...base,
        title: 'Tax Report (GST)',
        columns: [
          { key: 'invoice', label: 'Invoice' },
          { key: 'customer', label: 'Customer' },
          { key: 'subtotal', label: 'Subtotal' },
          { key: 'tax', label: 'Tax' },
          { key: 'total', label: 'Total' },
          { key: 'date', label: 'Date' },
        ],
        rows: taxData.map((row): ExportRow => ({
          invoice: row.invoice,
          customer: row.customer,
          subtotal: formatCurrency(row.subtotal),
          tax: formatCurrency(row.tax),
          total: formatCurrency(row.total),
          date: row.date,
        })),
      },
    };
  }, [company, customers, dateRangeLabel, invoices, payments, revenueTrend, summaryCards, taxData, user]);

  const activeExportConfig = exportConfigs[activeReport];

  const invoiceColumns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice #', cell: (r) => <span className="font-mono text-sm">{r.number}</span> },
    { key: 'customer', header: 'Customer', cell: (r) => <span className="text-sm">{r.customerName}</span> },
    { key: 'date', header: 'Date', cell: (r) => <span className="text-sm">{formatDate(r.issueDate, 'short')}</span> },
    { key: 'total', header: 'Total', cell: (r) => <span className="text-sm font-semibold">{formatCurrency(r.total)}</span> },
    { key: 'tax', header: 'Tax', cell: (r) => <span className="text-sm">{formatCurrency(r.taxAmount)}</span> },
  ];

  const customerColumns: Column<Customer>[] = [
    { key: 'name', header: 'Customer', cell: (r) => <span className="text-sm font-medium">{r.name}</span> },
    { key: 'business', header: 'Business', cell: (r) => <span className="text-sm">{r.businessName}</span> },
    { key: 'invoices', header: 'Invoices', cell: (r) => <span className="text-sm">{r.totalInvoices}</span> },
    { key: 'revenue', header: 'Revenue', cell: (r) => <span className="text-sm font-semibold">{formatCurrency(r.totalRevenue)}</span> },
    { key: 'outstanding', header: 'Outstanding', cell: (r) => <span className="text-sm">{formatCurrency(r.outstandingAmount)}</span> },
  ];

  const paymentColumns: Column<Payment>[] = [
    { key: 'invoice', header: 'Invoice #', cell: (r) => <span className="font-mono text-sm">{r.invoiceNumber}</span> },
    { key: 'customer', header: 'Customer', cell: (r) => <span className="text-sm">{r.customerName}</span> },
    { key: 'date', header: 'Date', cell: (r) => <span className="text-sm">{formatDate(r.date, 'short')}</span> },
    { key: 'amount', header: 'Amount', cell: (r) => <span className="text-sm font-semibold">{formatCurrency(r.amount)}</span> },
    { key: 'method', header: 'Method', cell: (r) => <span className="text-sm capitalize">{r.method}</span> },
    { key: 'status', header: 'Status', cell: (r) => <span className="text-sm capitalize">{r.status}</span> },
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
      <PageHeader
        title="Reports"
        description="Comprehensive business analytics and financial reports"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => setScheduleDialogOpen(true)}>
              <CalendarClock className="h-4 w-4" /> Schedule
            </Button>
            <ExportButton
              reportTitle={activeExportConfig.title}
              config={activeExportConfig}
              disabled={activeExportConfig.rows.length === 0}
            />
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={Wallet} accent="primary" />
        <StatCard title="Paid Revenue" value={formatCurrency(summary.paidRevenue)} icon={TrendingUp} accent="success" />
        <StatCard title="Outstanding" value={formatCurrency(summary.outstanding)} icon={Clock} accent="warning" />
        <StatCard title="Overdue Amount" value={formatCurrency(summary.overdueAmount)} icon={AlertTriangle} accent="destructive" />       
      </div>

      {/* Tabs for different report types */}
      <Tabs value={activeReport} onValueChange={(value) => setActiveReport(value as ReportType)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartWrapper title="Revenue Trend" description={dateRangeLabel} icon={Wallet}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />                  
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#reportRevenueGradient)" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <ChartWrapper title="Invoice Trend" description={dateRangeLabel} icon={FileText}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={invoiceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />                                  
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend />
                  <Bar dataKey="created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Created" />
                  <Bar dataKey="paid" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Invoice Report</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={invoiceColumns}
                data={invoices}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Customer Revenue Report</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={customerColumns}
                data={customers}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Payment Report</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={paymentColumns}
                data={payments}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Tax Report (GST)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-6 gap-4 p-4 bg-muted/50 font-medium text-sm">
                  <div>Invoice</div>
                  <div>Customer</div>
                  <div className="text-right">Subtotal</div>
                  <div className="text-right">Tax</div>
                  <div className="text-right">Total</div>
                  <div>Date</div>
                </div>
                <div className="divide-y">
                  {taxData.map((row, i) => (
                    <div key={i} className="grid grid-cols-6 gap-4 p-4 text-sm">
                      <div className="font-mono">{row.invoice}</div>
                      <div>{row.customer}</div>
                      <div className="text-right">{formatCurrency(row.subtotal)}</div>
                      <div className="text-right">{formatCurrency(row.tax)}</div>
                      <div className="text-right font-semibold">{formatCurrency(row.total)}</div>
                      <div className="text-muted-foreground">{row.date}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Card className="shadow-soft">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Tax Collected</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(taxData.reduce((s, r) => s + r.tax, 0))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-soft">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Taxable Value</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(taxData.reduce((s, r) => s + r.subtotal, 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Existing scheduled reports */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Scheduled Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <span className="font-medium capitalize">{schedule.reportType}</span>
                  <span className="text-muted-foreground"> — {schedule.frequency}, to {schedule.recipientEmails.join(', ')}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Next send: {formatDate(schedule.nextSendAt)}
                    {schedule.lastSentAt ? ` · Last sent: ${formatDate(schedule.lastSentAt)}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteSchedule(schedule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Schedule dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" /> Schedule this report
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              The <span className="font-medium capitalize">{activeReport}</span> report will be regenerated and emailed automatically.
            </p>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as ReportFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Recipient Emails</Label>
              <Input
                value={scheduleEmails}
                onChange={(e) => setScheduleEmails(e.target.value)}
                placeholder="you@company.com, finance@company.com"
              />
              <p className="text-xs text-muted-foreground">Comma-separated for multiple recipients.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSchedule} disabled={scheduleSaving}>
              {scheduleSaving ? 'Saving…' : 'Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
