import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import type { ExportFormat, ReportConfig } from '@/utils/reportExport';
import { exportCSV, exportExcel, exportPDF } from '@/utils/reportExport';
import { toast } from 'sonner';

interface ExportButtonProps {
  reportTitle: string;
  config: Omit<ReportConfig, 'title'>;
  className?: string;
}

export function ExportButton({ reportTitle, config, className }: ExportButtonProps) {
  const filename = reportTitle.toLowerCase().replace(/\s/g, '-');

  const handleExport = (format: ExportFormat) => {
    const fullConfig: ReportConfig = { ...config, title: reportTitle };
    if (format === 'csv') {
      exportCSV(`${filename}.csv`, config.rows as Record<string, unknown>[]);
      toast.success(`${reportTitle} CSV exported`);
    } else if (format === 'excel') {
      exportExcel(`${filename}.xls`, fullConfig);
      toast.success(`${reportTitle} Excel exported`);
    } else {
      exportPDF(`${filename}.pdf`, fullConfig);
      toast.success(`${reportTitle} PDF exported`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 ${className || ''}`}>
          <Download className="h-4 w-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
          <FileType className="h-4 w-4 text-destructive" /> Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-success" /> Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-info" /> Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
