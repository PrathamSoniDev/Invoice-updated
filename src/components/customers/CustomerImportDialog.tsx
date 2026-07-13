import { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { customerService, type CustomerImportRow, type CustomerImportResult } from '@/services/customerService';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

// The fields bulkImport() understands. `required` fields must be mapped
// before the user can proceed to the preview/confirm step.
const IMPORT_FIELDS: { key: keyof CustomerImportRow; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'businessName', label: 'Business Name' },
  { key: 'email', label: 'Email', required: true },
  { key: 'mobile', label: 'Mobile', required: true },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'billingLine1', label: 'Billing Address Line 1' },
  { key: 'billingLine2', label: 'Billing Address Line 2' },
  { key: 'billingCity', label: 'Billing City' },
  { key: 'billingState', label: 'Billing State' },
  { key: 'billingPincode', label: 'Billing Pincode' },
  { key: 'billingCountry', label: 'Billing Country' },
];

// Best-effort auto-mapping so the user usually doesn't have to map columns
// by hand — matched case-insensitively against common header spellings.
const AUTO_MAP_HINTS: Record<string, keyof CustomerImportRow> = {
  name: 'name', customername: 'name', 'customer name': 'name',
  businessname: 'businessName', 'business name': 'businessName', company: 'businessName',
  email: 'email', 'email address': 'email',
  mobile: 'mobile', phone: 'mobile', 'mobile number': 'mobile', 'phone number': 'mobile',
  gst: 'gstNumber', gstnumber: 'gstNumber', gstin: 'gstNumber', 'gst number': 'gstNumber',
  whatsapp: 'whatsapp', 'whatsapp number': 'whatsapp',
  address: 'billingLine1', 'address line 1': 'billingLine1', addressline1: 'billingLine1', billingaddress: 'billingLine1',
  'address line 2': 'billingLine2', addressline2: 'billingLine2',
  city: 'billingCity', 'billing city': 'billingCity',
  state: 'billingState', 'billing state': 'billingState',
  pincode: 'billingPincode', zip: 'billingPincode', 'zip code': 'billingPincode', postalcode: 'billingPincode',
  country: 'billingCountry', 'billing country': 'billingCountry',
};

type Step = 'upload' | 'map' | 'preview' | 'done';

export function CustomerImportDialog({ open, onOpenChange, onImported }: CustomerImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<keyof CustomerImportRow, string>>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update'>('skip');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<CustomerImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setCsvRows([]);
    setMapping({});
    setDuplicateStrategy('skip');
    setImporting(false);
    setResult(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error(`Could not parse CSV: ${results.errors[0].message}`);
          return;
        }
        const parsedHeaders = results.meta.fields || [];
        if (parsedHeaders.length === 0 || results.data.length === 0) {
          toast.error('The CSV file appears to be empty');
          return;
        }

        // Auto-map columns to fields based on header name.
        const autoMapping: Partial<Record<keyof CustomerImportRow, string>> = {};
        for (const header of parsedHeaders) {
          const normalized = header.trim().toLowerCase();
          const field = AUTO_MAP_HINTS[normalized];
          if (field && !autoMapping[field]) {
            autoMapping[field] = header;
          }
        }

        setHeaders(parsedHeaders);
        setCsvRows(results.data);
        setMapping(autoMapping);
        setStep('map');
      },
      error: (err) => {
        toast.error(`Could not read file: ${err.message}`);
      },
    });
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const missingRequiredFields = IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key]);

  const mappedRows: CustomerImportRow[] = csvRows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const field of IMPORT_FIELDS) {
      const header = mapping[field.key];
      if (header) mapped[field.key] = (row[header] || '').trim();
    }
    return mapped as unknown as CustomerImportRow;
  });

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const res = await customerService.bulkImport(mappedRows, { duplicateStrategy });
      setResult(res);
      setStep('done');
      if (res.errors.length === 0) {
        toast.success(`Import complete — ${res.created} created, ${res.updated} updated, ${res.skipped} skipped`);
      } else {
        toast.warning(`Import finished with ${res.errors.length} row error(s) — see details below`);
      }
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Customers from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to bulk-import customers.'}
            {step === 'map' && 'Match your CSV columns to customer fields.'}
            {step === 'preview' && `Review ${mappedRows.length} row(s) before importing.`}
            {step === 'done' && 'Import complete.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center cursor-pointer hover:bg-muted/50"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Click to select or drag a .csv file here</p>
            <p className="text-xs text-muted-foreground">Required columns: name, email, mobile. Optional: businessName, gstNumber, billing address, etc.</p>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={onFileInputChange} />
          </div>
        )}

        {step === 'map' && (
          <div className="space-y-4 overflow-y-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              {fileName} · {csvRows.length} row(s) detected
            </div>
            <ScrollArea className="h-72 pr-2">
              <div className="space-y-3">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-3">
                    <Label className="w-48 shrink-0 text-sm">
                      {field.label} {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={mapping[field.key] ?? '__none__'}
                      onValueChange={(value) =>
                        setMapping((m) => ({ ...m, [field.key]: value === '__none__' ? undefined : value }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Not mapped" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Not mapped</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {missingRequiredFields.length > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Map {missingRequiredFields.map((f) => f.label).join(', ')} to continue.
              </p>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 overflow-y-auto">
            <div>
              <Label className="text-sm mb-2 block">If a row matches an existing customer (same email or GST number):</Label>
              <RadioGroup value={duplicateStrategy} onValueChange={(v) => setDuplicateStrategy(v as 'skip' | 'update')} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="skip" id="strategy-skip" />
                  <Label htmlFor="strategy-skip" className="font-normal cursor-pointer">Skip duplicates (default)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="update" id="strategy-update" />
                  <Label htmlFor="strategy-update" className="font-normal cursor-pointer">Update existing</Label>
                </div>
              </RadioGroup>
            </div>
            <ScrollArea className="h-72 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>GST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.name || <span className="text-destructive">missing</span>}</TableCell>
                      <TableCell className="text-xs">{row.businessName || '-'}</TableCell>
                      <TableCell className="text-xs">{row.email || <span className="text-destructive">missing</span>}</TableCell>
                      <TableCell className="text-xs">{row.mobile || <span className="text-destructive">missing</span>}</TableCell>
                      <TableCell className="text-xs">{row.gstNumber || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {mappedRows.length > 50 && (
              <p className="text-xs text-muted-foreground">Showing first 50 of {mappedRows.length} rows — all rows will be imported.</p>
            )}
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-4 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{result.created} created</Badge>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{result.updated} updated</Badge>
              <Badge variant="outline">{result.skipped} skipped</Badge>
              {result.errors.length > 0 && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{result.errors.length} failed</Badge>
              )}
            </div>
            {result.errors.length > 0 && (
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-3 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive">Row {e.row}: {e.message}</p>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'map' && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={() => setStep('preview')} disabled={missingRequiredFields.length > 0}>
                Continue
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('map')} disabled={importing}>Back</Button>
              <Button onClick={handleConfirmImport} disabled={importing} className="gap-2">
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                {importing ? 'Importing...' : `Import ${mappedRows.length} customer(s)`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => handleClose(false)} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
