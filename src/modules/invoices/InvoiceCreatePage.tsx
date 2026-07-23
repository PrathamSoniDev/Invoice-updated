import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { customerService } from '@/services/customerService';
import { invoiceService } from '@/services/invoiceService';
import { sendInvoiceEmail } from '@/services/emailService';
import type { Customer, LineItem } from '@/types';
import { formatCurrency, getInitials, generateId, formatDate } from '@/utils';
import { FileText, Plus, Trash2, ChevronLeft, ChevronRight, Check, Search, Save, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { communicationService } from '@/services';

const steps = [
  { number: 1, label: 'Select Customer' },
  { number: 2, label: 'Add Line Items' },
  { number: 3, label: 'Review & Send' },
];

// Standard Indian GST slabs. The user can still pick "Custom" for anything
// outside these (e.g. cess-adjusted or exempt-with-a-twist rates), which
// reveals a free-form number input.
const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

export function InvoiceCreatePage() {
  const navigate = useNavigate();
  // Present only on the /invoices/:id/edit route. Its presence is what
  // distinguishes "editing an existing invoice" from "creating a new one" —
  // previously this page had no notion of edit mode at all and always
  // called invoiceService.create(), which is why using the Edit button
  // silently created a duplicate invoice instead of updating the original.
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: generateId('item'), description: '', quantity: 1, rate: 0, discount: 0, taxRate: 18, amount: 0 },
  ]);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('Thank you for your business.');
  const [terms, setTerms] = useState('Payment due within 30 days. Late payments subject to 1.5% monthly interest.');
  const [saving, setSaving] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(isEditMode);

  useEffect(() => {
    customerService.list({ limit: 100 }).then((res) => setCustomers(res.data)).catch(() => setCustomers([]));
  }, []);

  // Load the existing invoice + its customer when editing, and populate the
  // form with their current values so the user is editing real data rather
  // than starting from the blank defaults above.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoadingInvoice(true);
      try {
        const invoice = await invoiceService.get(id);
        const customer = await customerService.get(invoice.customerId);
        if (cancelled) return;

        setSelectedCustomer(customer);
        setLineItems(
          invoice.lineItems.length > 0
            ? invoice.lineItems.map((item) => ({ ...item }))
            : [{ id: generateId('item'), description: '', quantity: 1, rate: 0, discount: 0, taxRate: 18, amount: 0 }],
        );
        setIssueDate(invoice.issueDate.split('T')[0]);
        setDueDate(invoice.dueDate.split('T')[0]);
        setNotes(invoice.notes || '');
        setTerms(invoice.terms || '');
      } catch (error) {
        console.error('[InvoiceCreatePage] failed to load invoice for editing:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load invoice');
        navigate('/invoices');
      } finally {
        if (!cancelled) setLoadingInvoice(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  // TEMPORARY DEBUG: log the items rendered on the Review page so we can
  // confirm the send handler validates the same collection. Remove after
  // verifying the fix at runtime.
  useEffect(() => {
    if (step === 3) {
      console.debug('[InvoiceCreatePage] Review page rendering items:', lineItems.length, lineItems);
    }
  }, [step, lineItems]);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.businessName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const taxableAmount = updated.quantity * updated.rate - updated.discount;
        updated.amount = Math.round((taxableAmount + (taxableAmount * updated.taxRate) / 100) * 100) / 100;
        return updated;
      })
    );
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: generateId('item'), description: '', quantity: 1, rate: 0, discount: 0, taxRate: 18, amount: 0 }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate - item.discount, 0);
  const taxAmount = lineItems.reduce((sum, item) => {
    const taxable = item.quantity * item.rate - item.discount;
    return sum + (taxable * item.taxRate) / 100;
  }, 0);
  const total = subtotal + taxAmount;

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    // Defensive: ensure lineItems is always an array. This guards against
    // undefined/null state caused by async delays or stale closures so the
    // validation never throws a TypeError before showing a clean message.
    const safeItems = Array.isArray(lineItems) ? lineItems : [];

    // SINGLE SOURCE OF TRUTH: validate the SAME collection that the Review
    // page (Step 3) renders. The Review page maps over `lineItems` directly
    // and shows every item — even ones with an empty description (rendered
    // as '—'). Therefore a line item is "valid" simply by existing in the
    // array. We must NOT filter by description, because that would remove
    // items the user can see in the preview, causing a false
    // "Please add at least one line item" error.
    console.debug('[InvoiceCreatePage.handleSave] lineItems count:', safeItems.length);

    if (safeItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerId: selectedCustomer.id,
        issueDate: new Date(issueDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        // Send every item in the array — the same items the Review page
        // displayed. Defensive fallback ensures a stable array is passed.
        items: safeItems.map((item) => ({
          description: item.description || '',
          quantity: item.quantity,
          rate: item.rate,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0,
        })),
        notes,
        terms,
      };
      // TEMPORARY DEBUG: confirm the final API payload contains the items.
      // Remove after verifying the fix at runtime.
      console.debug('[InvoiceCreatePage.handleSave] API payload items:', payload.items.length, payload.items);

      // Step 1: Persist the invoice — update the existing row when editing,
      // otherwise create a new one (always as DRAFT first on create).
      const savedInvoice = isEditMode && id
        ? await invoiceService.update(id, payload)
        : await invoiceService.create(payload);

      // Step 2: If the user clicked "Send Invoice", actually send the email
      // via the backend Resend integration. We only mark the invoice as
      // SENT after the email is confirmed delivered — this prevents the
      // false "Invoice sent successfully" toast when no email was sent.
      if (status === 'sent') {
        try {
          await sendInvoiceEmail({
            customerEmail: selectedCustomer.email,
            customerName: selectedCustomer.name,
            invoice: {
              id: createdInvoice.id,
              number: createdInvoice.number,
              lineItems: createdInvoice.lineItems.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.amount,
              })),
              subtotal: savedInvoice.subtotal,
              taxAmount: savedInvoice.taxAmount,
              total: savedInvoice.total,
              dueDate: savedInvoice.dueDate,
            },
            customerId: savedInvoice.customerId,
          });
          // Email confirmed — now mark the invoice as SENT in the database.
          await invoiceService.send(createdInvoice.id);
          communicationService.sendInvoiceEmail(createdInvoice.id, "EMAIL")
          toast.success('Invoice sent successfully');
        } catch (emailError) {
          // Email failed — the invoice remains a DRAFT. Show the real error
          // so the user knows the email was NOT sent.
          console.error('[InvoiceCreatePage.handleSave] email send failed:', emailError);
          toast.error(
            emailError instanceof Error
              ? `Email not sent: ${emailError.message}`
              : 'Email not sent. The invoice was saved as a draft.',
          );
          // Still navigate so the user can see the saved draft and retry.
          navigate('/invoices');
          return;
        }
      } else {
        toast.success(isEditMode ? 'Invoice updated' : 'Invoice saved as draft');
      }
      navigate('/invoices');
    } catch (error) {
      console.error('[InvoiceCreatePage.handleSave] failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loadingInvoice) {
    return <div className="py-16 text-center text-muted-foreground">Loading invoice...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEditMode ? 'Edit Invoice' : 'Create Invoice'}
        description={isEditMode ? 'Update this invoice\'s details' : 'Generate a new invoice in 3 simple steps'}
        back
        icon={FileText}
      />

      {/* Stepper */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-4">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    step > s.number
                      ? 'bg-success text-success-foreground'
                      : step === s.number
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s.number ? <Check className="h-4 w-4" /> : s.number}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${step >= s.number ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-8 sm:w-16 ${step > s.number ? 'bg-success' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Customer */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search customers by name, business, or email..."
                    className="pl-9"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
                <ScrollArea className="h-[400px] rounded-lg border">
                  <div className="divide-y">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                          selectedCustomer?.id === customer.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Avatar className="h-10 w-10 border">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(customer.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.businessName} · {customer.email}</p>
                        </div>
                        {selectedCustomer?.id === customer.id && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Line Items */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="shadow-soft">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Line Items</CardTitle>
                <Button variant="outline" size="sm" onClick={addLineItem} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>

                {/* Line items table */}
                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2 font-medium text-xs uppercase text-muted-foreground">Description</th>
                        <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground w-20">Qty</th>
                        <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground w-28">Rate</th>
                        <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground w-24">Discount</th>
                        <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground w-36">Tax%</th>
                        <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground w-28">Amount</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2">
                            <Input
                              placeholder="Item description"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              className="border-0 shadow-none focus-visible:ring-0"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                              className="text-right border-0 shadow-none focus-visible:ring-0"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.rate}
                              onChange={(e) => updateLineItem(item.id, 'rate', Number(e.target.value))}
                              className="text-right border-0 shadow-none focus-visible:ring-0"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={item.discount}
                              onChange={(e) => updateLineItem(item.id, 'discount', Number(e.target.value))}
                              className="text-right border-0 shadow-none focus-visible:ring-0"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={GST_RATE_OPTIONS.includes(item.taxRate) ? String(item.taxRate) : 'custom'}
                                onValueChange={(v) => {
                                  if (v === 'custom') return;
                                  updateLineItem(item.id, 'taxRate', Number(v));
                                }}
                              >
                                <SelectTrigger className="h-9 w-[92px] border-0 shadow-none focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {GST_RATE_OPTIONS.map((rate) => (
                                    <SelectItem key={rate} value={String(rate)}>{rate}% GST</SelectItem>
                                  ))}
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                              {!GST_RATE_OPTIONS.includes(item.taxRate) && (
                                <Input
                                  type="number"
                                  value={item.taxRate}
                                  onChange={(e) => updateLineItem(item.id, 'taxRate', Number(e.target.value))}
                                  className="w-16 text-right border-0 shadow-none focus-visible:ring-0"
                                  aria-label="Custom tax rate"
                                />
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                          <td className="p-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeLineItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-lg">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Review & Send */}
        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card className="shadow-soft">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Review Invoice</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Customer */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(selectedCustomer?.name || '')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{selectedCustomer?.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedCustomer?.businessName} · {selectedCustomer?.email}</p>
                      </div>
                    </div>

                    {/* Items summary */}
                    <div className="rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2 font-medium text-xs uppercase text-muted-foreground">Description</th>
                            <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground">Qty</th>
                            <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground">Rate</th>
                            <th className="text-right p-2 font-medium text-xs uppercase text-muted-foreground">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item) => (
                            <tr key={item.id} className="border-t">
                              <td className="p-2">{item.description || '—'}</td>
                              <td className="p-2 text-right">{item.quantity}</td>
                              <td className="p-2 text-right">{formatCurrency(item.rate)}</td>
                              <td className="p-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                      <div className="w-48 space-y-1.5">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(taxAmount)}</span></div>
                        <div className="flex justify-between border-t pt-1.5 font-bold text-lg"><span>Total</span><span>{formatCurrency(total)}</span></div>
                      </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="terms">Terms & Conditions</Label>
                        <Textarea id="terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary sidebar */}
              <div className="space-y-4">
                <Card className="shadow-soft p-5 space-y-3">
                  <p className="text-sm font-semibold">Invoice Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span className="font-medium text-right">{selectedCustomer?.name}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Issue Date</span><span className="font-medium">{formatDate(issueDate, 'short')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-medium">{formatDate(dueDate, 'short')}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span className="font-medium">{lineItems.length}</span></div>
                    <div className="flex justify-between border-t pt-2"><span className="font-semibold">Total</span><span className="font-bold">{formatCurrency(total)}</span></div>
                  </div>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate('/invoices')} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> {step > 1 ? 'Back' : 'Cancel'}
        </Button>
        <div className="flex items-center gap-2">
          {step === 3 && (
            <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {isEditMode ? 'Save Changes' : 'Save as Draft'}
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedCustomer} className="gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => handleSave('sent')} disabled={saving} className="gap-2">
              <Send className="h-4 w-4" /> {saving ? (isEditMode ? 'Updating...' : 'Sending...') : (isEditMode ? 'Update & Send' : 'Send Invoice')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
