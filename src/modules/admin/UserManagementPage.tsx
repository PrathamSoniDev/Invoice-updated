import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, type Column } from '@/components/common/DataTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserStatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { userService } from '@/services';
import type { ModuleKey, User, UserRole, UserStatus } from '@/types';
import { getInitials, formatDate } from '@/utils';
import { ShieldCheck, Plus, Edit, Ban, Trash2, Building2, Eye, FileCode, Plug, CreditCard, MessageSquare, FileText, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useTemplateStore } from '@/store/templateStore';
import { useIntegrationStore } from '@/store/integrationStore';

const ROLE_PERMISSIONS: Record<UserRole, ModuleKey[]> = {
  admin: ['dashboard', 'customers', 'invoices', 'payment-links', 'whatsapp', 'email', 'reports', 'settings', 'admin'],
  business: ['dashboard', 'customers', 'invoices', 'payment-links', 'reports', 'settings'],
  manager: ['dashboard', 'customers', 'invoices', 'payment-links', 'whatsapp', 'email', 'reports', 'settings'],
  staff: ['dashboard', 'customers', 'invoices', 'payment-links', 'whatsapp', 'email'],
  viewer: ['dashboard', 'reports'],
};

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [suspendUser, setSuspendUser] = useState<User | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const { userTemplates, templates } = useTemplateStore();
  const { integrations } = useIntegrationStore();

  // Form state
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [status, setStatus] = useState<UserStatus>('invited');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');

  useEffect(() => {
    userService.list().then((response) => {
      setUsers(response.data);
      setLoading(false);
    });
  }, []);

  const resetForm = () => {
    setName(''); setCompanyName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setRole('staff'); setStatus('invited');
  };

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditStatus(user.status);
  };

  const handleCreate = async () => {
    if (!name || !email || !password) {
      toast.error('Name, email, and password are required');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      const newUser = await userService.create({
        name, email, role, status, companyName,
        permissions: ROLE_PERMISSIONS[role],
      });
      setUsers([...users, newUser]);
      setCreateOpen(false);
      resetForm();
      toast.success('User created successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      const updatedUser = await userService.update(editUser.id, {
        name: editName.trim(),
        role: editRole,
        status: editStatus,
        phone: editPhone.trim(),
      });
      setUsers(users.map((u) => u.id === updatedUser.id ? updatedUser : u));
      setEditUser(null);
      toast.success('User updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const handleSuspend = async () => {
    if (!suspendUser) return;
    try {
      await userService.suspend(suspendUser.id);
      setUsers(users.map((u) => u.id === suspendUser.id ? { ...u, status: 'suspended' as UserStatus } : u));
      setSuspendUser(null);
      toast.success('User suspended');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to suspend user');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await userService.delete(deleteUser.id);
      setUsers(users.filter((u) => u.id !== deleteUser.id));
      setDeleteUser(null);
      toast.success('User deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      cell: (row) => <span className="text-sm">{row.companyName || '—'}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      cell: (row) => <Badge variant="outline" className="capitalize">{row.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <UserStatusBadge status={row.status} />,
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.lastActive ? formatDate(row.lastActive, 'short') : 'Never'}</span>,
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View company settings" onClick={(e) => { e.stopPropagation(); setViewUser(row); }}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditDialog(row); }}>
            <Edit className="h-4 w-4" />
          </Button>
          {row.status !== 'suspended' && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-warning" onClick={(e) => { e.stopPropagation(); setSuspendUser(row); }}>
              <Ban className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteUser(row); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Create and manage user accounts, roles, and company settings"
        icon={ShieldCheck}
        actions={
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        }
      />

      <Card className="shadow-soft">
        <DataTable columns={columns} data={users} isLoading={loading} onRowClick={(row) => setViewUser(row)} />
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password *</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
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
                <Select value={status} onValueChange={(v) => setStatus(v as UserStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="invited">Invited</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={Boolean(editUser)} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={editUser.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
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
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as UserStatus)}>
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
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Company Settings Drawer */}
      <Sheet open={Boolean(viewUser)} onOpenChange={(v) => !v && setViewUser(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader className="mb-6">
            <SheetTitle>Company Settings — {viewUser?.name}</SheetTitle>
            <SheetDescription>Read-only view of user's company configuration</SheetDescription>
          </SheetHeader>
          {viewUser && (
            <div className="space-y-6">
              {/* Company Info */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Company Name</span><span className="font-medium">{viewUser.companyName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Legal Name</span><span className="font-medium">{viewUser.companyInfo?.legalName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">GST Number</span><span className="font-mono text-xs">{viewUser.companyInfo?.gstNumber || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">PAN Number</span><span className="font-mono text-xs">{viewUser.companyInfo?.panNumber || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{viewUser.email}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-medium">{viewUser.companyInfo?.phone || '—'}</span></div>
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground mb-1">Address</p>
                    <p className="font-medium">{viewUser.companyInfo?.address?.line1 || '—'}, {viewUser.companyInfo?.address?.city || '—'}, {viewUser.companyInfo?.address?.state || '—'} {viewUser.companyInfo?.address?.pincode || '—'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Company Logo */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3"><CardTitle className="text-base">Company Logo</CardTitle></CardHeader>
                <CardContent>
                  {viewUser.companyInfo?.logo ? (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border overflow-hidden">
                      <img src={viewUser.companyInfo.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground text-xs">No logo</div>
                  )}
                </CardContent>
              </Card>

              {/* Bank Details */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3"><CardTitle className="text-base">Bank Details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Bank Name</span><span className="font-medium">{viewUser.bankInfo?.bankName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Name</span><span className="font-medium">{viewUser.bankInfo?.accountName || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Account Number</span><span className="font-mono text-xs">{viewUser.bankInfo?.accountNumber || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">IFSC</span><span className="font-mono text-xs">{viewUser.bankInfo?.ifsc || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">UPI ID</span><span className="font-mono text-xs">{viewUser.bankInfo?.upiId || '—'}</span></div>
                </CardContent>
              </Card>

              {/* Assigned Invoice Template */}
              {(() => {
                const ut = userTemplates.find((u) => u.userEmail === viewUser.email);
                const tpl = ut ? templates.find((t) => t.id === ut.templateId) : null;
                return (
                  <Card className="shadow-soft">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2"><FileCode className="h-4 w-4 text-primary" /> Assigned Invoice Template</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {tpl ? (
                        <>
                          <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span className="font-medium">{tpl.name}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">v{tpl.version}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium uppercase">{tpl.type}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-medium capitalize">{tpl.status}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Assigned</span><span className="font-medium">{ut ? new Date(ut.assignedAt).toLocaleDateString() : '—'}</span></div>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">No template assigned.</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Connected ERP Integrations */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Plug className="h-4 w-4 text-primary" /> Connected ERP</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {integrations.filter((i) => i.status === 'connected').length > 0 ? (
                    integrations.filter((i) => i.status === 'connected').map((i) => (
                      <div key={i.id} className="flex items-center justify-between">
                        <span className="font-medium">{i.name}</span>
                        <span className="text-xs text-success">Connected</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No ERP integrations connected.</p>
                  )}
                </CardContent>
              </Card>

              {/* Payment Gateway Status */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payment Gateways</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Razorpay</span><span className="text-xs text-success">Connected</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Paytm</span><span className="text-xs text-muted-foreground">Disconnected</span></div>
                </CardContent>
              </Card>

              {/* Communication Status */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Communication Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">WhatsApp</span><span className="text-xs text-success">Enabled</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Email</span><span className="text-xs text-success">Enabled</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">SMS</span><span className="text-xs text-muted-foreground">Disabled</span></div>
                </CardContent>
              </Card>

              {/* Recent Invoices */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Recent Invoices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground text-sm">No invoices available</p>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground text-sm">No activity available</p>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Suspend Confirm */}
      <ConfirmDialog
        open={Boolean(suspendUser)}
        onOpenChange={(v) => !v && setSuspendUser(null)}
        title="Suspend User"
        description={`Are you sure you want to suspend ${suspendUser?.name}? They will lose access immediately.`}
        confirmLabel="Suspend"
        variant="destructive"
        icon={Ban}
        onConfirm={handleSuspend}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={Boolean(deleteUser)}
        onOpenChange={(v) => !v && setDeleteUser(null)}
        title="Delete User"
        description={`Are you sure you want to delete ${deleteUser?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        icon={Trash2}
        onConfirm={handleDelete}
      />
    </div>
  );
}
