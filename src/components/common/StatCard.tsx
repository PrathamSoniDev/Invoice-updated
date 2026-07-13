import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

const accentClasses = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  info: 'bg-info/10 text-info',
};

export function StatCard({ title, value, icon: Icon, trend, accent = 'primary', className }: StatCardProps) {
  const isPositive = trend ? trend.value >= 0 : true;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('p-5 shadow-soft hover:shadow-card transition-shadow', className)}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', accentClasses[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                isPositive ? 'text-success' : 'text-destructive'
              )}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, className }: MetricCardProps) {
  return (
    <Card className={cn('p-5 shadow-soft', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}
