import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';

interface ChartWrapperProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartWrapper({ title, description, icon: Icon, action, children, className }: ChartWrapperProps) {
  return (
    <Card className={cn('shadow-soft', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
