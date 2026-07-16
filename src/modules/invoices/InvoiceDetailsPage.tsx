import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InvoiceStatusBadge } from '@/components/common/StatusBadge';
import { PaymentGatewayDialog } from '@/components/payments/PaymentGatewayDialog';
import { invoiceService } from '@/services/invoiceService';
import { customerService } from '@/services/customerService';
import { sendInvoiceEmail } from '@/services/emailService';
import { initiatePaytmCheckout, buildPaytmOrderId } from '@/services/paytmClient';
import { useSettingsStore } from '@/store/settingsStore';
import { useModuleStore } from '@/store/moduleStore';
import type { Invoice, GatewayType, Customer } from '@/types';
import { formatCurrency, formatDate, getInitials } from '@/utils';
import { printInvoicePDF } from '@/utils/invoicePdf';
import { summarizeGst } from '@/utils/gst';
import { FileText, Edit, Download, Printer, Copy, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// The Razorpay checkout script used to be loaded globally in index.html on
// every page (including the login screen), which is unnecessary outside of
// an actual payment flow. It's now loaded on demand, the first time the
// user actually initiates a Razorpay payment, and cached so repeat payments
// don't re-fetch it.
let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error('Failed to load Razorpay checkout script'));
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export function InvoiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [gatewayDialogOpen, setGatewayDialogOpen] = useState(false);
  const { company, bank, gateways, isInitialized: settingsInitialized, isLoading: settingsLoading, fetchSettings } = useSettingsStore();
  const { isModuleEnabled } = useModuleStore();

  const emailEnabled = isModuleEnabled('email');
  const whatsappEnabled = isModuleEnabled('whatsapp');
  // Pay Now should only ever appear if a payment gateway is actually
  // connected — previously it showed unconditionally whenever the invoice
  // wasn't paid, even with "Not Connected" gateways, leading to a dead-end
  // checkout dialog.
  const paymentGatewayConnected = gateways?.razorpay.status === 'connected' || gateways?.paytm.status === 'connected';

  useEffect(() => {
    if (!settingsInitialized && !settingsLoading) {
      fetchSettings();
    }
  }, [settingsInitialized, settingsLoading, fetchSettings]);

  useEffect(() => {
    invoiceService.get(id!).then((inv) => {
      setInvoice(inv);
      setLoading(false);
      // Best-effort: the PDF template is richer with full customer details
      // (billing address, GSTIN) than what's denormalized onto the invoice
      // row. If this fails, buildInvoicePDFHTML() falls back to the
      // invoice's own customerName/customerEmail fields.
      customerService.get(inv.customerId).then(setCustomer).catch((err) => {
        console.error('[InvoiceDetailsPage] failed to load customer for PDF:', err);
      });
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

  const handlePayRazorpay = async () => {
    if (!invoice) return;
    try {
      await loadRazorpayScript();
    } catch (scriptError) {
      console.error('[InvoiceDetailsPage] Failed to load Razorpay checkout script:', scriptError);
      toast.error('Could not load the payment gateway. Please check your connection and try again.');
      return;
    }

    const { data: order } = await axios.post(
      `${API_URL}/payment/create-order`,
      { amount: invoice.total, invoiceId: invoice.id }
    );

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY,
      amount: order.amount,
      currency: "INR",
      name: "Invoice System",
      order_id: order.id,
      handler: async (response: RazorpayResponse) => {
        try {
          await axios.post(`${API_URL}/payment/verify`, response);
          // The server reconciles the payment (payments row + invoice
          // status/balance) inline before /verify responds, on the same
          // code path the /api/webhooks/razorpay webhook uses — see
          // server/services/reconciliationService.js. Refetch rather than
          // writing to the database from the client here: that also closes
          // a gap where a tampered client request could previously claim an
          // arbitrary invoiceId was paid regardless of what was actually paid for.
          const updatedInvoice = await invoiceService.get(invoice.id);
          setInvoice(updatedInvoice);
          if (updatedInvoice.status === 'paid') {
            toast.success('Payment successful');
          } else {
            toast.success('Payment received — finalizing shortly. Refresh if the status doesn\'t update.');
          }
        } catch (error) {
          console.error('[InvoiceDetailsPage] Razorpay verify failed:', error);
          toast.error('Payment completed but confirmation failed. Refresh in a moment — the webhook will reconcile it shortly.');
        }
      },
    };

    const payment = new window.Razorpay(options);
    payment.open();
  };

  const handlePayPaytm = async () => {
    if (!invoice) return;
    try {
      await initiatePaytmCheckout({
        amount: invoice.total,
        orderId: buildPaytmOrderId('invoice', invoice.id),
        customerId: invoice.customerId,
      });
      // initiatePaytmCheckout submits a form and navigates the browser away
      // to Paytm's hosted payment page — nothing to do here after this;
      // the result is handled by PaytmReturnPage once Paytm redirects back.
    } catch (error) {
      console.error('[InvoiceDetailsPage] Paytm initiation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start Paytm payment');
    }
  };

  const handleGatewaySelect = (gateway: GatewayType) => {
    setGatewayDialogOpen(false);
    if (gateway === 'razorpay') {
      handlePayRazorpay();
    } else {
      handlePayPaytm();
    }
  };

  // Both "Download PDF" and "Print" open the same rendered invoice in a new
  // tab and trigger window.print() — the browser's print dialog's "Save as
  // PDF" destination is what actually produces the downloadable file. This
  // mirrors the working pattern in src/utils/reportExport.ts (exportPDF),
  // but with a dedicated invoice template (see src/utils/invoicePdf.ts)
  // instead of the generic tabular report layout.
  const handleDownloadOrPrintPDF = () => {
    if (!invoice) return;
    printInvoicePDF(invoice, company, customer, bank);
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">Loading invoice...</div>;
  if (!invoice) return <div className="py-16 text-center text-muted-foreground">Invoice not found</div>;

  const gst = summarizeGst(invoice.lineItems);
  const hasGstBreakdown = gst.cgstAmount + gst.sgstAmount + gst.igstAmount > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={invoice.number}
        description={`Issued ${formatDate(invoice.issueDate)} · Due ${formatDate(invoice.dueDate)}`}
        back
        icon={FileText}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadOrPrintPDF}>
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadOrPrintPDF}>
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
           {invoice.status !== "paid" && paymentGatewayConnected && (
        <Button
        size="sm"
          className="gap-2 bg-green-600 hover:bg-green-700"
          onClick={() => setGatewayDialogOpen(true)}> Pay Now
          </Button>
          )}
        </div>
      </div>

      <PaymentGatewayDialog
        open={gatewayDialogOpen}
        onOpenChange={setGatewayDialogOpen}
        amount={invoice.total}
        onSelect={handleGatewaySelect}
      />

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
              {hasGstBreakdown ? (
                <>
                  {gst.cgstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST</span>
                      <span className="font-medium">{formatCurrency(gst.cgstAmount)}</span>
                    </div>
                  )}
                  {gst.sgstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST</span>
                      <span className="font-medium">{formatCurrency(gst.sgstAmount)}</span>
                    </div>
                  )}
                  {gst.igstAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IGST</span>
                      <span className="font-medium">{formatCurrency(gst.igstAmount)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
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