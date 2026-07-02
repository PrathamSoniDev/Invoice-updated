/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ChartWrapper } from '@/components/common/ChartWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
// import { ExportButton } from '@/components/common/ExportButton';
import { reportsApi, dashboardApi } from '@/utils/api';
import { invoiceService } from '@/services/invoiceService';
import { customerService } from '@/services/customerService';
import { paymentService } from '@/services/paymentService';
import { BarChart3, Wallet, FileText, TrendingUp, Clock, AlertTriangle, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { Invoice, Customer, Payment } from '@/types';

const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
  color: 'hsl(var(--foreground))',
};

export function ReportsPage() {
  const [dateRange, setDateRange] = useState('12m');
  const [isLoading, setIsLoading] = useState(true);

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

  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryData, revenue, invoicesData, customersData, paymentsData] = await Promise.all([
        reportsApi.getFinancialSummary({ dateRange }).catch(() => null),
        dashboardApi.getChartData('revenue-trend').catch(() => ({ data: [] })),
        invoiceService.list({ limit: 100 }).catch(() => ({ data: [] })),
        customerService.list({ limit: 100 }).catch(() => ({ data: [] })),
        paymentService.listPayments({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      if (summaryData) {
        setSummary({
          totalRevenue: summaryData.totalRevenue || 0,
          paidRevenue: summaryData.paidRevenue || 0,
          outstanding: summaryData.outstanding || 0,
          overdueAmount: summaryData.overdueAmount || 0,
        });
      }

      setRevenueTrend(revenue?.data || []);
      setInvoiceTrend(revenue?.data || []);
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

  const dateRangeLabel = { '7d': 'Last 7 days', '30d': 'Last 30 days', '3m': 'Last 3 months', '12m': 'Last 12 months' }[dateRange] || 'All time';

  // Tax report data
  const taxData = invoices.map((inv) => ({
    Invoice: inv.number,
    Customer: inv.customerName,
    Subtotal: inv.subtotal,
    Tax: inv.taxAmount,
    Total: inv.total,
    Date: formatDate(inv.issueDate),
  }));

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
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info('Export feature coming soon')}>
                  <Download className="h-4 w-4" /> Export
                </Button>
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
      <Tabs defaultValue="overview" className="space-y-4">
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
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#reportRevenueGradient)" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <ChartWrapper title="Invoice Trend" description={dateRangeLabel} icon={FileText}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={invoiceTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
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
                      <div className="font-mono">{row.Invoice}</div>
                      <div>{row.Customer}</div>
                      <div className="text-right">{formatCurrency(row.Subtotal)}</div>
                      <div className="text-right">{formatCurrency(row.Tax)}</div>
                      <div className="text-right font-semibold">{formatCurrency(row.Total)}</div>
                      <div className="text-muted-foreground">{row.Date}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Card className="shadow-soft">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Tax Collected</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(taxData.reduce((s, r) => s + r.Tax, 0))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-soft">
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Taxable Value</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(taxData.reduce((s, r) => s + r.Subtotal, 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
