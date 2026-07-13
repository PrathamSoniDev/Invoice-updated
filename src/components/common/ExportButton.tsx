import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileType } from 'lucide-react';
import type { ExportFormat, ReportConfig } from '@/utils/reportExport';
import { exportCSV, exportPDF } from '@/utils/reportExport';
import { toast } from 'sonner';

interface ExportButtonProps {
  reportTitle: string;
  config: Omit<ReportConfig, 'title'>;
  className?: string;
  disabled?: boolean;
}

export function ExportButton({ reportTitle, config, className, disabled }: ExportButtonProps) {
  const filename = reportTitle.toLowerCase().replace(/\s/g, '-');

  const handleExport = (format: Exclude<ExportFormat, 'excel'>) => {
    if (config.rows.length === 0) {
      toast.info('There is no report data to export.');
      return;
    }

    const fullConfig: ReportConfig = { ...config, title: reportTitle };
    if (format === 'csv') {
      exportCSV(`${filename}.csv`, config.rows as Record<string, unknown>[], config.columns);
      toast.success(`${reportTitle} CSV exported`);
    } else {
      exportPDF(`${filename}.pdf`, fullConfig);
      toast.success(`${reportTitle} PDF exported`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button variant="outline" size="sm" className={`gap-2 ${className || ''}`} disabled={disabled}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-info" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
          <FileType className="h-4 w-4 text-destructive" /> Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
