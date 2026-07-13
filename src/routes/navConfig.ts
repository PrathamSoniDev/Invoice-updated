import type { ModuleKey, UserRole } from '@/types';
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  MessageCircle,
  Mail,
  BarChart3,
  Settings,
  ShieldCheck,
  FileCode,
  Crown,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  module: ModuleKey;
  adminOnly?: boolean;
  roles?: UserRole[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, module: 'dashboard' },
      { label: 'Customers', path: '/customers', icon: Users, module: 'customers' },
      { label: 'Invoices', path: '/invoices', icon: FileText, module: 'invoices' },
      { label: 'Payment Links', path: '/payment-links', icon: CreditCard, module: 'payment-links' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'WhatsApp', path: '/communication/whatsapp', icon: MessageCircle, module: 'whatsapp' },
      { label: 'Email', path: '/communication/email', icon: Mail, module: 'email' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Reports', path: '/reports', icon: BarChart3, module: 'reports' },
      { label: 'Settings', path: '/settings', icon: Settings, module: 'settings' },
      // 'External Integrations' page is disabled — nav item removed so the sidebar
      // doesn't link to a route that no longer exists (see App.tsx).
    ],
  },
  {
    title: 'Admin',
    items: [
      { label: 'User Management', path: '/admin/users', icon: Users, module: 'admin', adminOnly: true },
      { label: 'Module Management', path: '/admin/modules', icon: ShieldCheck, module: 'admin', adminOnly: true },
      { label: 'Invoice Templates', path: '/admin/invoice-templates', icon: FileCode, module: 'admin', adminOnly: true },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: ShieldCheck, module: 'admin', adminOnly: true },
      { label: 'Usage Analytics', path: '/admin/usage', icon: BarChart3, module: 'admin', adminOnly: true },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Master Console', path: '/master', icon: Crown, module: 'admin', roles: ['super_admin'] },
    ],
  },
];
