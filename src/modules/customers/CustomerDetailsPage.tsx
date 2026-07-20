import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/common/DataTable';
import { customerService } from '@/services/customerService';
import { invoiceService } from '@/services/invoiceService';
import type { Customer, Invoice } from '@/types';
import { formatCurrency, formatDate, getInitials } from '@/utils';
import {
  Users, Mail, Phone, MessageCircle, MapPin, FileText, Edit,
  Building2, Hash, Wallet, Clock,
} from 'lucide-react';
import { InvoiceStatusBadge } from '@/components/common/StatusBadge';

export function CustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      customerService.get(id!),
      invoiceService.list({ customerId: id, limit: 100 }),
    ]).then(([c, invRes]) => {
      setCustomer(c);
      setCustomerInvoices(invRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-16 text-center text-muted-foreground">Loading customer...</div>;
  if (!customer) return <div className="py-16 text-center text-muted-foreground">Customer not found</div>;

  const invoiceColumns: Column<Invoice>[] = [
    { key: 'number', header: 'Invoice #', cell: (r) => <span className="font-mono text-sm">{r.number}</span> },
    { key: 'issueDate', header: 'Issue Date', cell: (r) => <span className="text-sm">{formatDate(r.issueDate, 'short')}</span> },
    { key: 'dueDate', header: 'Due Date', cell: (r) => <span className="text-sm">{formatDate(r.dueDate, 'short')}</span> },
    { key: 'total', header: 'Amount', cell: (r) => <span className="text-sm font-semibold">{formatCurrency(r.total)}</span> },
    { key: 'status', header: 'Status', cell: (r) => <InvoiceStatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={customer.businessName}
        back
        icon={Users}
        actions={
          <Button size="sm" className="gap-2" onClick={() => navigate(`/customers/${customer.id}/edit`)}>
            <Edit className="h-4 w-4" /> Edit
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Customer Info */}
        <div className="space-y-4">
          <Card className="shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14 border">
                  <AvatarFallback className="bg-primary/10 text-primary">{getInitials(customer.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{customer.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{customer.businessName}</p>
                  <div className="mt-1"><StatusBadge status={customer.status} /></div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{customer.mobile}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span>{customer.whatsapp}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs">{customer.gstNumber}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-xs">Invoices</span>
              </div>
              <p className="text-xl font-bold">{customer.totalInvoices}</p>
            </Card>
            <Card className="p-4 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Revenue</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(customer.totalRevenue, 'INR').replace('₹', '₹')}</p>
            </Card>
            <Card className="p-4 shadow-soft col-span-2">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Outstanding</span>
              </div>
              <p className="text-xl font-bold text-destructive">{formatCurrency(customer.outstandingAmount)}</p>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <Tabs defaultValue="invoices">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="billing">Billing Address</TabsTrigger>
                  <TabsTrigger value="shipping">Shipping Address</TabsTrigger>
                </TabsList>

                <TabsContent value="invoices">
                  <DataTable
                    columns={invoiceColumns}
                    data={customerInvoices}
                    onRowClick={(r) => navigate(`/invoices/${r.id}`)}
                    emptyTitle="No invoices yet"
                    emptyDescription="Create an invoice for this customer."
                  />
                </TabsContent>

                <TabsContent value="billing">
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Building2 className="h-4 w-4 text-primary" /> Billing Address
                    </div>
                    <p className="text-sm text-muted-foreground">{customer.billingAddress.line1}</p>
                    {customer.billingAddress.line2 && <p className="text-sm text-muted-foreground">{customer.billingAddress.line2}</p>}
                    <p className="text-sm text-muted-foreground">{customer.billingAddress.city}, {customer.billingAddress.state}</p>
                    <p className="text-sm text-muted-foreground">{customer.billingAddress.pincode}, {customer.billingAddress.country}</p>
                  </div>
                </TabsContent>

                <TabsContent value="shipping">
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <MapPin className="h-4 w-4 text-primary" /> Shipping Address
                    </div>
                    <p className="text-sm text-muted-foreground">{customer.shippingAddress.line1}</p>
                    {customer.shippingAddress.line2 && <p className="text-sm text-muted-foreground">{customer.shippingAddress.line2}</p>}
                    <p className="text-sm text-muted-foreground">{customer.shippingAddress.city}, {customer.shippingAddress.state}</p>
                    <p className="text-sm text-muted-foreground">{customer.shippingAddress.pincode}, {customer.shippingAddress.country}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
