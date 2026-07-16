import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { customerService } from '@/services/customerService';
import { paymentService } from '@/services/paymentService';
import { sendPaymentLinkEmail } from '@/services/emailService';
import { useSettingsStore } from '@/store/settingsStore';
import { useModuleStore } from '@/store/moduleStore';
import type { Customer, PaymentLink as PaymentLinkType } from '@/types';
import { formatCurrency } from '@/utils';
import { CreditCard, Save, Check, Link as LinkIcon, Copy, Mail, MessageCircle, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function PaymentLinkCreatePage() {
  const navigate = useNavigate();
  const { gateways } = useSettingsStore();
  const { isModuleEnabled } = useModuleStore();
  const emailEnabled = isModuleEnabled('email');
  const whatsappEnabled = isModuleEnabled('whatsapp');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState('razorpay');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState<PaymentLinkType | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    customerService.list({ limit: 100 }).then((res) => setCustomers(res.data)).catch(() => setCustomers([]));
  }, []);

  const handleCreate = async () => {
    if (!customerId || !amount) {
      toast.error('Please select a customer and enter an amount');
      return;
    }
    setSaving(true);
    try {
      const link = await paymentService.createLink({
        customerId,
        amount: Number(amount),
        gateway: gateway.toUpperCase(),
        description,
        expiryDays: Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      });
      setCreatedLink(link);
      const invoicePart = link.invoiceNumber ? ` — Invoice ${link.invoiceNumber} generated` : '';
      const emailPart = link.customerEmail ? ` and emailed to ${link.customerEmail}` : '';
      toast.success(`Payment link created${invoicePart}${emailPart}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create payment link');
    } finally {
      setSaving(false);
    }
  };

  const handleEmailLink = async () => {
    if (!createdLink) return;
    const absoluteUrl = createdLink.url.startsWith('http') ? createdLink.url : `${window.location.origin}${createdLink.url}`;
    if (!createdLink.customerEmail) {
      toast.error('This customer has no email address on file');
      return;
    }
    setSendingEmail(true);
    try {
      await sendPaymentLinkEmail({
        customerEmail: createdLink.customerEmail,
        customerName: createdLink.customerName,
        paymentLink: {
          linkId: createdLink.linkId,
          amount: createdLink.amount,
          currency: createdLink.currency,
          url: absoluteUrl,
          expiryDate: createdLink.expiryDate,
          description: createdLink.description,
        },
      });
      toast.success(`Payment link emailed to ${createdLink.customerEmail}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Create Payment Link"
        description="Generate a shareable payment link for your customer"
        back
        icon={CreditCard}
      />

      {createdLink ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="shadow-soft p-8 text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-success/10 text-success mb-4">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold">Payment Link Created!</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Share this link with your customer to collect payment.</p>

            {createdLink.invoiceId && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/5 text-primary p-3 mb-6 text-sm">
                <FileText className="h-4 w-4" />
                <span>
                  Invoice <Link to={`/invoices/${createdLink.invoiceId}`} className="font-semibold hover:underline">{createdLink.invoiceNumber}</Link> was generated automatically
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 mb-6">
              <LinkIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-mono flex-1 text-left truncate">{createdLink.url}</span>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(createdLink.url); toast.success('Link copied'); }}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => { navigator.clipboard.writeText(createdLink.url); toast.success('Link copied'); }}>
                <Copy className="h-4 w-4" /> Copy Link
              </Button>
              {emailEnabled && (
                <Button variant="outline" size="sm" className="gap-2" disabled={sendingEmail} onClick={handleEmailLink}>
                  {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {sendingEmail ? 'Sending...' : 'Resend Email'}
                </Button>
              )}
              {whatsappEnabled && (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => toast.success('Payment link sent via WhatsApp')}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(createdLink.url, '_blank')}>
                <ExternalLink className="h-4 w-4" /> Open Link
              </Button>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => navigate('/payment-links')}>View All Links</Button>
              <Button onClick={() => { setCreatedLink(null); setCustomerId(''); setAmount(''); }}>Create Another</Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment Link Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="customer"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                <SelectContent>
                  {customers.slice(0, 20).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.businessName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR) *</Label>
                <Input id="amount" type="number" placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Payment Gateway</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['razorpay', 'paytm'] as const).map((gw) => {
                  const status = gateways ? (gw === 'razorpay' ? gateways.razorpay.status : gateways.paytm.status) : 'disconnected';
                  const connected = status === 'connected';
                  return (
                    <button
                      key={gw}
                      onClick={() => connected && setGateway(gw)}
                      disabled={!connected}
                      className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                        gateway === gw && connected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'
                      } ${!connected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${gw === 'razorpay' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'}`}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold capitalize">{gw}</p>
                        <p className="text-xs text-muted-foreground">{connected ? 'Connected' : 'Not connected'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="What is this payment for?" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            {amount && (
              <div className="rounded-lg bg-muted/50 p-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customer will pay</span>
                <span className="text-2xl font-bold">{formatCurrency(Number(amount))}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate('/payment-links')}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Link'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
