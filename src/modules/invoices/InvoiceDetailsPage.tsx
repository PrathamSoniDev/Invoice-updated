import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InvoiceStatusBadge } from '@/components/common/StatusBadge';
import { invoiceService } from '@/services/invoiceService';
import { sendInvoiceEmail } from '@/services/emailService';
import { useSettingsStore } from '@/store/settingsStore';
import { useModuleStore } from '@/store/moduleStore';
import type { Invoice } from '@/types';
import { formatCurrency, formatDate, getInitials } from '@/utils';
import { FileText, Edit, Download, Printer, Copy, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export function InvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { company } = useSettingsStore();
  const { isModuleEnabled } = useModuleStore();

  const emailEnabled = isModuleEnabled('email');
  const whatsappEnabled = isModuleEnabled('whatsapp');

  useEffect(() => {
    invoiceService.get(id!).then((inv) => {
      setInvoice(inv);
      setLoading(false);
    });
  }, [id]);

  // Sends the invoice email via the backend Resend integration, then marks
  // the invoice as SENT in the database only after the email is confirmed.
  const handleSendEmail = async () => {
    if (!invoice) return;
    setSendingEmail(true);
    try {
      await sendInvoiceEmail({
        customerEmail: invoice.customerEmail,
        customerName: invoice.customerName,
        invoice: {
          number: invoice.number,
          lineItems: invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.amount,
          })),
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          dueDate: invoice.dueDate,
        },
      });
      // Email confirmed — mark as SENT in the database.
      const updated = await invoiceService.send(invoice.id);
      setInvoice(updated);
      toast.success('Invoice sent via email');
    } catch (error) {
      console.error('[InvoiceDetailsPage] email send failed:', error);
      toast.error(
        error instanceof Error
          ? `Email not sent: ${error.message}`
          : 'Failed to send invoice email',
      );
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">Loading invoice...</div>;
  if (!invoice) return <div className="py-16 text-center text-muted-foreground">Invoice not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={invoice.number}
        description={`Issued ${formatDate(invoice.issueDate)} · Due ${formatDate(invoice.dueDate)}`}
        back
        icon={FileText}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.info('Print dialog would open')}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success('Invoice PDF downloaded')}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" className="gap-2" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
              <Edit className="h-4 w-4" /> Edit
            </Button>
          </>
        }
      />

      {/* Status bar with conditional communication actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <InvoiceStatusBadge status={invoice.status} />
          <span className="text-sm text-muted-foreground">
            {invoice.status === 'paid' ? 'Payment received' : invoice.status === 'overdue' ? 'Payment overdue' : `Balance: ${formatCurrency(invoice.balance)}`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success('Invoice link copied')}>
            <Copy className="h-4 w-4" /> Copy Link
          </Button>
          {emailEnabled && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSendEmail} disabled={sendingEmail}>
              <Mail className="h-4 w-4" /> {sendingEmail ? 'Sending...' : 'Email'}
            </Button>
          )}
          {whatsappEnabled && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success('Invoice sent via WhatsApp')}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          )}
        </div>
      </div>

      {/* Invoice Preview */}
      <Card className="shadow-card overflow-hidden">
        <div className="gradient-primary h-2" />
        <CardContent className="p-8 lg:p-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                {company?.logo && company?.showLogo ? (
                  <img src={company.logo} alt={company?.name || 'Company'} className="h-12 w-12 rounded-xl object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                )}
                <span className="text-xl font-bold">{company?.name || 'Company Name'}</span>
              </div>
              <p className="text-sm text-muted-foreground">{company?.legalName || ''}</p>
              <p className="text-sm text-muted-foreground">{company?.address?.line1 || ''}, {company?.address?.city || ''}</p>
              <p className="text-sm text-muted-foreground">{company?.address?.state || ''}, {company?.address?.pincode || ''}, {company?.address?.country || ''}</p>
              <p className="text-sm text-muted-foreground mt-1">GST: {company?.gstNumber || ''} · PAN: {company?.panNumber || ''}</p>
            </div>
            <div className="text-left sm:text-right">
              <h2 className="text-3xl font-bold tracking-tight mb-1">INVOICE</h2>
              <p className="text-sm font-mono text-muted-foreground">{invoice.number}</p>
              <div className="mt-3 space-y-1 text-sm">
                <p><span className="text-muted-foreground">Issue Date: </span><span className="font-medium">{formatDate(invoice.issueDate)}</span></p>
                <p><span className="text-muted-foreground">Due Date: </span><span className="font-medium">{formatDate(invoice.dueDate)}</span></p>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Bill To</p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(invoice.customerName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{invoice.customerName}</p>
                <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border overflow-hidden mb-8">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-16">Qty</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-28">Rate</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-20">Tax</th>
                  <th className="text-right p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">{item.description}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">{formatCurrency(item.rate)}</td>
                    <td className="p-3 text-right">{item.taxRate}%</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium">-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              {invoice.amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-success">
                    <span>Paid</span>
                    <span>-{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-destructive">
                    <span>Balance Due</span>
                    <span>{formatCurrency(invoice.balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Signature */}
          {company?.signature && (
            <div className="flex justify-end mb-8">
              <div className="text-center">
                <img src={company.signature} alt="Authorized Signature" className="h-16 object-contain mb-1" />
                <p className="text-xs text-muted-foreground border-t pt-1">Authorized Signature</p>
              </div>
            </div>
          )}

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t">
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
                <p className="text-sm text-muted-foreground">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Terms & Conditions</p>
                <p className="text-sm text-muted-foreground">{invoice.terms}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t text-center">
            <p className="text-sm text-muted-foreground">{company?.name || 'Company'} · {company?.email || ''} · {company?.phone || ''}</p>
            <p className="text-xs text-muted-foreground mt-1">{company?.footerText || 'Thank you for your business!'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
