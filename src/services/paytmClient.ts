const PAYTM_API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/paytm`;

export type PaytmContextType = 'invoice' | 'link';

export function buildPaytmOrderId(type: PaytmContextType, entityId: string): string {
  const prefix = type === 'invoice' ? 'INV' : 'LNK';
  return `${prefix}_${entityId}_${Date.now()}`;
}

export function parsePaytmOrderId(orderId: string): { type: PaytmContextType; entityId: string } | null {
  const match = orderId.match(/^(INV|LNK)_(.+)_(\d+)$/);
  if (!match) return null;
  return {
    type: match[1] === 'INV' ? 'invoice' : 'link',
    entityId: match[2],
  };
}

interface InitiatePaytmParams {
  amount: number;
  orderId: string;
  customerId?: string;
}

export async function initiatePaytmCheckout({ amount, orderId, customerId }: InitiatePaytmParams): Promise<void> {
  const response = await fetch(`${PAYTM_API_BASE}/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, orderId, customerId }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to initiate Paytm payment');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = data.paymentPageUrl;

  const fields: Record<string, string> = {
    mid: data.mid,
    orderId: data.orderId,
    txnToken: data.txnToken,
  };

  for (const [key, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
