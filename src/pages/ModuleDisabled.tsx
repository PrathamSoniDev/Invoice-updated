import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ModuleKey } from '@/types';

const moduleNames: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  invoices: 'Invoices',
  'payment-links': 'Payment Links',
  whatsapp: 'WhatsApp',
  email: 'Email',
  reports: 'Reports',
  settings: 'Settings',
  admin: 'Admin',
};

export function ModuleDisabled({ moduleName }: { moduleName: ModuleKey }) {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center max-w-md"
      >
        <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-3xl bg-warning/10 text-warning mb-6">
          <Lock className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Module Disabled by Administrator</h1>
        <p className="mt-2 text-muted-foreground">
          The <span className="font-semibold">{moduleNames[moduleName] || moduleName}</span> module has been disabled. Please contact your administrator to regain access.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="mt-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
