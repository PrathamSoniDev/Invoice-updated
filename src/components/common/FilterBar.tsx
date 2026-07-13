import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Filter } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  filters?: {
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  onExport?: () => void;
  className?: string;
}

export function FilterBar({ search, filters = [], onExport, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {search && (
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder || 'Search...'}
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )}
      {filters.map((filter) => (
        <Select key={filter.label} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      )}
    </div>
  );
}
