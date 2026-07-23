import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PaymentLinkStatusBadge } from '@/components/common/StatusBadge';
import { paymentService } from '@/services/paymentService';
import { sendPaymentLinkEmail } from '@/services/emailService';
import type { PaymentLink } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/utils';
import { CreditCard, Copy, Link as LinkIcon, Share2, Check, Clock, AlertCircle, Mail, Pencil, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentLinkDetailsPage() {
  const { id } = useParams();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editExpiryDays, setEditExpiryDays] = useState('30');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadLink = () => {
    setLoading(true);
    paymentService.getLink(id!).then((l) => {
      setLink(l);
      setLoading(false);
    });
  };

  useEffect(loadLink, [id]);

  if (loading) return <div className="py-16 text-center text-muted-foreground">Loading payment link...</div>;
  if (!link) return <div className="py-16 text-center text-muted-foreground">Payment link not found</div>;

  const statusInfo = {
    pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Awaiting Payment' },
    paid: { icon: Check, color: 'text-success', bg: 'bg-success/10', label: 'Payment Received' },
    failed: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Payment Failed' },
    expired: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Link Expired' },
  };
  const info = statusInfo[link.status];
  const StatusIcon = info.icon;

  const absoluteUrl = link.url.startsWith('http') ? link.url : `${window.location.origin}${link.url}`;

  const handleShare = async () => {
    // Use the native Web Share API when available (mobile browsers, most
    // modern desktop browsers) so the user gets a real share sheet — email,
    // WhatsApp, SMS, etc. Fall back to copying the link when it isn't
    // supported, rather than silently doing nothing.
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: `Payment request for ${formatCurrency(link.amount)}`,
          url: absoluteUrl,
        });
      } catch (shareError) {
        // AbortError just means the user closed the share sheet — not a bug.
        if ((shareError as Error)?.name !== 'AbortError') {
          navigator.clipboard.writeText(absoluteUrl);
          toast.success('Link copied to clipboard');
        }
      }
    } else {
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success('Link copied to clipboard');
    }
  };

  const handleSendEmail = async () => {
    if (!link.customerEmail) {
      toast.error('This customer has no email address on file');
      return;
    }
    setSendingEmail(true);
    try {
      await sendPaymentLinkEmail({
        customerEmail: link.customerEmail,
        customerName: link.customerName,
        paymentLink: {
          linkId: link.linkId,
          amount: link.amount,
          currency: link.currency,
          url: absoluteUrl,
          expiryDate: link.expiryDate,
          description: link.description,
        },
        paymentLinkId: link.id,
        customerId: link.customerId,
      });
      toast.success(`Payment link emailed to ${link.customerEmail}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const openEditDialog = () => {
    setEditAmount(String(link.amount));
    setEditDescription(link.description || '');
    setEditExpiryDays('30');
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const amountNumber = Number(editAmount);
    if (!editAmount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSavingEdit(true);
    try {
      await paymentService.updateLink(link.id, {
        amount: amountNumber,
        description: editDescription,
        expiryDays: Number(editExpiryDays) || undefined,
      });
      toast.success('Payment link updated');
      setEditOpen(false);
      loadLink();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment link');
    } finally {
      setSavingEdit(false);
    }
  };

  const canEdit = link.status === 'pending' || link.status === 'failed';

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Payment Link Details"
        description={`Link ID: ${link.linkId}`}
        back
        icon={CreditCard}
        actions={
          canEdit ? (
            <Button variant="outline" className="gap-2" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          ) : undefined
        }
      />

      {/* Status banner */}
      <Card className={`shadow-soft p-6 ${info.bg} border-0`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${info.bg} ${info.color}`}>
            <StatusIcon className="h-6 w-6" />
          </div>
          <div>
            <p className={`text-lg font-semibold ${info.color}`}>{info.label}</p>
            <p className="text-sm text-muted-foreground">
              {link.status === 'paid' && link.paidAt ? `Paid on ${formatDateTime(link.paidAt)}` :
               link.status === 'pending' ? `Expires on ${formatDate(link.expiryDate)}` :
               `Created on ${formatDate(link.createdAt)}`}
            </p>
          </div>
          <div className="ml-auto"><PaymentLinkStatusBadge status={link.status} /></div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-3"><CardTitle className="text-base">Link Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-lg">{formatCurrency(link.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{link.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gateway</span>
              <span className="font-medium capitalize">{link.gateway}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{link.customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{formatDate(link.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expires</span>
              <span className="font-medium">{formatDate(link.expiryDate)}</span>
            </div>
            {link.invoiceId && (
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Invoice</span>
                <Link to={`/invoices/${link.invoiceId}`} className="font-medium text-primary inline-flex items-center gap-1 hover:underline">
                  <FileText className="h-3.5 w-3.5" /> {link.invoiceNumber || 'View invoice'}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3"><CardTitle className="text-base">Share Link</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <LinkIcon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-mono flex-1 truncate">{link.url}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(absoluteUrl); toast.success('Link copied'); }}>
                <Copy className="h-4 w-4" /> Copy Link
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleShare}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={sendingEmail || !link.customerEmail}
              onClick={handleSendEmail}
            >
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {sendingEmail ? 'Sending...' : `Email${link.customerEmail ? ` to ${link.customerEmail}` : ''}`}
            </Button>
            {link.description && (
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expiry">Extend expiry by (days from today)</Label>
              <Input
                id="edit-expiry"
                type="number"
                min="1"
                value={editExpiryDays}
                onChange={(e) => setEditExpiryDays(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
