import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from './LoadingState';
import { EmptyState } from './EmptyState';
import { Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyTitle = 'No data found',
  emptyDescription = 'Try adjusting your filters or search criteria.',
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {columns.map((col) => (
              <Skeleton key={col.key} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn('w-full', className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead key={col.key} className={cn('text-xs uppercase tracking-wide', col.headerClassName)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
