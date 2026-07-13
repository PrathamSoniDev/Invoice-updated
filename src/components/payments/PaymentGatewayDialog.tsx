import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Wallet } from 'lucide-react';
import type { GatewayType } from '@/types';

interface PaymentGatewayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  onSelect: (gateway: GatewayType) => void;
}

export function PaymentGatewayDialog({ open, onOpenChange, amount, onSelect }: PaymentGatewayDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a payment method</DialogTitle>
          <DialogDescription>
            Pay ₹{amount.toFixed(2)} using your preferred gateway.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Button
            variant="outline"
            className="h-auto justify-start gap-3 p-4"
            onClick={() => onSelect('razorpay')}
          >
            <CreditCard className="h-5 w-5 text-primary shrink-0" />
            <div className="text-left">
              <div className="font-medium">Razorpay</div>
              <div className="text-xs text-muted-foreground">Cards, UPI, netbanking, wallets</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="h-auto justify-start gap-3 p-4"
            onClick={() => onSelect('paytm')}
          >
            <Wallet className="h-5 w-5 text-primary shrink-0" />
            <div className="text-left">
              <div className="font-medium">Paytm</div>
              <div className="text-xs text-muted-foreground">Paytm wallet, UPI, cards, netbanking</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
