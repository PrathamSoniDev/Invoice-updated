import { cn } from '@/lib/utils';
import { type LucideIcon, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  back?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon: Icon, back, actions, className }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-start gap-3">
        {back && (
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
