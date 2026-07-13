import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useModuleStore } from '@/store/moduleStore';
import type { ModuleKey } from '@/types';
import {
  ShieldCheck, LayoutDashboard, Users, FileText, CreditCard,
  MessageCircle, Mail, BarChart3, Settings,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  MessageCircle,
  Mail,
  BarChart3,
  Settings,
  ShieldCheck,
};

const moduleGroups = [
  {
    title: 'Core Modules',
    description: 'Primary business operations',
    modules: ['dashboard', 'customers', 'invoices', 'payment-links'],
  },
  {
    title: 'Communication',
    description: 'Customer messaging channels',
    modules: ['whatsapp', 'email'],
  },
  {
    title: 'Insights & Configuration',
    description: 'Analytics and system settings',
    modules: ['reports', 'settings'],
  },
  {
    title: 'Administration',
    description: 'Admin-only system controls',
    modules: ['admin'],
  },
];

export function ModuleManagementPage() {
  const { modules, toggleModule } = useModuleStore();

  const handleToggle = (key: ModuleKey, label: string, enabled: boolean) => {
    toggleModule(key);
    toast.success(`${label} ${enabled ? 'disabled' : 'enabled'}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Module Management"
        description="Enable or disable modules. Disabled modules are hidden from the sidebar and access is restricted."
        icon={ShieldCheck}
      />

      {moduleGroups.map((group) => {
        const groupModules = modules.filter((m) => group.modules.includes(m.key));
        if (groupModules.length === 0) return null;
        return (
          <div key={group.title} className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {groupModules.map((mod) => {
                const Icon = iconMap[mod.icon] || LayoutDashboard;
                return (
                  <motion.div key={mod.key} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
                    <Card className={`shadow-soft transition-shadow hover:shadow-card h-full ${!mod.enabled ? 'opacity-70' : ''}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${mod.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <Switch checked={mod.enabled} onCheckedChange={() => handleToggle(mod.key, mod.label, mod.enabled)} disabled={mod.key === 'admin'} />
                        </div>
                        <p className="text-sm font-semibold">{mod.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">{mod.description}</p>
                        <Badge variant={mod.enabled ? 'default' : 'secondary'} className="text-xs">
                          {mod.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      <Card className="shadow-soft bg-muted/30">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">How module access control works</p>
            <p className="text-xs text-muted-foreground mt-1">When a module is disabled, its sidebar menu item is hidden, the route is restricted, and users see a "Module Disabled by Administrator" screen if they try to access it directly.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
