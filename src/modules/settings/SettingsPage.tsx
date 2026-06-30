import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUpload } from '@/components/common/FileUpload';
import { useSettingsStore } from '@/store/settingsStore';
import { Settings, Building2, Banknote, FileText, MessageSquare, CreditCard, Save, Check, Zap, Wallet, Plug, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function SettingsPage() {
  const navigate = useNavigate();
  const { company, bank, invoice, communication, gateways, updateCompany, updateBank, updateInvoice, updateCommunication, updateGateways, fetchSettings, isLoading } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('company');

  useEffect(() => {
    if (!company && !isLoading) {
      fetchSettings();
    }
  }, [company, fetchSettings, isLoading]);

  const handleSave = (section: string) => toast.success(`${section} settings saved`);

  const handleGatewayToggle = (gw: 'razorpay' | 'paytm') => {
    if (!gateways) return;
    const current = gateways[gw].status;
    const newStatus = current === 'connected' ? 'disconnected' : 'connected';
    updateGateways({ [gw]: { status: newStatus } } as never);
    toast.success(`${gw === 'razorpay' ? 'Razorpay' : 'Paytm Business'} ${newStatus === 'connected' ? 'connected' : 'disconnected'}`);
  };

  if (isLoading || (!company && !bank && !invoice)) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Manage your company profile, billing, and preferences"
        icon={Settings}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5"><Banknote className="h-3.5 w-3.5" /> Bank</TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Invoice</TabsTrigger>
          <TabsTrigger value="communication" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Comms</TabsTrigger>
          <TabsTrigger value="gateways" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Gateways</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5" onClick={() => navigate('/settings/external-integrations')}><Plug className="h-3.5 w-3.5" /> Integrations</TabsTrigger>
        </TabsList>

        {/* Company Info */}
        <TabsContent value="company">
          {company && (
          <div className="space-y-4 max-w-3xl">
            {/* Logo & Signature Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="shadow-soft">
                <CardHeader className="pb-3"><CardTitle className="text-base">Company Logo</CardTitle></CardHeader>
                <CardContent>
                  <FileUpload
                    label="Logo"
                    description="Used in invoices, PDFs, emails, and reports"
                    preview={company.logo}
                    onUpload={(data) => updateCompany({ logo: data })}
                    onRemove={() => updateCompany({ logo: '' })}
                    aspectRatio="square"
                  />
                </CardContent>
              </Card>
              <Card className="shadow-soft">
                <CardHeader className="pb-3"><CardTitle className="text-base">Authorized Signature</CardTitle></CardHeader>
                <CardContent>
                  <FileUpload
                    label="Signature"
                    description="Appears on invoice PDFs and previews"
                    accept="image/png,image/jpeg"
                    preview={company.signature}
                    onUpload={(data) => updateCompany({ signature: data })}
                    onRemove={() => updateCompany({ signature: '' })}
                    aspectRatio="wide"
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-soft">
              <CardHeader className="pb-3"><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={company.name} onChange={(e) => updateCompany({ name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Legal Name</Label>
                    <Input value={company.legalName} onChange={(e) => updateCompany({ legalName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input value={company.gstNumber} onChange={(e) => updateCompany({ gstNumber: e.target.value })} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <Input value={company.panNumber} onChange={(e) => updateCompany({ panNumber: e.target.value })} className="font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input value={company.website} onChange={(e) => updateCompany({ website: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={company.email} onChange={(e) => updateCompany({ email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={company.phone} onChange={(e) => updateCompany({ phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Address Line 1</Label>
                    <Input value={company.address.line1} onChange={(e) => updateCompany({ address: { ...company.address, line1: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address Line 2</Label>
                    <Input value={company.address.line2} onChange={(e) => updateCompany({ address: { ...company.address, line2: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={company.address.city} onChange={(e) => updateCompany({ address: { ...company.address, city: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={company.address.state} onChange={(e) => updateCompany({ address: { ...company.address, state: e.target.value } })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input value={company.address.pincode} onChange={(e) => updateCompany({ address: { ...company.address, pincode: e.target.value } })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Footer Text</Label>
                  <Textarea rows={2} value={company.footerText} onChange={(e) => updateCompany({ footerText: e.target.value })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Show Logo on Invoices</p>
                    <p className="text-xs text-muted-foreground">Display your company logo on all invoices and reports</p>
                  </div>
                  <Switch checked={company.showLogo} onCheckedChange={(v) => updateCompany({ showLogo: v })} />
                </div>
                <Button onClick={() => handleSave('Company')} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        {/* Bank Info */}
        <TabsContent value="bank">
          {bank && (
          <Card className="shadow-soft max-w-3xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Bank Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input value={bank.bankName} onChange={(e) => updateBank({ bankName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={bank.accountName} onChange={(e) => updateBank({ accountName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={bank.accountNumber} onChange={(e) => updateBank({ accountNumber: e.target.value })} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>IFSC Code</Label>
                  <Input value={bank.ifsc} onChange={(e) => updateBank({ ifsc: e.target.value })} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input value={bank.branch} onChange={(e) => updateBank({ branch: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>UPI ID</Label>
                  <Input value={bank.upiId} onChange={(e) => updateBank({ upiId: e.target.value })} className="font-mono" />
                </div>
              </div>
              <Button onClick={() => handleSave('Bank')} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Invoice Settings */}
        <TabsContent value="invoice">
          {invoice && (
          <Card className="shadow-soft max-w-3xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Invoice Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Prefix</Label>
                  <Input value={invoice.prefix} onChange={(e) => updateInvoice({ prefix: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Next Invoice Number</Label>
                  <Input type="number" value={invoice.nextNumber} onChange={(e) => updateInvoice({ nextNumber: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Default Tax Rate (%)</Label>
                  <Input type="number" value={invoice.defaultTaxRate} onChange={(e) => updateInvoice({ defaultTaxRate: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Input value={invoice.defaultCurrency} onChange={(e) => updateInvoice({ defaultCurrency: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms (days)</Label>
                  <Input type="number" value={invoice.paymentTerms} onChange={(e) => updateInvoice({ paymentTerms: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Terms & Conditions</Label>
                <Textarea rows={3} value={invoice.defaultTerms} onChange={(e) => updateInvoice({ defaultTerms: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Default Notes</Label>
                <Textarea rows={2} value={invoice.defaultNotes} onChange={(e) => updateInvoice({ defaultNotes: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Auto Numbering</p>
                  <p className="text-xs text-muted-foreground">Automatically generate invoice numbers</p>
                </div>
                <Switch checked={invoice.autoNumbering} onCheckedChange={(v) => updateInvoice({ autoNumbering: v })} />
              </div>
              <Button onClick={() => handleSave('Invoice')} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Communication Settings */}
        <TabsContent value="communication">
          {communication && (
          <Card className="shadow-soft max-w-3xl">
            <CardHeader className="pb-3"><CardTitle className="text-base">Communication Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-xs text-muted-foreground">Enable email notifications</p>
                  </div>
                  <Switch checked={communication.emailEnabled} onCheckedChange={(v) => updateCommunication({ emailEnabled: v })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-muted-foreground">Enable WhatsApp messaging</p>
                  </div>
                  <Switch checked={communication.whatsappEnabled} onCheckedChange={(v) => updateCommunication({ whatsappEnabled: v })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" value={communication.email} onChange={(e) => updateCommunication({ email: e.target.value })} placeholder="noreply@company.com" />
                <p className="text-xs text-muted-foreground">Default email used for all communication</p>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input value={communication.whatsappNumber} onChange={(e) => updateCommunication({ whatsappNumber: e.target.value })} placeholder="+91 9876543210" />
                <p className="text-xs text-muted-foreground">Default WhatsApp sender number</p>
              </div>
              <Button onClick={() => handleSave('Communication')} className="gap-2"><Save className="h-4 w-4" /> Save Changes</Button>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Payment Gateway Settings */}
        <TabsContent value="gateways">
          {gateways && (
          <div className="max-w-3xl space-y-4">
            <p className="text-sm text-muted-foreground">Connect your payment gateways to start collecting payments online. Click connect to start the integration flow.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Razorpay */}
              <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card className="shadow-soft hover:shadow-card transition-shadow h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-info/10 mb-4">
                      <Zap className="h-8 w-8 text-info" />
                    </div>
                    <h3 className="text-lg font-semibold">Razorpay</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4 flex-1">Accept payments via cards, UPI, netbanking, and wallets with India's leading payment gateway.</p>
                    <div className="mb-4">
                      {gateways.razorpay.status === 'connected' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-success/10 text-success">
                          <Check className="h-3 w-3" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground">
                          Not Connected
                        </span>
                      )}
                    </div>
                    {gateways.razorpay.status === 'connected' ? (
                      <Button variant="outline" className="w-full" onClick={() => handleGatewayToggle('razorpay')}>Disconnect</Button>
                    ) : (
                      <Button className="w-full gap-2" onClick={() => handleGatewayToggle('razorpay')}>
                        <Zap className="h-4 w-4" /> Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Paytm Business */}
              <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300 }}>
                <Card className="shadow-soft hover:shadow-card transition-shadow h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center h-full">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10 mb-4">
                      <Wallet className="h-8 w-8 text-warning" />
                    </div>
                    <h3 className="text-lg font-semibold">Paytm Business</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4 flex-1">Accept payments seamlessly through Paytm's merchant payment solutions and UPI.</p>
                    <div className="mb-4">
                      {gateways.paytm.status === 'connected' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-success/10 text-success">
                          <Check className="h-3 w-3" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-muted text-muted-foreground">
                          Not Connected
                        </span>
                      )}
                    </div>
                    {gateways.paytm.status === 'connected' ? (
                      <Button variant="outline" className="w-full" onClick={() => handleGatewayToggle('paytm')}>Disconnect</Button>
                    ) : (
                      <Button className="w-full gap-2" onClick={() => handleGatewayToggle('paytm')}>
                        <Wallet className="h-4 w-4" /> Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
