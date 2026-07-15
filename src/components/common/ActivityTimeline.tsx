import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, timeAgo } from '@/utils';
import { type LucideIcon } from 'lucide-react';

export interface TimelineItem {
  id: string;
  userName: string;
  action: string;
  description: string;
  timestamp: string;
  icon?: LucideIcon;
  iconColor?: string;
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  className?: string;
  maxItems?: number;
}

export function ActivityTimeline({ items, className, maxItems }: ActivityTimelineProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  return (
    <div className={cn('space-y-1', className)}>
      {displayItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < displayItems.length - 1 && (
              <div className="absolute left-[18px] top-9 bottom-0 w-px bg-border" />
            )}
            <div className="flex flex-col items-center">
              {Icon ? (
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', item.iconColor || 'bg-primary/10 text-primary')}>
                  <Icon className="h-4 w-4" />
                </div>
              ) : (
                <Avatar className="h-9 w-9 border">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(item.userName)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{item.userName || 'System'}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(item.timestamp)}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
