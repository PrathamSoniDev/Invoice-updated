import { create } from 'zustand';
import type { Invoice, Customer, PaymentLink, ModuleKey, UserRole } from '@/types';
import { navSections } from '@/routes/navConfig';

// Pages register whatever data they've already fetched into this store

interface SearchIndexState {
  invoices: Invoice[];
  customers: Customer[];
  paymentLinks: PaymentLink[];
  setInvoices: (invoices: Invoice[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setPaymentLinks: (paymentLinks: PaymentLink[]) => void;
}

export const useSearchIndexStore = create<SearchIndexState>((set) => ({
  invoices: [],
  customers: [],
  paymentLinks: [],
  setInvoices: (invoices) => set({ invoices }),
  setCustomers: (customers) => set({ customers }),
  setPaymentLinks: (paymentLinks) => set({ paymentLinks }),
}));

export interface SearchResult {
  id: string;
  type: 'invoice' | 'customer' | 'payment-link' | 'nav';
  title: string;
  subtitle: string;
  path: string;
}

const NAV_ITEMS = navSections.flatMap((section) =>
  section.items.map((item) => ({
    label: item.label,
    path: item.path,
    module: item.module,
    adminOnly: item.adminOnly,
    roles: item.roles,
  }))
);

function matchesPermissions(
  item: { module: ModuleKey; adminOnly?: boolean; roles?: UserRole[] },
  userPermissions: string[] | undefined,
  userRole: UserRole | undefined
): boolean {
  if (item.adminOnly && userRole !== 'admin') return false;
  if (item.roles && userRole && !item.roles.includes(userRole)) return false;
  if (item.module !== 'admin' && userPermissions && !userPermissions.includes(item.module)) return false;
  return true;
}

export function searchIndex(
  query: string,
  userPermissions?: string[],
  userRole?: UserRole
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  // Quick-nav matches first — jumping to a whole section is usually what
  // someone typing a section name (e.g. "invoices", "custom") is after.
  for (const item of NAV_ITEMS) {
    if (!matchesPermissions(item, userPermissions, userRole)) continue;
    if (item.label.toLowerCase().includes(q)) {
      results.push({
        id: item.path,
        type: 'nav',
        title: item.label,
        subtitle: 'Go to page',
        path: item.path,
      });
    }
  }

  const { invoices, customers, paymentLinks } = useSearchIndexStore.getState();

  for (const inv of invoices) {
    if (
      inv.number?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.customerEmail?.toLowerCase().includes(q)
    ) {
      results.push({
        id: inv.id,
        type: 'invoice',
        title: inv.number,
        subtitle: inv.customerName,
        path: `/invoices/${inv.id}`,
      });
    }
  }

  for (const c of customers) {
    if (
      c.name?.toLowerCase().includes(q) ||
      c.businessName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    ) {
      results.push({
        id: c.id,
        type: 'customer',
        title: c.name,
        subtitle: c.businessName || c.email,
        path: `/customers/${c.id}`,
      });
    }
  }

  for (const p of paymentLinks) {
    if (
      p.linkId?.toLowerCase().includes(q) ||
      p.customerName?.toLowerCase().includes(q)
    ) {
      results.push({
        id: p.id,
        type: 'payment-link',
        title: p.linkId,
        subtitle: p.customerName,
        path: `/payment-links/${p.id}`,
      });
    }
  }

  return results.slice(0, 8);
}
