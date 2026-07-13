// import { useState } from 'react';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { useIntegrationStore } from '@/store/integrationStore';
// import { Loader2, Plug, TestTube } from 'lucide-react';
// import { toast } from 'sonner';
// import type { ExternalIntegration } from '@/types';

// interface Props {
//   open: boolean;
//   onClose: () => void;
//   integration: ExternalIntegration | null;
// }

// export function IntegrationConfigDialog({ open, onClose, integration }: Props) {
//   const { updateIntegration } = useIntegrationStore();
//   const [testing, setTesting] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [form, setForm] = useState({
//     connectionName: integration?.config.connectionName || '',
//     apiUrl: integration?.config.apiUrl || '',
//     username: integration?.config.username || '',
//     password: '',
//     companyCode: integration?.config.companyCode || '',
//   });

//   const handleChange = (field: keyof typeof form, value: string) => {
//     setForm((f) => ({ ...f, [field]: value }));
//   };

//   const handleTest = () => {
//     if (!form.apiUrl) {
//       toast.error('API URL is required for testing');
//       return;
//     }
//     setTesting(true);
//     setTimeout(() => {
//       setTesting(false);
//       const success = Math.random() > 0.2;
//       if (success) {
//         toast.success('Connection test successful');
//       } else {
//         toast.error('Connection test failed. Check credentials and try again.');
//       }
//     }, 1500);
//   };

//   const handleSave = () => {
//     if (!integration) return;
//     setSaving(true);
//     setTimeout(() => {
//       updateIntegration(integration.id, {
//         config: {
//           connectionName: form.connectionName,
//           apiUrl: form.apiUrl,
//           username: form.username,
//           companyCode: form.companyCode,
//         },
//       });
//       setSaving(false);
//       toast.success('Configuration saved');
//       onClose();
//     }, 800);
//   };

//   if (!integration) return null;

//   return (
//     <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
//       <DialogContent className="max-w-md">
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2">
//             <Plug className="h-5 w-5" /> Configure {integration.name}
//           </DialogTitle>
//         </DialogHeader>

//         <div className="space-y-4">
//           <div className="space-y-2">
//             <Label>Connection Name</Label>
//             <Input
//               value={form.connectionName}
//               onChange={(e) => handleChange('connectionName', e.target.value)}
//               placeholder="e.g. Tally Primary"
//             />
//           </div>

//           <div className="space-y-2">
//             <Label>API URL</Label>
//             <Input
//               value={form.apiUrl}
//               onChange={(e) => handleChange('apiUrl', e.target.value)}
//               placeholder="https://api.example.com"
//             />
//           </div>

//           <div className="space-y-2">
//             <Label>Username</Label>
//             <Input
//               value={form.username}
//               onChange={(e) => handleChange('username', e.target.value)}
//               placeholder="API username"
//             />
//           </div>

//           <div className="space-y-2">
//             <Label>Password / Access Token</Label>
//             <Input
//               type="password"
//               value={form.password}
//               onChange={(e) => handleChange('password', e.target.value)}
//               placeholder="••••••••"
//             />
//             <p className="text-[10px] text-muted-foreground">
//               Credentials are stored securely on the backend. Never exposed to the frontend.
//             </p>
//           </div>

//           <div className="space-y-2">
//             <Label>Company Code</Label>
//             <Input
//               value={form.companyCode}
//               onChange={(e) => handleChange('companyCode', e.target.value)}
//               placeholder="DEMO-001"
//             />
//           </div>
//         </div>

//         <DialogFooter className="gap-2">
//           <Button variant="outline" onClick={onClose}>Cancel</Button>
//           <Button variant="secondary" onClick={handleTest} disabled={testing} className="gap-1">
//             {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
//             {testing ? 'Testing...' : 'Test Connection'}
//           </Button>
//           <Button onClick={handleSave} disabled={saving}>
//             {saving ? 'Saving...' : 'Save Configuration'}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }
