import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/common/FilterBar';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Pagination } from '@/components/common/Pagination';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentLinkStatusBadge } from '@/components/common/StatusBadge';
import { paymentService } from '@/services/paymentService';
import type { PaymentLink } from '@/types';
import { formatCurrency, formatDate } from '@/utils';
import { CreditCard, Plus, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentLinkListPage() {
  const navigate = useNavigate();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  useEffect(() => {
    setLoading(true);
    paymentService.listLinks({ search, status: statusFilter, page, limit }).then((res) => {
      setLinks(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setLoading(false);
    });
  }, [search, statusFilter, page]);

  const columns: Column<PaymentLink>[] = [
    {
      key: 'linkId',
      header: 'Link ID',
      cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.linkId}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => <span className="text-sm font-medium">{row.customerName}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      cell: (row) => <span className="text-sm font-semibold">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'gateway',
      header: 'Gateway',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm capitalize">
          <span className={`h-2 w-2 rounded-full ${row.gateway === 'razorpay' ? 'bg-info' : 'bg-warning'}`} />
          {row.gateway}
        </span>
      ),
    },
    {
      key: 'expiry',
      header: 'Expires',
      cell: (row) => <span className="text-sm">{formatDate(row.expiryDate, 'short')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <PaymentLinkStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(row.url); toast.success('Link copied to clipboard'); }}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/payment-links/${row.id}`); }}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Links"
        description="Generate and track payment links across gateways"
        icon={CreditCard}
        actions={
          <Button size="sm" className="gap-2" onClick={() => navigate('/payment-links/new')}>
            <Plus className="h-4 w-4" /> Create Link
          </Button>
        }
      />

      <Card className="shadow-soft">
        <div className="p-4 border-b">
          <FilterBar
            search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search payment links...' }}
            filters={[
              {
                label: 'Status',
                value: statusFilter,
                onChange: (v) => { setStatusFilter(v); setPage(1); },
                options: [
                  { label: 'All Status', value: 'all' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Failed', value: 'failed' },
                  { label: 'Expired', value: 'expired' },
                ],
              },
            ]}
          />
        </div>
        <DataTable
          columns={columns}
          data={links}
          isLoading={loading}
          onRowClick={(row) => navigate(`/payment-links/${row.id}`)}
          emptyTitle="No payment links found"
          emptyDescription="Create a payment link to collect payments."
        />
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
      </Card>
    </div>
  );
}
