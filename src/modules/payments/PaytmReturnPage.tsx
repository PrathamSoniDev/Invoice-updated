import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { invoiceService } from '@/services/invoiceService';
import { parsePaytmOrderId } from '@/services/paytmClient';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PaytmReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'processing' | 'success' | 'failed'>('processing');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    async function handleReturn() {
      const status = searchParams.get('status');
      const orderId = searchParams.get('orderId') || '';
      const txnId = searchParams.get('txnId') || '';

      const parsed = parsePaytmOrderId(orderId);

      if (status !== 'success' || !parsed) {
        setState('failed');
        return;
      }

      // IMPORTANT: this page does NOT write to the database itself. The
      // `status=success` query param on this redirect is just a UX hint —
      // it is not checksum-verified at this point and a customer could in
      // principle edit the URL bar. The actual reconciliation already
      // happened server-side, in the checksum-verified POST /api/paytm/callback
      // handler (see server/routes/paytmRoutes.js), before the browser was
      // even redirected here. All this page does is refetch the invoice and
      // reflect whatever the server already decided.
      try {
        if (parsed.type === 'invoice') {
          const invoice = await invoiceService.get(parsed.entityId);
          setInvoiceId(invoice.id);
          if (invoice.status === 'paid') {
            setState('success');
            toast.success('Payment successful');
          } else {
            // The redirect said success, but the server-side callback either
            // hasn't landed yet or genuinely failed checksum verification.
            // Give the async webhook a moment, then check once more.
            await new Promise((resolve) => setTimeout(resolve, 2500));
            const recheck = await invoiceService.get(parsed.entityId);
            setInvoiceId(recheck.id);
            if (recheck.status === 'paid') {
              setState('success');
              toast.success('Payment successful');
            } else {
              setState('failed');
              toast.error('Payment is still being confirmed. If it doesn\'t update shortly, contact support with order ID: ' + orderId);
            }
          }
        } else {
          // Payment Links: not yet wired up (needs a public, unauthenticated
          // path — see PaymentGatewayDialog usage notes).
          setState('failed');
        }
      } catch (error) {
        console.error('[PaytmReturnPage] failed to load invoice status:', error, { txnId });
        setState('failed');
        toast.error('Could not confirm payment status. Contact support with this order ID: ' + orderId);
      }
    }

    handleReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center py-24">
      <Card className="w-full max-w-md shadow-soft">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {state === 'processing' && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Confirming your payment...</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle2 className="h-10 w-10 text-success" />
              <h2 className="text-lg font-semibold">Payment successful</h2>
              <p className="text-sm text-muted-foreground">The invoice has been marked as paid.</p>
              <Button onClick={() => navigate(invoiceId ? `/invoices/${invoiceId}` : '/invoices')}>
                Back to invoice
              </Button>
            </>
          )}
          {state === 'failed' && (
            <>
              <XCircle className="h-10 w-10 text-destructive" />
              <h2 className="text-lg font-semibold">Payment not completed</h2>
              <p className="text-sm text-muted-foreground">
                The payment was cancelled, failed, or could not be confirmed.
              </p>
              <Button variant="outline" onClick={() => navigate('/invoices')}>
                Back to invoices
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
