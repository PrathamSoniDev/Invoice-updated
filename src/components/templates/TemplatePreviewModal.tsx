import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/store/settingsStore';
import { customerService } from '@/services/customerService';
import { formatCurrency, formatDate } from '@/utils';
import { ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import type { InvoiceTemplate, Customer } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  template: InvoiceTemplate | null;
}

const sampleLineItems = [
  { description: 'Web Development Services', quantity: 40, rate: 2500, taxRate: 18, amount: 118000 },
  { description: 'UI/UX Design', quantity: 20, rate: 3000, taxRate: 18, amount: 70800 },
  { description: 'Server Hosting (Annual)', quantity: 1, rate: 45000, taxRate: 18, amount: 53100 },
];

const subtotal = sampleLineItems.reduce((s, i) => s + i.quantity * i.rate, 0);
const taxAmount = sampleLineItems.reduce((s, i) => s + (i.quantity * i.rate * i.taxRate) / 100, 0);
const total = subtotal + taxAmount;

export function TemplatePreviewModal({ open, onClose, template }: Props) {
  const [zoom, setZoom] = useState(100);
  const { company, bank } = useSettingsStore();
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (open) {
      customerService.list({ limit: 1 }).then((res) => {
        if (res.data.length > 0) {
          setCustomer(res.data[0]);
        }
      }).catch(() => null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {template ? `Preview: ${template.name}` : 'Invoice Preview'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setZoom(100)}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="desktop" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="desktop">Desktop</TabsTrigger>
            <TabsTrigger value="mobile">Mobile</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-6 min-h-0">
            <TabsContent value="desktop" className="mt-0 h-full">
              <div
                className="bg-white text-black mx-auto shadow-lg border transition-transform origin-top"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                <div className="p-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold">{company?.name || 'Company Name'}</h2>
                      <p className="text-sm text-gray-600">{company?.legalName || ''}</p>
                      <p className="text-sm text-gray-600">{company?.address?.line1 || ''}, {company?.address?.city || ''}</p>
                      <p className="text-sm text-gray-600">GST: {company?.gstNumber || ''}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-semibold">TAX INVOICE</p>
                      <p className="text-sm text-gray-600">INV-2025-1234</p>
                      <p className="text-sm text-gray-600">Date: {formatDate(new Date().toISOString(), 'short')}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-xs font-semibold uppercase text-gray-500">Bill To</p>
                    <p className="font-semibold">{customer?.name || 'Customer Name'}</p>
                    <p className="text-sm text-gray-600">{customer?.businessName || ''}</p>
                    <p className="text-sm text-gray-600">{customer?.billingAddress?.line1 || ''}, {customer?.billingAddress?.city || ''}</p>
                    <p className="text-sm text-gray-600">GST: {customer?.gstNumber || ''}</p>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 font-semibold">Description</th>
                        <th className="text-right py-2 font-semibold">Qty</th>
                        <th className="text-right py-2 font-semibold">Rate</th>
                        <th className="text-right py-2 font-semibold">Tax</th>
                        <th className="text-right py-2 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleLineItems.map((item, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2">{item.description}</td>
                          <td className="text-right py-2">{item.quantity}</td>
                          <td className="text-right py-2">{formatCurrency(item.rate)}</td>
                          <td className="text-right py-2">{item.taxRate}%</td>
                          <td className="text-right py-2 font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-end">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">CGST</span><span>{formatCurrency(taxAmount / 2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">SGST</span><span>{formatCurrency(taxAmount / 2)}</span></div>
                      <div className="flex justify-between border-t pt-1 font-bold text-lg"><span>Total</span><span>{formatCurrency(total)}</span></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 border-t pt-4 text-sm">
                    <div>
                      <p className="font-semibold mb-1">Bank Details</p>
                      <p>Bank: {bank?.bankName || '-'}</p>
                      <p>A/c: {bank?.accountNumber || '-'}</p>
                      <p>IFSC: {bank?.ifsc || '-'}</p>
                      <p>UPI: {bank?.upiId || '-'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold mb-1">Authorized Signature</p>
                      <div className="h-12 border-b border-gray-400 inline-block w-32" />
                      <p className="text-xs text-gray-500 mt-1">For {company?.name || 'Company'}</p>
                    </div>
                  </div>

                  <div className="border-t pt-3 text-center text-xs text-gray-500">
                    {company?.footerText || 'Thank you for your business.'}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mobile" className="mt-0">
              <div
                className="bg-white text-black mx-auto shadow-lg border rounded-lg"
                style={{
                  width: '375px',
                  minHeight: '600px',
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                <div className="p-5 space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="font-bold">{company?.name || 'Company Name'}</h3>
                    <p className="text-xs text-gray-600">{company?.address?.city || ''}</p>
                    <p className="text-xs text-gray-600">GST: {company?.gstNumber || ''}</p>
                  </div>
                  <div className="border-t pt-3 space-y-1">
                    <p className="text-xs font-semibold text-gray-500">Bill To</p>
                    <p className="font-medium text-sm">{customer?.name || 'Customer'}</p>
                    <p className="text-xs text-gray-600">{customer?.businessName || ''}</p>
                  </div>
                  <div className="space-y-3">
                    {sampleLineItems.map((item, i) => (
                      <div key={i} className="border rounded p-3 space-y-1">
                        <p className="font-medium text-sm">{item.description}</p>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{item.quantity} x {formatCurrency(item.rate)}</span>
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{formatCurrency(taxAmount)}</span></div>
                    <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(total)}</span></div>
                  </div>
                  <div className="text-center text-xs text-gray-500 pt-2">
                    {company?.footerText || 'Thank you for your business.'}
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
