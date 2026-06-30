import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { InvoiceStatus, PaymentLinkStatus, PaymentStatus, CommunicationStatus, UserStatus } from '@/types';

const statusConfig: Record<string, { label: string; className: string; dot: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  sent: { label: 'Sent', className: 'bg-info/10 text-info border-info/20', dot: 'bg-info' },
  viewed: { label: 'Viewed', className: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  overdue: { label: 'Overdue', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border line-through', dot: 'bg-muted-foreground' },
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  refunded: { label: 'Refunded', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  delivered: { label: 'Delivered', className: 'bg-info/10 text-info border-info/20', dot: 'bg-info' },
  read: { label: 'Read', className: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary' },
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  suspended: { label: 'Suspended', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
  invited: { label: 'Invited', className: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  connected: { label: 'Connected', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  disconnected: { label: 'Disconnected', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] || statusConfig.draft;
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', config.className, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge status={status} />;
}

export function PaymentLinkStatusBadge({ status }: { status: PaymentLinkStatus }) {
  return <StatusBadge status={status} />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge status={status} />;
}

export function CommunicationStatusBadge({ status }: { status: CommunicationStatus }) {
  return <StatusBadge status={status} />;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <StatusBadge status={status} />;
}
