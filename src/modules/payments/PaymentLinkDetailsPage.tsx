import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentLinkStatusBadge } from '@/components/common/StatusBadge';
import { paymentService } from '@/services/paymentService';
import type { PaymentLink } from '@/types';
import { formatCurrency, formatDate, formatDateTime } from '@/utils';
import { CreditCard, Copy, Link as LinkIcon, Share2, Check, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function PaymentLinkDetailsPage() {
  const { id } = useParams();
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentService.getLink(id!).then((l) => {
      setLink(l);
      setLoading(false);
    });
  }, [id]);

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

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Payment Link Details"
        description={`Link ID: ${link.linkId}`}
        back
        icon={CreditCard}
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
              <Button variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(link.url); toast.success('Link copied'); }}>
                <Copy className="h-4 w-4" /> Copy Link
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => toast.info('Share dialog would open')}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>
            {link.description && (
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
