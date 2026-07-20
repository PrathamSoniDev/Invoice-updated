import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/utils';
import { CheckCircle2, Clock, AlertCircle, Loader2, Receipt } from 'lucide-react';

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

interface PublicPaymentLink {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  expiresAt: string | null;
  gateway: string | null;
  customerName: string | null;
}

// Loaded on demand — this page is the only place an unauthenticated visitor
// (the customer who received the emailed link) ever lands, so there's no
// reason to ship the Razorpay checkout script anywhere else.
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

export function PublicPaymentPage() {
  const { slug } = useParams();
  const [link, setLink] = useState<PublicPaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLink = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`${API_URL}/payment-links/public/${slug}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotFound(true);
        return;
      }
      setLink(data.paymentLink);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadLink();
  }, [loadLink]);

  const handlePayNow = async () => {
    if (!link) return;
    setError(null);
    setPaying(true);
    try {
      await loadRazorpayScript();

      const orderRes = await fetch(`${API_URL}/payment/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: link.amount, paymentLinkId: link.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok || order.success === false) {
        throw new Error(order.message || 'Could not start the payment. Please try again.');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'InvoiceGen',
        description: link.title || link.description || undefined,
        order_id: order.id,
        prefill: link.customerName ? { name: link.customerName } : undefined,
        handler: async (response: RazorpayResponse) => {
          try {
            await fetch(`${API_URL}/payment/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
          } catch (verifyError) {
            console.error('[PublicPaymentPage] verify call failed:', verifyError);
          } finally {
            // The webhook reconciles independently of this call, so re-fetch
            // the link's real status rather than trusting the client here.
            await loadLink();
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.on('payment.failed', () => {
        setError('Payment failed. Please try again.');
        setPaying(false);
      });
      checkout.open();
    } catch (err) {
      console.error('[PublicPaymentPage] payment initiation failed:', err);
      setError(err instanceof Error ? err.message : 'Could not start the payment. Please try again.');
      setPaying(false);
    }
  };

  
  const autoTriggeredRef = useRef(false);
  useEffect(() => {
    if (!autoTriggeredRef.current && link && (link.status === 'PENDING' || link.status === 'FAILED')) {
      autoTriggeredRef.current = true;
      handlePayNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <Card className="shadow-soft p-8 text-center">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <h1 className="text-lg font-semibold">Payment link not found</h1>
        <p className="text-sm text-muted-foreground mt-1">
          This link may have been removed, or the address is incorrect.
        </p>
      </Card>
    );
  }

  const status = link.status.toLowerCase() as 'pending' | 'paid' | 'failed' | 'expired';

  return (
    <Card className="shadow-soft overflow-hidden">
      <div className="gradient-primary h-1.5" />
      <CardContent className="p-8 text-center">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Receipt className="h-7 w-7" />
        </div>
        <p className="text-sm text-muted-foreground">Payment Request</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(link.amount)}</h1>
        {link.customerName && <p className="text-sm text-muted-foreground mt-1">for {link.customerName}</p>}
        {link.description && <p className="text-sm text-muted-foreground mt-3">{link.description}</p>}

        <div className="mt-6">
          {status === 'paid' && (
            <div className="flex items-center justify-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Payment received — thank you!</span>
            </div>
          )}
          {status === 'expired' && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span className="font-medium">This payment link has expired.</span>
            </div>
          )}
          {status === 'failed' && (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">The last payment attempt failed.</span>
            </div>
          )}
          {(status === 'pending' || status === 'failed') && (
            <>
              <Button
                size="lg"
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                disabled={paying}
                onClick={handlePayNow}
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {paying ? 'Opening secure checkout...' : 'Pay Now'}
              </Button>
              {link.expiresAt && (
                <p className="text-xs text-muted-foreground mt-3">
                  Valid until {formatDate(link.expiresAt)}
                </p>
              )}
              {error && <p className="text-xs text-destructive mt-3">{error}</p>}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
