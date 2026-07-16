import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { customerService } from '@/services/customerService';
import { CustomerImportDialog } from '@/components/customers/CustomerImportDialog';
import { useSearchIndexStore } from '@/store/searchIndexStore';
import type { Customer } from '@/types';
import { formatCurrency, getInitials, downloadCSV } from '@/utils';
import { Users, Plus, Upload, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

export function CustomerListPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const limit = 10;

  const refresh = () => {
    setLoading(true);
    customerService.list({ search, status: statusFilter, page, limit })
      .then((res) => {
        setCustomers(res.data);
        useSearchIndexStore.getState().setCustomers(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((error) => {
        console.error('[CustomerListPage] Failed to load customers:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load customers');
        setCustomers([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [search, statusFilter, page]);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.businessName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{row.email}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{row.mobile}</p>
        </div>
      ),
    },
    {
      key: 'gst',
      header: 'GST Number',
      cell: (row) => <span className="text-sm font-mono">{row.gstNumber}</span>,
    },
    {
      key: 'invoices',
      header: 'Invoices',
      cell: (row) => <span className="text-sm font-medium">{row.totalInvoices}</span>,
    },
    {
      key: 'revenue',
      header: 'Total Revenue',
      cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.totalRevenue)}</span>,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (row) => (
        <span className={`text-sm font-medium ${row.outstandingAmount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {formatCurrency(row.outstandingAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const handleExport = () => {
    downloadCSV('customers.csv', customers.map((c) => ({
      Name: c.name, Business: c.businessName, Email: c.email, Mobile: c.mobile,
      GST: c.gstNumber, Status: c.status, Revenue: c.totalRevenue, Outstanding: c.outstandingAmount,
    })));
    toast.success('Customers exported to CSV');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage your customer relationships and contact information"
        icon={Users}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate('/customers/new')}>
              <Plus className="h-4 w-4" /> Add Customer
            </Button>
          </>
        }
      />

      <Card className="shadow-soft">
        <div className="p-4 border-b">
          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search customers...' }}
            filters={[
              {
                label: 'Status',
                value: statusFilter,
                onChange: (v) => { setStatusFilter(v); setPage(1); },
                options: [
                  { label: 'All Status', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ],
              },
            ]}
            onExport={handleExport}
          />
        </div>
        <DataTable
          columns={columns}
          data={customers}
          isLoading={loading}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          emptyTitle="No customers found"
          emptyDescription="Try adjusting your search or add a new customer."
        />
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </Card>

      <CustomerImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
    </div>
  );
}
