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
import { EmptyState } from '@/components/common/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/store/settingsStore';
import { Settings, Building2, Banknote, FileText, MessageSquare, CreditCard, Save, Check, Zap, Wallet, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck, Link2Off } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function SettingsPage() {
  const {
    company,
    bank,
    invoice,
    communication,
    gateways,
    updateCompany,
    updateBank,
    updateInvoice,
    updateCommunication,
    updateGateways,
    fetchSettings,
    isLoading,
    isInitialized,
    error,
  } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('company');

  // Gateway connect dialog state
  const [connectDialog, setConnectDialog] = useState<'razorpay' | 'paytm' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [razorpayForm, setRazorpayForm] = useState({ keyId: '', keySecret: '', webhookSecret: '', upiId: '' });
  const [paytmForm, setPaytmForm] = useState({ merchantId: '', merchantKey: '', environment: 'TEST' as 'TEST' | 'PROD', upiId: '' });

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      fetchSettings();
    }
  }, [fetchSettings, isInitialized, isLoading]);

  const handleSave = (section: string) => toast.success(`${section} settings saved`);

  const renderSectionEmpty = (section: string) => (
    <Card className="shadow-soft max-w-3xl">
      <EmptyState
        icon={AlertCircle}
        title={`${section} settings unavailable`}
        description="No settings record was returned. You can retry loading or start editing to create the default settings record."
        action={<Button variant="outline" onClick={() => fetchSettings()}>Retry</Button>}
      />
    </Card>
  );

  const openConnectDialog = (gw: 'razorpay' | 'paytm') => {
    setShowSecret(false);
    // IMPORTANT: the secret field is left BLANK when opening the dialog to
    // manage an already-connected gateway. gateways.*.keySecretPreview /
    // merchantKeyPreview only ever hold a masked preview (e.g. "••••3f9a")
    // — never the real secret — so there's nothing to prefill. Leaving the
    // field blank and only sending it up if the user types a new value is
    // what lets "Manage" update the Key ID/webhook/UPI fields without
    // forcing the user to re-enter (or accidentally overwrite with the
    // masked placeholder) a secret they aren't changing.
    if (gw === 'razorpay') {
      setRazorpayForm({
        keyId: gateways?.razorpay.keyId || '',
        keySecret: '',
        webhookSecret: gateways?.razorpay.webhookSecret || '',
        upiId: gateways?.razorpay.upiId || bank?.upiId || '',
      });
    } else {
      setPaytmForm({
        merchantId: gateways?.paytm.merchantId || '',
        merchantKey: '',
        environment: gateways?.paytm.environment || 'TEST',
        upiId: gateways?.paytm.upiId || bank?.upiId || '',
      });
    }
    setConnectDialog(gw);
  };

  const handleRazorpayConnect = async () => {
    const alreadyConnected = gateways?.razorpay.status === 'connected';
    // A secret is required the first time; once connected, it's optional —
    // leaving it blank just means "keep the existing secret".
    if (!razorpayForm.keyId.trim() || (!alreadyConnected && !razorpayForm.keySecret.trim())) {
      toast.error('Key ID and Key Secret are required');
      return;
    }
    setIsConnecting(true);
    try {
      await updateGateways({
        razorpay: {
          status: 'connected',
          keyId: razorpayForm.keyId,
          webhookSecret: razorpayForm.webhookSecret,
          upiId: razorpayForm.upiId,
          ...(razorpayForm.keySecret.trim() ? { keySecret: razorpayForm.keySecret.trim() } : {}),
        },
      });
      toast.success('Razorpay connected successfully');
      setConnectDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to connect Razorpay');
    } finally {
      setIsConnecting(false);
    }
  };

  const handlePaytmConnect = async () => {
    const alreadyConnected = gateways?.paytm.status === 'connected';
    if (!paytmForm.merchantId.trim() || (!alreadyConnected && !paytmForm.merchantKey.trim())) {
      toast.error('Merchant ID and Merchant Key are required');
      return;
    }
    setIsConnecting(true);
    try {
      await updateGateways({
        paytm: {
          status: 'connected',
          merchantId: paytmForm.merchantId,
          environment: paytmForm.environment,
          upiId: paytmForm.upiId,
          ...(paytmForm.merchantKey.trim() ? { merchantKey: paytmForm.merchantKey.trim() } : {}),
        },
      });
      toast.success('Paytm Business connected successfully');
      setConnectDialog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to connect Paytm Business');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGatewayDisconnect = async (gw: 'razorpay' | 'paytm') => {
    try {
      await updateGateways({ [gw]: { status: 'disconnected' } });
      toast.success(`${gw === 'razorpay' ? 'Razorpay' : 'Paytm Business'} disconnected`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update gateway settings');
    }
  };

  if (isLoading && !isInitialized) {
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load settings</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto">
          <TabsTrigger value="company" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1.5"><Banknote className="h-3.5 w-3.5" /> Bank</TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Invoice</TabsTrigger>
          <TabsTrigger value="communication" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Comms</TabsTrigger>
          <TabsTrigger value="gateways" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Gateways</TabsTrigger>
          {/* 'Integrations' tab removed — External Integrations page is disabled */}
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
          {!bank && renderSectionEmpty('Bank')}
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
          {!invoice && renderSectionEmpty('Invoice')}
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
          {!communication && renderSectionEmpty('Communication')}
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
                      <div className="w-full space-y-2">
                        <p className="text-xs text-muted-foreground font-mono">Key ID: {gateways.razorpay.keyId ? `${gateways.razorpay.keyId.slice(0, 8)}••••` : '—'}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => openConnectDialog('razorpay')}>Manage</Button>
                          <Button variant="outline" className="flex-1 gap-1.5 text-destructive hover:text-destructive" onClick={() => handleGatewayDisconnect('razorpay')}>
                            <Link2Off className="h-3.5 w-3.5" /> Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full gap-2" onClick={() => openConnectDialog('razorpay')}>
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
                      <div className="w-full space-y-2">
                        <p className="text-xs text-muted-foreground font-mono">MID: {gateways.paytm.merchantId ? `${gateways.paytm.merchantId.slice(0, 8)}••••` : '—'}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1" onClick={() => openConnectDialog('paytm')}>Manage</Button>
                          <Button variant="outline" className="flex-1 gap-1.5 text-destructive hover:text-destructive" onClick={() => handleGatewayDisconnect('paytm')}>
                            <Link2Off className="h-3.5 w-3.5" /> Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button className="w-full gap-2" onClick={() => openConnectDialog('paytm')}>
                        <Wallet className="h-4 w-4" /> Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
          )}
          {!gateways && renderSectionEmpty('Payment gateway')}
        </TabsContent>
      </Tabs>

      {/* Razorpay Connect Dialog */}
      <Dialog open={connectDialog === 'razorpay'} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10">
                <Zap className="h-5 w-5 text-info" />
              </div>
              <DialogTitle>Connect Razorpay</DialogTitle>
            </div>
            <DialogDescription>
              Enter your Razorpay API credentials from the Razorpay Dashboard (Settings → API Keys) to start accepting cards, UPI, netbanking, and wallet payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Key ID <span className="text-destructive">*</span></Label>
              <Input
                placeholder="rzp_live_XXXXXXXXXXXX"
                className="font-mono"
                value={razorpayForm.keyId}
                onChange={(e) => setRazorpayForm((f) => ({ ...f, keyId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Key Secret {gateways?.razorpay.status !== 'connected' && <span className="text-destructive">*</span>}
              </Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder={
                    gateways?.razorpay.status === 'connected'
                      ? `Currently ${gateways.razorpay.keySecretPreview || '••••••••'} — leave blank to keep`
                      : 'Enter your secret key'
                  }
                  className="font-mono pr-10"
                  value={razorpayForm.keySecret}
                  onChange={(e) => setRazorpayForm((f) => ({ ...f, keySecret: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret((s) => !s)}
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {gateways?.razorpay.status === 'connected' && (
                <p className="text-xs text-muted-foreground">Only enter a value here to replace the stored secret. We never display the full secret once saved.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Webhook Secret <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="Used to verify payment webhook signatures"
                className="font-mono"
                value={razorpayForm.webhookSecret}
                onChange={(e) => setRazorpayForm((f) => ({ ...f, webhookSecret: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Settlement UPI ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="yourbusiness@okhdfcbank"
                value={razorpayForm.upiId}
                onChange={(e) => setRazorpayForm((f) => ({ ...f, upiId: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">UPI ID payouts and settlements will be linked to, in addition to your bank account.</p>
            </div>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Credentials are stored securely and are only used to process payments on your behalf. Card details are never entered here — Razorpay's hosted checkout collects them directly from your customers.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
            <Button onClick={handleRazorpayConnect} disabled={isConnecting} className="gap-2">
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isConnecting ? 'Connecting...' : 'Connect Razorpay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paytm Business Connect Dialog */}
      <Dialog open={connectDialog === 'paytm'} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Wallet className="h-5 w-5 text-warning" />
              </div>
              <DialogTitle>Connect Paytm Business</DialogTitle>
            </div>
            <DialogDescription>
              Enter your Paytm merchant credentials from the Paytm Business Dashboard to accept UPI, cards, and wallet payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Merchant ID (MID) <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. YourBiz12345678901234"
                className="font-mono"
                value={paytmForm.merchantId}
                onChange={(e) => setPaytmForm((f) => ({ ...f, merchantId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Merchant Key {gateways?.paytm.status !== 'connected' && <span className="text-destructive">*</span>}
              </Label>
              <div className="relative">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  placeholder={
                    gateways?.paytm.status === 'connected'
                      ? `Currently ${gateways.paytm.merchantKeyPreview || '••••••••'} — leave blank to keep`
                      : 'Enter your merchant key'
                  }
                  className="font-mono pr-10"
                  value={paytmForm.merchantKey}
                  onChange={(e) => setPaytmForm((f) => ({ ...f, merchantKey: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret((s) => !s)}
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {gateways?.paytm.status === 'connected' && (
                <p className="text-xs text-muted-foreground">Only enter a value here to replace the stored key. We never display the full key once saved.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={paytmForm.environment}
                onValueChange={(v) => setPaytmForm((f) => ({ ...f, environment: v as 'TEST' | 'PROD' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEST">Test / Staging</SelectItem>
                  <SelectItem value="PROD">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Business UPI ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="yourbusiness@paytm"
                value={paytmForm.upiId}
                onChange={(e) => setPaytmForm((f) => ({ ...f, upiId: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Used for direct UPI collect requests and settlement reconciliation.</p>
            </div>
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Credentials are stored securely and are only used to process payments on your behalf. Card details are never entered here — Paytm's hosted checkout collects them directly from your customers.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
            <Button onClick={handlePaytmConnect} disabled={isConnecting} className="gap-2">
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {isConnecting ? 'Connecting...' : 'Connect Paytm Business'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
