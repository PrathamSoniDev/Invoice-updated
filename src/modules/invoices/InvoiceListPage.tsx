import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InvoiceStatusBadge } from '@/components/common/StatusBadge';
import { invoiceService } from '@/services/invoiceService';
import type { Invoice } from '@/types';
import { formatCurrency, formatDate, getInitials, downloadCSV } from '@/utils';
import { FileText, Plus, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    invoiceService.list({ search, status: statusFilter, page, limit }).then((res) => {
      setInvoices(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setLoading(false);
    });
  }, [search, statusFilter, page]);

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'Invoice #',
      cell: (row) => (
        <div>
          <p className="font-mono text-sm font-medium">{row.number}</p>
          <p className="text-xs text-muted-foreground">{formatDate(row.issueDate, 'short')}</p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(row.customerName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{row.customerName}</p>
            <p className="text-xs text-muted-foreground">{row.customerEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      cell: (row) => <span className="text-sm">{formatDate(row.dueDate, 'short')}</span>,
    },
    {
      key: 'total',
      header: 'Amount',
      cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.total)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      cell: (row) => (
        <span className={`text-sm font-medium ${row.balance > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <InvoiceStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${row.id}`); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async (e) => { e.stopPropagation(); await invoiceService.duplicate(row.id); toast.success('Invoice duplicated'); }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleExport = () => {
    downloadCSV('invoices.csv', invoices.map((i) => ({
      Number: i.number, Customer: i.customerName, Status: i.status,
      IssueDate: formatDate(i.issueDate), DueDate: formatDate(i.dueDate),
      Total: i.total, Balance: i.balance,
    })));
    toast.success('Invoices exported to CSV');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Create, manage, and track all your invoices"
        icon={FileText}
        actions={
          <Button size="sm" className="gap-2" onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4" /> Create Invoice
          </Button>
        }
      />

      <Card className="shadow-soft">
        <div className="p-4 border-b">
          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search invoices...' }}
            filters={[
              {
                label: 'Status',
                value: statusFilter,
                onChange: (v) => { setStatusFilter(v); setPage(1); },
                options: [
                  { label: 'All Status', value: 'all' },
                  { label: 'Draft', value: 'draft' },
                  { label: 'Sent', value: 'sent' },
                  { label: 'Viewed', value: 'viewed' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Overdue', value: 'overdue' },
                  { label: 'Cancelled', value: 'cancelled' },
                ],
              },
            ]}
            onExport={handleExport}
          />
        </div>
        <DataTable
          columns={columns}
          data={invoices}
          isLoading={loading}
          onRowClick={(row) => navigate(`/invoices/${row.id}`)}
          emptyTitle="No invoices found"
          emptyDescription="Create your first invoice to get started."
        />
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </Card>
    </div>
  );
}
