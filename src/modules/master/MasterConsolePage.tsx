import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  UserStatusBadge,
  InvoiceStatusBadge,
  PaymentLinkStatusBadge,
} from '@/components/common/StatusBadge';
import { getInitials, formatDate, formatCurrency } from '@/utils';
import { isValidEmail } from '@/utils/validation';
import {
  masterService,
  type MasterUserRow,
  type MasterCompanyRow,
  type MasterInvoiceRow,
  type MasterCustomerRow,
  type MasterPaymentRow,
  type MasterPaymentLinkRow,
  type MasterPlan,
} from '@/services/masterService';
import type { InvoiceStatus, ModuleKey, UserRole, UserStatus } from '@/types';
import {
  Crown,
  Building2,
  Users,
  Search,
  FileText,
  Wallet,
  Link2,
  Plus,
  Edit,
  Trash2,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  business: 'Business',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
};

const ROLE_PERMISSIONS: Record<string, ModuleKey[]> = {
  admin: ['dashboard', 'customers', 'invoices', 'payment-links', 'whatsapp', 'email', 'reports', 'settings', 'admin'],
  business: ['dashboard', 'customers', 'invoices', 'payment-links', 'reports', 'settings'],
  manager: ['dashboard', 'customers', 'invoices', 'payment-links', 'whatsapp', 'email', 'reports', 'settings'],
  staff: ['dashboard', 'customers', 'invoices', 'payment-links', 'whatsapp', 'email'],
  viewer: ['dashboard', 'reports'],
};

interface LineItemDraft {
  description: string;
  quantity: string;
  rate: string;
  discount: string;
  taxRate: string;
}

const emptyLineItem = (): LineItemDraft => ({ description: '', quantity: '1', rate: '0', discount: '0', taxRate: '0' });

export function MasterConsolePage() {
  const { user } = useAuthStore();

  const [users, setUsers] = useState<MasterUserRow[]>([]);
  const [companies, setCompanies] = useState<MasterCompanyRow[]>([]);
  const [invoices, setInvoices] = useState<MasterInvoiceRow[]>([]);
  const [customers, setCustomers] = useState<MasterCustomerRow[]>([]);
  const [payments, setPayments] = useState<MasterPaymentRow[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<MasterPaymentLinkRow[]>([]);
  const [plans, setPlans] = useState<MasterPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // ---- Company-scoped customer picker (used by the invoice & payment link
  // create dialogs, since a customer belongs to exactly one company). ----
  const [companyCustomers, setCompanyCustomers] = useState<{ id: string; name: string; email: string }[]>([]);

  const loadAll = useCallback(() => {
    setLoading(true);
    return Promise.all([
      masterService.getAllUsers({ search, role: roleFilter }),
      masterService.getAllCompanies(),
      masterService.getAllInvoices(),
      masterService.getAllCustomers(),
      masterService.getAllPayments(),
      masterService.getAllPaymentLinks(),
      masterService.getPlans(),
    ])
      .then(([u, c, inv, cust, pay, links, planList]) => {
        setUsers(u);
        setCompanies(c);
        setInvoices(inv);
        setCustomers(cust);
        setPayments(pay);
        setPaymentLinks(links);
        setPlans(planList);
      })
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  // The is_super_admin() RLS grant is read-only and applies uniformly, so a
  // single load covers users, companies, invoices, customers and payments —
  // "everything" the master account is meant to see, not just user records.
  useEffect(() => {
    let cancelled = false;
    loadAll().then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  // ==========================================================================
  // Users: create / edit / delete
  // ==========================================================================
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<MasterUserRow | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<MasterUserRow | null>(null);

  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uConfirmPassword, setUConfirmPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('staff');
  const [uStatus, setUStatus] = useState<UserStatus>('invited');
  const [uCompanyId, setUCompanyId] = useState('');
  const [uNewCompanyName, setUNewCompanyName] = useState('');

  const [editUName, setEditUName] = useState('');
  const [editUPhone, setEditUPhone] = useState('');
  const [editURole, setEditURole] = useState<UserRole>('staff');
  const [editUStatus, setEditUStatus] = useState<UserStatus>('active');

  const resetUserForm = () => {
    setUName(''); setUEmail(''); setUPassword(''); setUConfirmPassword('');
    setURole('staff'); setUStatus('invited'); setUCompanyId(''); setUNewCompanyName('');
  };

  const openEditUser = (row: MasterUserRow) => {
    setEditUser(row);
    setEditUName(row.name);
    setEditUPhone(row.phone || '');
    setEditURole(row.role);
    setEditUStatus(row.status);
  };

  const handleCreateUser = async () => {
    if (!uName || !uEmail || !uPassword) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (!isValidEmail(uEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (uPassword !== uConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (uPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (uRole === 'admin' && uNewCompanyName.trim()) {
      // Creating a brand-new tenant for a new Admin — companyId not required.
    } else if (!uCompanyId) {
      toast.error('Select which company this user belongs to');
      return;
    }

    try {
      const created = await masterService.createUser({
        name: uName,
        email: uEmail,
        password: uPassword,
        role: uRole,
        companyId: uCompanyId || undefined,
        companyName: uRole === 'admin' ? uNewCompanyName.trim() || undefined : undefined,
        status: uStatus,
        permissions: ROLE_PERMISSIONS[uRole],
      });
      setUsers((prev) => [created, ...prev]);
      setCreateUserOpen(false);
      resetUserForm();
      toast.success('User created successfully');
      loadAll();

      // Fire the invite email after creation succeeds. 
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
        const inviteResponse = await fetch(`${apiUrl}/users/send-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: uEmail, name: uName, companyName: created.companyName || uNewCompanyName }),
        });
        let inviteResult: { message?: string } = {};
        try {
          inviteResult = await inviteResponse.json();
        } catch {
          // Non-JSON response (e.g. the backend isn't running and a dev
          // server / proxy returned an HTML error page instead).
        }
        if (!inviteResponse.ok) {
          throw new Error(inviteResult.message || `Failed to send invite email (HTTP ${inviteResponse.status})`);
        }
      } catch (inviteError) {
        console.error('[MasterConsolePage] invite email failed:', inviteError);
        toast.error(
          inviteError instanceof Error
            ? `User created, but invite email failed: ${inviteError.message}`
            : 'User created, but the invite email failed to send.'
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  // ---- Re-authentication gate for sensitive ops (delete user, promote to
  // Admin) — re-confirms the current Super Admin's own password via
  // signInWithPassword before the underlying action runs. A confirm dialog
  // alone only proves "I clicked a button", not "I am who I claim to be
  // right now" (e.g. an unattended, still-logged-in session); re-entering
  // the password closes that gap for the two highest-blast-radius actions
  // in this console. ----
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthBusy, setReauthBusy] = useState(false);
  const [reauthLabel, setReauthLabel] = useState('');
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  const requireReauth = (label: string, action: () => Promise<void>) => {
    setReauthLabel(label);
    pendingActionRef.current = action;
    setReauthPassword('');
    setReauthError('');
    setReauthOpen(true);
  };

  const handleReauthConfirm = async () => {
    if (!user?.email) {
      setReauthError('Could not determine your account email — please log in again.');
      return;
    }
    if (!reauthPassword) {
      setReauthError('Enter your password to continue');
      return;
    }
    setReauthBusy(true);
    setReauthError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: reauthPassword,
      });
      if (error) {
        setReauthError('Incorrect password');
        setReauthBusy(false);
        return;
      }
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      setReauthOpen(false);
      setReauthPassword('');
      if (action) await action();
    } catch (error) {
      setReauthError(error instanceof Error ? error.message : 'Re-authentication failed');
    } finally {
      setReauthBusy(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;
    if (!editUName.trim()) {
      toast.error('Name is required');
      return;
    }

    const performUpdate = async () => {
      try {
        const updated = await masterService.updateUser(editUser.id, {
          name: editUName.trim(),
          role: editURole,
          status: editUStatus,
          phone: editUPhone.trim(),
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setEditUser(null);
        toast.success('User updated');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update user');
      }
    };

    // Promoting someone to Admin is a highest-privilege action within their
    // company — re-confirm identity first. Any other edit (name/phone/status,
    // or a role change that isn't a promotion to Admin) proceeds directly.
    if (editURole === 'admin' && editUser.role !== 'admin') {
      requireReauth(`promote ${editUser.name} to Admin`, performUpdate);
      return;
    }
    await performUpdate();
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    const target = deleteUserTarget;
    const performDelete = async () => {
      try {
        await masterService.deleteUser(target.id);
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
        setDeleteUserTarget(null);
        toast.success('User deleted');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete user');
      }
    };
    requireReauth(`delete ${target.name}`, performDelete);
  };

  // ==========================================================================
  // Customers: create / edit / delete
  // ==========================================================================
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<MasterCustomerRow | null>(null);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<MasterCustomerRow | null>(null);

  const [cCompanyId, setCCompanyId] = useState('');
  const [cName, setCName] = useState('');
  const [cBusinessName, setCBusinessName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cMobile, setCMobile] = useState('');
  const [cGst, setCGst] = useState('');
  const [cCity, setCCity] = useState('');
  const [cState, setCState] = useState('');
  const [cPincode, setCPincode] = useState('');

  const [editCName, setEditCName] = useState('');
  const [editCBusinessName, setEditCBusinessName] = useState('');
  const [editCEmail, setEditCEmail] = useState('');
  const [editCMobile, setEditCMobile] = useState('');
  const [editCStatus, setEditCStatus] = useState<'active' | 'inactive'>('active');

  const resetCustomerForm = () => {
    setCCompanyId(''); setCName(''); setCBusinessName(''); setCEmail('');
    setCMobile(''); setCGst(''); setCCity(''); setCState(''); setCPincode('');
  };

  const openEditCustomer = (row: MasterCustomerRow) => {
    setEditCustomer(row);
    setEditCName(row.name);
    setEditCBusinessName(row.businessName);
    setEditCEmail(row.email);
    setEditCMobile(row.mobile);
    setEditCStatus('active');
  };

  const handleCreateCustomer = async () => {
    if (!cCompanyId) {
      toast.error('Select which company this customer belongs to');
      return;
    }
    if (!cName || !cEmail || !cMobile || !cBusinessName) {
      toast.error('Name, business name, email, and mobile are required');
      return;
    }
    try {
      const created = await masterService.createCustomer(cCompanyId, {
        name: cName,
        businessName: cBusinessName,
        email: cEmail,
        mobile: cMobile,
        gstNumber: cGst || undefined,
        billingAddress: { line1: '', city: cCity, state: cState, pincode: cPincode, country: 'India' },
      });
      setCustomers((prev) => [created, ...prev]);
      setCreateCustomerOpen(false);
      resetCustomerForm();
      toast.success('Customer created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    }
  };

  const handleEditCustomer = async () => {
    if (!editCustomer) return;
    try {
      const updated = await masterService.updateCustomer(editCustomer.id, {
        name: editCName,
        businessName: editCBusinessName,
        email: editCEmail,
        mobile: editCMobile,
        status: editCStatus,
      });
      setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditCustomer(null);
      toast.success('Customer updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update customer');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerTarget) return;
    try {
      await masterService.deleteCustomer(deleteCustomerTarget.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deleteCustomerTarget.id));
      setDeleteCustomerTarget(null);
      toast.success('Customer deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
    }
  };

  // ==========================================================================
  // Invoices: create / edit status / delete
  // ==========================================================================
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<MasterInvoiceRow | null>(null);
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] = useState<MasterInvoiceRow | null>(null);

  const [iCompanyId, setICompanyId] = useState('');
  const [iCustomerId, setICustomerId] = useState('');
  const [iIssueDate, setIIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [iDueDate, setIDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [iItems, setIItems] = useState<LineItemDraft[]>([emptyLineItem()]);
  const [iNotes, setINotes] = useState('');

  const [editIStatus, setEditIStatus] = useState<InvoiceStatus>('draft');

  const resetInvoiceForm = () => {
    setICompanyId(''); setICustomerId(''); setIItems([emptyLineItem()]); setINotes('');
    setIIssueDate(new Date().toISOString().slice(0, 10));
    setIDueDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  };

  const onInvoiceCompanyChange = async (companyId: string) => {
    setICompanyId(companyId);
    setICustomerId('');
    if (!companyId) {
      setCompanyCustomers([]);
      return;
    }
    try {
      const list = await masterService.getCompanyCustomers(companyId);
      setCompanyCustomers(list);
    } catch {
      setCompanyCustomers([]);
    }
  };

  const updateLineItem = (index: number, patch: Partial<LineItemDraft>) => {
    setIItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleCreateInvoice = async () => {
    if (!iCompanyId) {
      toast.error('Select a company');
      return;
    }
    if (!iCustomerId) {
      toast.error('Select a customer');
      return;
    }
    const items = iItems
      .filter((item) => item.description.trim())
      .map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        rate: parseFloat(item.rate) || 0,
        discount: parseFloat(item.discount) || 0,
        taxRate: parseFloat(item.taxRate) || 0,
      }));
    if (items.length === 0) {
      toast.error('Add at least one line item');
      return;
    }
    try {
      const created = await masterService.createInvoice(iCompanyId, {
        customerId: iCustomerId,
        issueDate: iIssueDate,
        dueDate: iDueDate,
        items,
        notes: iNotes || undefined,
      });
      setInvoices((prev) => [created, ...prev]);
      setCreateInvoiceOpen(false);
      resetInvoiceForm();
      toast.success('Invoice created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
    }
  };

  const handleUpdateInvoiceStatus = async () => {
    if (!editInvoice) return;
    try {
      const updated = await masterService.updateInvoice(editInvoice.id, { status: editIStatus });
      setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      setEditInvoice(null);
      toast.success('Invoice updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update invoice');
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteInvoiceTarget) return;
    try {
      await masterService.deleteInvoice(deleteInvoiceTarget.id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== deleteInvoiceTarget.id));
      setDeleteInvoiceTarget(null);
      toast.success('Invoice deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete invoice');
    }
  };

  // ==========================================================================
  // Payment Links: create / edit status / delete
  // ==========================================================================
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [editLink, setEditLink] = useState<MasterPaymentLinkRow | null>(null);
  const [deleteLinkTarget, setDeleteLinkTarget] = useState<MasterPaymentLinkRow | null>(null);

  const [lCompanyId, setLCompanyId] = useState('');
  const [lCustomerId, setLCustomerId] = useState('');
  const [lAmount, setLAmount] = useState('');
  const [lGateway, setLGateway] = useState('razorpay');
  const [lDescription, setLDescription] = useState('');
  const [lExpiryDays, setLExpiryDays] = useState('30');

  const [editLStatus, setEditLStatus] = useState<'pending' | 'paid' | 'expired' | 'failed' | 'cancelled'>('pending');

  const resetLinkForm = () => {
    setLCompanyId(''); setLCustomerId(''); setLAmount(''); setLGateway('razorpay');
    setLDescription(''); setLExpiryDays('30');
  };

  const onLinkCompanyChange = async (companyId: string) => {
    setLCompanyId(companyId);
    setLCustomerId('');
    if (!companyId) {
      setCompanyCustomers([]);
      return;
    }
    try {
      const list = await masterService.getCompanyCustomers(companyId);
      setCompanyCustomers(list);
    } catch {
      setCompanyCustomers([]);
    }
  };

  const handleCreateLink = async () => {
    if (!lCompanyId) {
      toast.error('Select a company');
      return;
    }
    if (!lCustomerId) {
      toast.error('Select a customer');
      return;
    }
    const amount = parseFloat(lAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    try {
      const created = await masterService.createPaymentLink(lCompanyId, {
        customerId: lCustomerId,
        amount,
        gateway: lGateway,
        description: lDescription || undefined,
        expiryDays: parseInt(lExpiryDays, 10) || 30,
      });
      setPaymentLinks((prev) => [created, ...prev]);
      setCreateLinkOpen(false);
      resetLinkForm();
      toast.success('Payment link created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create payment link');
    }
  };

  const handleUpdateLinkStatus = async () => {
    if (!editLink) return;
    try {
      const updated = await masterService.updatePaymentLinkStatus(editLink.id, editLStatus);
      setPaymentLinks((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      setEditLink(null);
      toast.success('Payment link updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update payment link');
    }
  };

  const handleDeleteLink = async () => {
    if (!deleteLinkTarget) return;
    try {
      await masterService.deletePaymentLink(deleteLinkTarget.id);
      setPaymentLinks((prev) => prev.filter((l) => l.id !== deleteLinkTarget.id));
      setDeleteLinkTarget(null);
      toast.success('Payment link deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete payment link');
    }
  };

  // ==========================================================================
  // Billing: change a company's plan/status
  // ==========================================================================
  const [planDialogCompany, setPlanDialogCompany] = useState<MasterCompanyRow | null>(null);
  const [planSelection, setPlanSelection] = useState('free');
  const [planStatusSelection, setPlanStatusSelection] = useState<'active' | 'past_due' | 'cancelled' | 'trialing'>('active');
  const [planSaving, setPlanSaving] = useState(false);

  const openPlanDialog = (row: MasterCompanyRow) => {
    setPlanDialogCompany(row);
    setPlanSelection(row.subscriptionPlan);
    setPlanStatusSelection(row.subscriptionStatus as typeof planStatusSelection);
  };

  const handleChangePlan = async () => {
    if (!planDialogCompany) return;
    setPlanSaving(true);
    try {
      const updated = await masterService.updateCompanyPlan(planDialogCompany.id, planSelection, planStatusSelection);
      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setPlanDialogCompany(null);
      toast.success('Plan updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update plan');
    } finally {
      setPlanSaving(false);
    }
  };

  // Guard belongs on the page itself (in addition to nav visibility) so the
  // route can't be reached directly by pasting the URL as a non-master user.
  // RLS is the real backstop either way: a non SUPER_ADMIN hitting these
  // queries will simply get back their own company's rows (or none), never
  // other tenants' data.
  if (user && user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const columns: Column<MasterUserRow>[] = [
    {
      key: 'name',
      header: 'User',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium leading-none">{row.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'companyName',
      header: 'Company',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {row.companyName || '—'}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (row) => <Badge variant="outline">{ROLE_LABEL[row.role] || row.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <UserStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Created',
      cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditUser(row); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteUserTarget(row); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const invoiceColumns: Column<MasterInvoiceRow>[] = [
    { key: 'number', header: 'Invoice #', cell: (row) => <span className="font-medium">{row.number}</span> },
    {
      key: 'companyName',
      header: 'Company',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {row.companyName || '—'}
        </div>
      ),
    },
    { key: 'customerName', header: 'Customer', cell: (row) => row.customerName || '—' },
    { key: 'status', header: 'Status', cell: (row) => <InvoiceStatusBadge status={row.status} /> },
    { key: 'total', header: 'Total', cell: (row) => formatCurrency(row.total) },
    { key: 'dueDate', header: 'Due', cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.dueDate)}</span> },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditInvoice(row); setEditIStatus(row.status); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteInvoiceTarget(row); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const customerColumns: Column<MasterCustomerRow>[] = [
    { key: 'name', header: 'Name', cell: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'companyName',
      header: 'Company',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {row.companyName || '—'}
        </div>
      ),
    },
    { key: 'businessName', header: 'Business', cell: (row) => row.businessName || '—' },
    { key: 'email', header: 'Email', cell: (row) => row.email },
    { key: 'mobile', header: 'Mobile', cell: (row) => row.mobile },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditCustomer(row); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteCustomerTarget(row); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const paymentColumns: Column<MasterPaymentRow>[] = [
    {
      key: 'companyName',
      header: 'Company',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {row.companyName || '—'}
        </div>
      ),
    },
    { key: 'customerName', header: 'Customer', cell: (row) => row.customerName || '—' },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount) },
    { key: 'method', header: 'Method', cell: (row) => <Badge variant="outline">{row.method}</Badge> },
    { key: 'status', header: 'Status', cell: (row) => <Badge variant="outline">{row.status}</Badge> },
    { key: 'createdAt', header: 'Date', cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span> },
  ];

  const paymentLinkColumns: Column<MasterPaymentLinkRow>[] = [
    { key: 'linkId', header: 'Link', cell: (row) => <span className="font-mono text-xs">{row.linkId}</span> },
    {
      key: 'companyName',
      header: 'Company',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          {row.companyName || '—'}
        </div>
      ),
    },
    { key: 'customerName', header: 'Customer', cell: (row) => row.customerName || '—' },
    { key: 'amount', header: 'Amount', cell: (row) => formatCurrency(row.amount) },
    { key: 'gateway', header: 'Gateway', cell: (row) => <Badge variant="outline" className="capitalize">{row.gateway}</Badge> },
    { key: 'status', header: 'Status', cell: (row) => <PaymentLinkStatusBadge status={row.status as never} /> },
    { key: 'expiryDate', header: 'Expires', cell: (row) => <span className="text-sm text-muted-foreground">{row.expiryDate ? formatDate(row.expiryDate) : '—'}</span> },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditLink(row); setEditLStatus(row.status as never); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteLinkTarget(row); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const billingColumns: Column<MasterCompanyRow>[] = [
    { key: 'name', header: 'Company', cell: (row) => <span className="font-medium">{row.name}</span> },
    {
      key: 'subscriptionPlan',
      header: 'Plan',
      cell: (row) => <Badge variant="outline" className="capitalize">{row.subscriptionPlan}</Badge>,
    },
    {
      key: 'subscriptionStatus',
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.subscriptionStatus === 'active' ? 'outline' : 'destructive'} className="capitalize">
          {row.subscriptionStatus.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'invoicesThisCycle',
      header: 'Invoices this cycle',
      cell: (row) => (
        <span className={row.invoiceQuota > 0 && row.invoicesThisCycle >= row.invoiceQuota ? 'text-destructive font-medium' : ''}>
          {row.invoicesThisCycle} / {row.invoiceQuota || '∞'}
        </span>
      ),
    },
    {
      key: 'userCount',
      header: 'Users',
      cell: (row) => (
        <span className={row.userQuota > 0 && row.userCount >= row.userQuota ? 'text-destructive font-medium' : ''}>
          {row.userCount} / {row.userQuota || '∞'}
        </span>
      ),
    },
    {
      key: 'billingCycleStart',
      header: 'Cycle Start',
      cell: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.billingCycleStart)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openPlanDialog(row); }}>
          Change Plan
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Console"
        description="Every company, admin, staff member, invoice, customer, and payment across the platform"
        icon={Crown}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{companies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{users.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payments</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="links">Payment Links</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4 pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" className="gap-2" onClick={() => setCreateUserOpen(true)}>
                  <Plus className="h-4 w-4" /> Add User
                </Button>
              </div>

              <DataTable
                columns={columns}
                data={users}
                isLoading={loading}
                emptyTitle="No users found"
                emptyDescription="No users match your current filters."
              />
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4 pt-4">
              <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={() => setCreateInvoiceOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Invoice
                </Button>
              </div>
              <DataTable
                columns={invoiceColumns}
                data={invoices}
                isLoading={loading}
                emptyTitle="No invoices found"
                emptyDescription="No invoices exist across any company yet."
              />
            </TabsContent>

            <TabsContent value="customers" className="space-y-4 pt-4">
              <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={() => setCreateCustomerOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Customer
                </Button>
              </div>
              <DataTable
                columns={customerColumns}
                data={customers}
                isLoading={loading}
                emptyTitle="No customers found"
                emptyDescription="No customers exist across any company yet."
              />
            </TabsContent>

            <TabsContent value="payments" className="pt-4">
              <DataTable
                columns={paymentColumns}
                data={payments}
                isLoading={loading}
                emptyTitle="No payments found"
                emptyDescription="No payments exist across any company yet."
              />
            </TabsContent>

            <TabsContent value="links" className="space-y-4 pt-4">
              <div className="flex justify-end">
                <Button size="sm" className="gap-2" onClick={() => setCreateLinkOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Payment Link
                </Button>
              </div>
              <DataTable
                columns={paymentLinkColumns}
                data={paymentLinks}
                isLoading={loading}
                emptyTitle="No payment links found"
                emptyDescription="No payment links exist across any company yet."
              />
            </TabsContent>

            <TabsContent value="billing" className="space-y-4 pt-4">
              <DataTable
                columns={billingColumns}
                data={companies}
                isLoading={loading}
                emptyTitle="No companies found"
                emptyDescription="No companies exist yet."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ==================== Create User ==================== */}
      <Dialog open={createUserOpen} onOpenChange={(v) => { setCreateUserOpen(v); if (!v) resetUserForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="h-4 w-4 text-primary" /> Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} placeholder="john@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input type="password" value={uConfirmPassword} onChange={(e) => setUConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={uRole} onValueChange={(v) => setURole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="business">Business User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={uStatus} onValueChange={(v) => setUStatus(v as UserStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {uRole === 'admin' ? (
              <div className="space-y-2">
                <Label>New Company Name (creates a new tenant)</Label>
                <Input value={uNewCompanyName} onChange={(e) => setUNewCompanyName(e.target.value)} placeholder="Acme Corp" />
                <p className="text-xs text-muted-foreground">
                  Leave blank and pick an existing company below instead if this Admin should join one you already manage.
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Company{uRole === 'admin' ? ' (existing, optional)' : ' *'}</Label>
              <Select value={uCompanyId} onValueChange={setUCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateUserOpen(false); resetUserForm(); }}>Cancel</Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Edit User ==================== */}
      <Dialog open={Boolean(editUser)} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editUName} onChange={(e) => setEditUName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editUPhone} onChange={(e) => setEditUPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editUser.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editURole} onValueChange={(v) => setEditURole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="business">Business User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editUStatus} onValueChange={(v) => setEditUStatus(v as UserStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteUserTarget)}
        onOpenChange={(v) => !v && setDeleteUserTarget(null)}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteUserTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDeleteUser}
      />

      {/* ==================== Create Customer ==================== */}
      <Dialog open={createCustomerOpen} onOpenChange={(v) => { setCreateCustomerOpen(v); if (!v) resetCustomerForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select value={cCompanyId} onValueChange={setCCompanyId}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input value={cBusinessName} onChange={(e) => setCBusinessName(e.target.value)} placeholder="Smith Traders" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="jane@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Mobile *</Label>
                <Input value={cMobile} onChange={(e) => setCMobile(e.target.value)} placeholder="9876543210" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input value={cGst} onChange={(e) => setCGst(e.target.value)} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={cCity} onChange={(e) => setCCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={cState} onChange={(e) => setCState(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input value={cPincode} onChange={(e) => setCPincode(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateCustomerOpen(false); resetCustomerForm(); }}>Cancel</Button>
            <Button onClick={handleCreateCustomer}>Create Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Edit Customer ==================== */}
      <Dialog open={Boolean(editCustomer)} onOpenChange={(v) => !v && setEditCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          {editCustomer && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={editCName} onChange={(e) => setEditCName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input value={editCBusinessName} onChange={(e) => setEditCBusinessName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editCEmail} onChange={(e) => setEditCEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input value={editCMobile} onChange={(e) => setEditCMobile(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editCStatus} onValueChange={(v) => setEditCStatus(v as 'active' | 'inactive')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Cancel</Button>
            <Button onClick={handleEditCustomer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteCustomerTarget)}
        onOpenChange={(v) => !v && setDeleteCustomerTarget(null)}
        title="Delete Customer"
        description={`Are you sure you want to delete ${deleteCustomerTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDeleteCustomer}
      />

      {/* ==================== Create Invoice ==================== */}
      <Dialog open={createInvoiceOpen} onOpenChange={(v) => { setCreateInvoiceOpen(v); if (!v) resetInvoiceForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Company *</Label>
                <Select value={iCompanyId} onValueChange={onInvoiceCompanyChange}>
                  <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Select value={iCustomerId} onValueChange={setICustomerId} disabled={!iCompanyId}>
                  <SelectTrigger><SelectValue placeholder={iCompanyId ? 'Select a customer' : 'Pick a company first'} /></SelectTrigger>
                  <SelectContent>
                    {companyCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Issue Date</Label>
                <Input type="date" value={iIssueDate} onChange={(e) => setIIssueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={iDueDate} onChange={(e) => setIDueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" onClick={() => setIItems((prev) => [...prev, emptyLineItem()])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
              </div>
              {iItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end border rounded-md p-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={item.description} onChange={(e) => updateLineItem(idx, { description: e.target.value })} placeholder="Item description" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, { quantity: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input type="number" value={item.rate} onChange={(e) => updateLineItem(idx, { rate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tax %</Label>
                    <Input type="number" value={item.taxRate} onChange={(e) => updateLineItem(idx, { taxRate: e.target.value })} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    disabled={iItems.length === 1}
                    onClick={() => setIItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={iNotes} onChange={(e) => setINotes(e.target.value)} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateInvoiceOpen(false); resetInvoiceForm(); }}>Cancel</Button>
            <Button onClick={handleCreateInvoice}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Edit Invoice status ==================== */}
      <Dialog open={Boolean(editInvoice)} onOpenChange={(v) => !v && setEditInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Invoice Status</DialogTitle>
          </DialogHeader>
          {editInvoice && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Invoice <span className="font-medium text-foreground">{editInvoice.number}</span> for {editInvoice.companyName}</p>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editIStatus} onValueChange={(v) => setEditIStatus(v as InvoiceStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInvoice(null)}>Cancel</Button>
            <Button onClick={handleUpdateInvoiceStatus}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteInvoiceTarget)}
        onOpenChange={(v) => !v && setDeleteInvoiceTarget(null)}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice ${deleteInvoiceTarget?.number}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDeleteInvoice}
      />

      {/* ==================== Create Payment Link ==================== */}
      <Dialog open={createLinkOpen} onOpenChange={(v) => { setCreateLinkOpen(v); if (!v) resetLinkForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Add New Payment Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Company *</Label>
              <Select value={lCompanyId} onValueChange={onLinkCompanyChange}>
                <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={lCustomerId} onValueChange={setLCustomerId} disabled={!lCompanyId}>
                <SelectTrigger><SelectValue placeholder={lCompanyId ? 'Select a customer' : 'Pick a company first'} /></SelectTrigger>
                <SelectContent>
                  {companyCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" value={lAmount} onChange={(e) => setLAmount(e.target.value)} placeholder="1000" />
              </div>
              <div className="space-y-2">
                <Label>Gateway</Label>
                <Select value={lGateway} onValueChange={setLGateway}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay">Razorpay</SelectItem>
                    <SelectItem value="paytm">Paytm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiry (days)</Label>
              <Input type="number" value={lExpiryDays} onChange={(e) => setLExpiryDays(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={lDescription} onChange={(e) => setLDescription(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateLinkOpen(false); resetLinkForm(); }}>Cancel</Button>
            <Button onClick={handleCreateLink}>Create Payment Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Edit Payment Link status ==================== */}
      <Dialog open={Boolean(editLink)} onOpenChange={(v) => !v && setEditLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Link Status</DialogTitle>
          </DialogHeader>
          {editLink && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Link <span className="font-mono text-foreground">{editLink.linkId}</span> for {editLink.companyName}</p>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editLStatus} onValueChange={(v) => setEditLStatus(v as typeof editLStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLink(null)}>Cancel</Button>
            <Button onClick={handleUpdateLinkStatus}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteLinkTarget)}
        onOpenChange={(v) => !v && setDeleteLinkTarget(null)}
        title="Delete Payment Link"
        description={`Are you sure you want to delete this payment link? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDeleteLink}
      />

      {/* ==================== Change Plan ==================== */}
      <Dialog open={Boolean(planDialogCompany)} onOpenChange={(v) => !v && setPlanDialogCompany(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Change Plan</DialogTitle>
          </DialogHeader>
          {planDialogCompany && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Changing the plan for <span className="font-medium text-foreground">{planDialogCompany.name}</span>.
              </p>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={planSelection} onValueChange={setPlanSelection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — ₹{p.priceMonthly}/mo ({p.invoiceQuota} invoices, {p.userQuota} users)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={planStatusSelection} onValueChange={(v) => setPlanStatusSelection(v as typeof planStatusSelection)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Changing plans updates this company's invoice/user quotas immediately. Actually charging
                the customer for the new plan happens outside this console.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogCompany(null)}>Cancel</Button>
            <Button onClick={handleChangePlan} disabled={planSaving}>{planSaving ? 'Saving…' : 'Save Plan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Re-authenticate for sensitive actions ==================== */}
      <Dialog
        open={reauthOpen}
        onOpenChange={(v) => {
          if (!v) {
            setReauthOpen(false);
            setReauthPassword('');
            setReauthError('');
            pendingActionRef.current = null;
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Confirm it's you
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter your password to {reauthLabel}. This extra check protects against actions
              taken from an unattended, still-logged-in session.
            </p>
            <div className="space-y-2">
              <Label>Your Password</Label>
              <Input
                type="password"
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReauthConfirm()}
                placeholder="••••••••"
                autoFocus
              />
              {reauthError ? <p className="text-sm text-destructive">{reauthError}</p> : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReauthOpen(false);
                setReauthPassword('');
                pendingActionRef.current = null;
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleReauthConfirm} disabled={reauthBusy}>
              {reauthBusy ? 'Verifying…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
