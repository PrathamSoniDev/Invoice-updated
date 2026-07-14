import type {
  Customer,
  Invoice,
  PaymentLink,
  Payment,
  CommunicationLog,
  MessageTemplate,
  ActivityLog,
  AuditLog,
  User,
  ModuleConfig,
  DashboardMetrics,
  RevenueTrendPoint,
  InvoiceTrendPoint,
  CustomerGrowthPoint,
  PaymentDistributionPoint,
  ApiUsagePoint,
  FeatureUsagePoint,
  StorageUsagePoint,
  CompanyInfo,
  BankInfo,
  InvoiceSettings,
  CommunicationSettings,
  GatewaySettings,
  LineItem,
  InvoiceTemplate,
  TemplateVersion,
  UserInvoiceTemplate,
  // ExternalIntegration,
} from '@/types';

const indianNames = [
  'Aarav Sharma', 'Vivaan Patel', 'Aditya Reddy', 'Vihaan Nair', 'Arjun Iyer',
  'Sai Krishnan', 'Reyansh Gupta', 'Ayaan Mehta', 'Krishna Joshi', 'Ishaan Verma',
  'Ananya Bhat', 'Diya Kapoor', 'Saanvi Rao', 'Aadhya Singh', 'Kiara Malhotra',
  'Myra Chopra', 'Anika Desai', 'Navya Pillai', 'Pari Agarwal', 'Riya Bansal',
  'Rohan Khanna', 'Karan Malhotra', 'Dhruv Saxena', 'Aryan Bose', 'Kabir Menon',
  'Tara Sengupta', 'Zara Qureshi', 'Ira Banerjee', 'Mira Chawla', 'Nila Dutt',
];

const businesses = [
  'TechFlow Solutions', 'CloudPeak Systems', 'DataMint Labs', 'Nexus Digital', 'Quantum Forge',
  'PixelCraft Studio', 'CodeWave Technologies', 'InnovateHub', 'BrightPath Consulting', 'Skyline Ventures',
  'GreenLeaf Organics', 'UrbanBloom Retail', 'PrimeEdge Logistics', 'Vertex Manufacturing', 'Apex Traders',
  'Stellar Foods', 'Horizon Textiles', 'Pinnacle Pharma', 'CrestLine Auto', 'Orbit Electronics',
  'Flux Dynamics', 'Zenith Interiors', 'Cascade Beverages', 'MapleWood Furniture', 'CoralBay Seafoods',
  'DriftNet Software', 'EmberForge Tools', 'FrostLine Cold Storage', 'GlowUp Cosmetics', 'HaloByte IT',
];

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Surat'];
const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Gujarat', 'West Bengal', 'Rajasthan'];

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function randomFutureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString();
}

function randomAmount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randomGST(): string {
  const stateCodes = ['27', '07', '29', '33', '36', '24', '19', '08'];
  const code = stateCodes[Math.floor(Math.random() * stateCodes.length)];
  const num = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString().slice(0, 10);
  const z = ['Z', 'A', 'B', 'C', 'D'][Math.floor(Math.random() * 5)];
  return `${code}${num}${z}1Z${Math.floor(Math.random() * 9)}`;
}

function randomPhone(): string {
  return `+91 ${Math.floor(7000000000 + Math.random() * 999999999)}`;
}

function makeAddress(): {
  line1: string; line2?: string; city: string; state: string; pincode: string; country: string;
} {
  const city = cities[Math.floor(Math.random() * cities.length)];
  const state = states[Math.floor(Math.random() * states.length)];
  return {
    line1: `${Math.floor(1 + Math.random() * 200)}, ${businesses[Math.floor(Math.random() * businesses.length)]} Street`,
    line2: `${['Business Park', 'Tech Hub', 'Commercial Zone', 'Industrial Area'][Math.floor(Math.random() * 4)]}`,
    city,
    state,
    pincode: `${Math.floor(400000 + Math.random() * 599999)}`,
    country: 'India',
  };
}

// ============ CUSTOMERS ============
export const mockCustomers: Customer[] = Array.from({ length: 50 }, (_, i) => {
  const name = indianNames[i % indianNames.length];
  const businessName = businesses[i % businesses.length];
  const totalInvoices = Math.floor(1 + Math.random() * 30);
  const totalRevenue = randomAmount(10000, 500000);
  const outstandingAmount = Math.random() > 0.5 ? randomAmount(0, 50000) : 0;
  return {
    id: `cust_${String(i + 1).padStart(4, '0')}`,
    name,
    businessName,
    gstNumber: randomGST(),
    email: `${name.toLowerCase().replace(/\s/g, '.')}@${businessName.toLowerCase().replace(/\s/g, '')}.com`,
    mobile: randomPhone(),
    whatsapp: randomPhone(),
    billingAddress: makeAddress(),
    shippingAddress: makeAddress(),
    notes: i % 3 === 0 ? 'Preferred customer with net-30 payment terms.' : undefined,
    status: i % 7 === 0 ? 'inactive' : 'active',
    totalInvoices,
    totalRevenue,
    outstandingAmount,
    createdAt: randomDate(Math.floor(1 + Math.random() * 365)),
    updatedAt: randomDate(Math.floor(Math.random() * 30)),
  };
});

// ============ LINE ITEMS ============
const itemDescriptions = [
  'Web Development Services', 'UI/UX Design', 'Cloud Hosting (Monthly)', 'API Integration',
  'Mobile App Development', 'Database Optimization', 'Security Audit', 'DevOps Consulting',
  'Technical Documentation', 'Code Review & Refactoring', 'Product Strategy Session', 'Marketing Campaign Setup',
  'Logo & Brand Design', 'Content Writing', 'SEO Optimization', 'Social Media Management',
];

function makeLineItems(): LineItem[] {
  const count = Math.floor(1 + Math.random() * 4);
  return Array.from({ length: count }, () => {
    const quantity = Math.floor(1 + Math.random() * 10);
    const rate = randomAmount(500, 25000);
    const discount = Math.random() > 0.7 ? randomAmount(0, 500) : 0;
    const taxRate = 18;
    const taxableAmount = quantity * rate - discount;
    const amount = taxableAmount + (taxableAmount * taxRate) / 100;
    return {
      id: `item_${Math.random().toString(36).slice(2, 10)}`,
      description: itemDescriptions[Math.floor(Math.random() * itemDescriptions.length)],
      quantity,
      rate,
      discount,
      taxRate,
      amount: Math.round(amount * 100) / 100,
    };
  });
}

// ============ INVOICES ============
const invoiceStatuses: Invoice['status'][] = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];

export const mockInvoices: Invoice[] = Array.from({ length: 60 }, (_, i) => {
  const customer = mockCustomers[i % mockCustomers.length];
  const lineItems = makeLineItems();
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate - item.discount, 0);
  const taxAmount = lineItems.reduce((sum, item) => {
    const taxable = item.quantity * item.rate - item.discount;
    return sum + (taxable * item.taxRate) / 100;
  }, 0);
  const discountAmount = lineItems.reduce((sum, item) => sum + item.discount, 0);
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const status = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
  const amountPaid = status === 'paid' ? total : status === 'viewed' || status === 'sent' ? 0 : 0;
  const issueDate = randomDate(Math.floor(1 + Math.random() * 180));
  const dueDate = new Date(new Date(issueDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `inv_${String(i + 1).padStart(4, '0')}`,
    number: `INV-2025-${String(1000 + i).padStart(4, '0')}`,
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    status,
    issueDate,
    dueDate,
    lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total,
    amountPaid,
    balance: Math.round((total - amountPaid) * 100) / 100,
    notes: 'Thank you for your business.',
    terms: 'Payment due within 30 days. Late payments subject to 1.5% monthly interest.',
    createdAt: issueDate,
    updatedAt: randomDate(Math.floor(Math.random() * 30)),
  };
});

// ============ PAYMENT LINKS ============
const linkStatuses: PaymentLink['status'][] = ['pending', 'paid', 'failed', 'expired'];

export const mockPaymentLinks: PaymentLink[] = Array.from({ length: 25 }, (_, i) => {
  const customer = mockCustomers[i % mockCustomers.length];
  const status = linkStatuses[Math.floor(Math.random() * linkStatuses.length)];
  const amount = randomAmount(1000, 100000);
  const gateway = i % 2 === 0 ? 'razorpay' : 'paytm';
  return {
    id: `plink_${String(i + 1).padStart(4, '0')}`,
    linkId: `plink_${Math.random().toString(36).slice(2, 12)}`,
    customerId: customer.id,
    customerName: customer.name,
    amount,
    currency: 'INR',
    gateway,
    status,
    url: `https://pay.invoicegen.com/l/${Math.random().toString(36).slice(2, 12)}`,
    expiryDate: randomFutureDate(Math.floor(1 + Math.random() * 30)),
    createdAt: randomDate(Math.floor(1 + Math.random() * 60)),
    paidAt: status === 'paid' ? randomDate(Math.floor(Math.random() * 30)) : undefined,
    description: `Payment for services rendered to ${customer.businessName}`,
  };
});

// ============ PAYMENTS ============
const paymentMethods: Payment['method'][] = ['card', 'upi', 'netbanking', 'wallet', 'cash', 'cheque'];
const paymentStatuses: Payment['status'][] = ['pending', 'paid', 'failed', 'refunded'];

export const mockPayments: Payment[] = Array.from({ length: 40 }, (_, i) => {
  const invoice = mockInvoices[i % mockInvoices.length];
  const customer = mockCustomers.find((c) => c.id === invoice.customerId)!;
  const status = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
  return {
    id: `pay_${String(i + 1).padStart(4, '0')}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    customerId: customer.id,
    customerName: customer.name,
    amount: invoice.total,
    method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
    status,
    gateway: i % 2 === 0 ? 'razorpay' : 'paytm',
    transactionId: `txn_${Math.random().toString(36).slice(2, 16)}`,
    date: randomDate(Math.floor(Math.random() * 60)),
  };
});

// ============ COMMUNICATION LOGS ============
const commChannels: CommunicationLog['channel'][] = ['whatsapp', 'email', 'sms'];
const commStatuses: CommunicationLog['status'][] = ['sent', 'delivered', 'read', 'failed'];

export const mockCommunicationLogs: CommunicationLog[] = Array.from({ length: 50 }, (_, i) => {
  const customer = mockCustomers[i % mockCustomers.length];
  const channel = commChannels[Math.floor(Math.random() * commChannels.length)];
  const status = commStatuses[Math.floor(Math.random() * commStatuses.length)];
  const sentAt = randomDate(Math.floor(Math.random() * 30));
  return {
    id: `comm_${String(i + 1).padStart(4, '0')}`,
    channel,
    recipient: channel === 'email' ? customer.email : customer.mobile,
    recipientName: customer.name,
    subject: channel === 'email' ? `Invoice from InvoiceGen - ${customer.businessName}` : 'Payment Reminder',
    body: `Hello ${customer.name}, this is a reminder regarding your pending payment. Please process it at your earliest convenience.`,
    status,
    templateId: i % 3 === 0 ? `tpl_${String((i % 5) + 1).padStart(4, '0')}` : undefined,
    templateName: i % 3 === 0 ? ['Payment Reminder', 'Invoice Sent', 'Welcome Message'][i % 3] : undefined,
    sentAt,
    deliveredAt: status !== 'failed' ? sentAt : undefined,
    readAt: status === 'read' ? sentAt : undefined,
    relatedTo: { type: 'invoice', id: mockInvoices[i % mockInvoices.length].id },
  };
});

// ============ MESSAGE TEMPLATES ============
export const mockTemplates: MessageTemplate[] = [
  {
    id: 'tpl_0001',
    name: 'Payment Reminder',
    channel: 'whatsapp',
    subject: 'Payment Reminder',
    body: 'Hello {{customer_name}}, this is a friendly reminder that your invoice {{invoice_number}} for {{amount}} is due on {{due_date}}. Please process the payment at your earliest convenience.',
    variables: ['customer_name', 'invoice_number', 'amount', 'due_date'],
    createdAt: randomDate(90),
    isDefault: false,
    isActive: false,
    updatedAt: ''
  },
  {
    id: 'tpl_0002',
    name: 'Invoice Sent',
    channel: 'email',
    subject: 'Invoice {{invoice_number}} from InvoiceGen',
    body: 'Dear {{customer_name}}, please find your invoice {{invoice_number}} attached. The total amount due is {{amount}} with a due date of {{due_date}}. Thank you for your business.',
    variables: ['customer_name', 'invoice_number', 'amount', 'due_date'],
    createdAt: randomDate(80),
    isDefault: false,
    isActive: false,
    updatedAt: ''
  },
  {
    id: 'tpl_0003',
    name: 'Welcome Message',
    channel: 'whatsapp',
    subject: 'Welcome to InvoiceGen',
    body: 'Hi {{customer_name}}! Welcome to InvoiceGen. We are excited to have you on board. If you have any questions, feel free to reach out.',
    variables: ['customer_name'],
    createdAt: randomDate(70),
    isDefault: false,
    isActive: false,
    updatedAt: ''
  },
  {
    id: 'tpl_0004',
    name: 'Payment Confirmation',
    channel: 'email',
    subject: 'Payment Received - {{invoice_number}}',
    body: 'Dear {{customer_name}}, we have received your payment of {{amount}} for invoice {{invoice_number}}. Thank you for your prompt payment.',
    variables: ['customer_name', 'invoice_number', 'amount'],
    createdAt: randomDate(60),
    isDefault: false,
    isActive: false,
    updatedAt: ''
  },
  {
    id: 'tpl_0005',
    name: 'Overdue Notice',
    channel: 'sms',
    subject: 'Overdue Payment',
    body: 'Hi {{customer_name}}, your invoice {{invoice_number}} for {{amount}} is overdue. Please make the payment immediately to avoid late fees.',
    variables: ['customer_name', 'invoice_number', 'amount'],
    createdAt: randomDate(50),
    isDefault: false,
    isActive: false,
    updatedAt: ''
  },
];

// ============ ACTIVITY LOGS ============
const activityActions = [
  'created invoice', 'updated customer', 'sent payment link', 'received payment',
  'updated settings', 'deleted customer', 'viewed report', 'exported data',
  'logged in', 'created customer', 'sent invoice', 'cancelled invoice',
];

export const mockActivityLogs: ActivityLog[] = Array.from({ length: 30 }, (_, i) => {
  const user = indianNames[i % indianNames.length];
  return {
    id: `act_${String(i + 1).padStart(4, '0')}`,
    userId: `user_${String((i % 5) + 1).padStart(4, '0')}`,
    userName: user,
    action: activityActions[i % activityActions.length],
    entity: ['invoice', 'customer', 'payment', 'settings'][i % 4],
    entityId: `${['inv', 'cust', 'pay', 'set'][i % 4]}_${String(i + 1).padStart(4, '0')}`,
    description: `${user} ${activityActions[i % activityActions.length]}`,
    timestamp: randomDate(Math.floor(Math.random() * 7)),
  };
});

// ============ AUDIT LOGS ============
const auditActions: AuditLog['action'][] = ['create', 'update', 'delete', 'login', 'logout', 'export', 'settings'];

export const mockAuditLogs: AuditLog[] = Array.from({ length: 40 }, (_, i) => {
  const user = mockUsers()[i % mockUsers().length];
  const action = auditActions[i % auditActions.length];
  const modules = ['Invoices', 'Customers', 'Payments', 'Settings', 'Auth', 'Reports'];
  return {
    id: `audit_${String(i + 1).padStart(4, '0')}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    module: modules[i % modules.length],
    entityId: `ent_${String(i + 1).padStart(4, '0')}`,
    entityName: `${modules[i % modules.length]} #${1000 + i}`,
    description: `${user.name} performed ${action} on ${modules[i % modules.length]} #${1000 + i}`,
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    timestamp: randomDate(Math.floor(Math.random() * 30)),
    changes: action === 'update' ? {
      status: { from: 'draft', to: 'sent' },
      amount: { from: 5000, to: 5500 },
    } : undefined,
  };
});

// ============ USERS ============
export function mockUsers(): User[] {
  const moduleKeys: import('@/types').ModuleKey[] = [
    'dashboard', 'customers', 'invoices', 'payment-links', 'whatsapp', 'email', 'reports', 'settings', 'admin',
  ];
  return [
    {
    id: 'user_0000',
    name: 'Master Admin',
    email: 'master@company.com',
    role: 'super_admin',
    status: 'active',
    permissions: moduleKeys,
    createdAt: randomDate(365)
    },
    {
      id: 'user_0001',
      name: 'Aarav Sharma',
      email: 'admin@invoicegen.com',
      role: 'admin',
      status: 'active',
      phone: '+91 9876543210',
      lastActive: randomDate(0),
      createdAt: randomDate(365),
      permissions: moduleKeys,
    },
    {
      id: 'user_0002',
      name: 'Diya Kapoor',
      email: 'diya@invoicegen.com',
      role: 'manager',
      status: 'active',
      phone: '+91 9876543211',
      lastActive: randomDate(1),
      createdAt: randomDate(300),
      permissions: ['dashboard', 'customers', 'invoices', 'payment-links', 'reports', 'settings'],
    },
    {
      id: 'user_0003',
      name: 'Vihaan Nair',
      email: 'vihaan@invoicegen.com',
      role: 'staff',
      status: 'active',
      phone: '+91 9876543212',
      lastActive: randomDate(2),
      createdAt: randomDate(200),
      permissions: ['dashboard', 'customers', 'invoices', 'payment-links'],
    },
    {
      id: 'user_0004',
      name: 'Saanvi Rao',
      email: 'saanvi@invoicegen.com',
      role: 'staff',
      status: 'suspended',
      phone: '+91 9876543213',
      lastActive: randomDate(15),
      createdAt: randomDate(150),
      permissions: ['dashboard', 'customers'],
    },
    {
      id: 'user_0005',
      name: 'Arjun Iyer',
      email: 'arjun@invoicegen.com',
      role: 'viewer',
      status: 'invited',
      phone: '+91 9876543214',
      createdAt: randomDate(10),
      permissions: ['dashboard', 'reports'],
    },
  ];
}

// ============ MODULE CONFIG ============
export const mockModuleConfigs: ModuleConfig[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Analytics overview and metrics', enabled: true, icon: 'LayoutDashboard', roles: ['super_admin', 'admin', 'manager', 'staff', 'viewer'] },
  { key: 'customers', label: 'Customers', description: 'Manage customer profiles and data', enabled: true, icon: 'Users', roles: ['super_admin','admin', 'manager', 'staff'] },
  { key: 'invoices', label: 'Invoices', description: 'Create and manage invoices', enabled: true, icon: 'FileText', roles: ['super_admin', 'admin', 'manager', 'staff'] },
  { key: 'payment-links', label: 'Payment Links', description: 'Generate and track payment links', enabled: true, icon: 'CreditCard', roles: ['super_admin', 'admin', 'manager', 'staff'] },
  { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp communication center', enabled: true, icon: 'MessageCircle', roles: ['super_admin', 'admin', 'manager', 'staff'] },
  { key: 'email', label: 'Email', description: 'Email communication center', enabled: true, icon: 'Mail', roles: ['super_admin', 'admin', 'manager', 'staff'] },
  { key: 'reports', label: 'Reports', description: 'Business reports and analytics', enabled: true, icon: 'BarChart3', roles: ['super_admin', 'admin', 'manager', 'viewer'] },
  { key: 'settings', label: 'Settings', description: 'Company and system settings', enabled: true, icon: 'Settings', roles: ['super_admin', 'admin', 'manager'] },
  { key: 'admin', label: 'Admin', description: 'User and module administration', enabled: true, icon: 'ShieldCheck', roles: ['super_admin', 'admin'] },
];

// ============ DASHBOARD METRICS ============
export const mockDashboardMetrics: DashboardMetrics = {
  totalInvoices: mockInvoices.length,
  totalCustomers: mockCustomers.length,
  totalRevenue: mockInvoices.reduce((sum, inv) => sum + inv.total, 0),
  paidRevenue: mockInvoices.filter((i) => i.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
  pendingRevenue: mockInvoices.filter((i) => i.status === 'sent' || i.status === 'viewed').reduce((sum, inv) => sum + inv.balance, 0),
  totalPaymentLinks: mockPaymentLinks.length,
  successfulPayments: mockPayments.filter((p) => p.status === 'paid').length,
  failedPayments: mockPayments.filter((p) => p.status === 'failed').length,
};

// ============ CHART DATA ============
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const mockRevenueTrend: RevenueTrendPoint[] = months.map((month) => {
  const revenue = randomAmount(100000, 500000);
  const paid = revenue * (0.6 + Math.random() * 0.3);
  return {
    month,
    revenue: Math.round(revenue),
    paid: Math.round(paid),
    pending: Math.round(revenue - paid),
  };
});

export const mockInvoiceTrend: InvoiceTrendPoint[] = months.map((month) => ({
  month,
  created: Math.floor(20 + Math.random() * 40),
  paid: Math.floor(15 + Math.random() * 30),
  overdue: Math.floor(1 + Math.random() * 8),
}));

export const mockCustomerGrowth: CustomerGrowthPoint[] = months.map((month, i) => ({
  month,
  total: 20 + i * 5 + Math.floor(Math.random() * 10),
  new: Math.floor(3 + Math.random() * 12),
}));

export const mockPaymentDistribution: PaymentDistributionPoint[] = [
  { name: 'Paid', value: 65, color: 'hsl(var(--success))' },
  { name: 'Pending', value: 20, color: 'hsl(var(--warning))' },
  { name: 'Failed', value: 10, color: 'hsl(var(--destructive))' },
  { name: 'Refunded', value: 5, color: 'hsl(var(--muted-foreground))' },
];

export const mockApiUsage: ApiUsagePoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  requests: Math.floor(1000 + Math.random() * 5000),
  errors: Math.floor(Math.random() * 100),
}));

export const mockFeatureUsage: FeatureUsagePoint[] = [
  { feature: 'Invoices', usage: 85 },
  { feature: 'Customers', usage: 72 },
  { feature: 'Payment Links', usage: 64 },
  { feature: 'Reports', usage: 58 },
  { feature: 'WhatsApp', usage: 45 },
  { feature: 'Email', usage: 38 },
];

export const mockStorageUsage: StorageUsagePoint[] = [
  { category: 'Invoices', used: 2.4, total: 10 },
  { category: 'Documents', used: 1.8, total: 5 },
  { category: 'Templates', used: 0.3, total: 2 },
  { category: 'Media', used: 0.8, total: 3 },
];

// ============ SETTINGS ============
export const mockCompanyInfo: CompanyInfo = {
  name: 'InvoiceGen',
  legalName: 'InvoiceGen Technologies Pvt. Ltd.',
  gstNumber: '27AABCI1234L1Z5',
  panNumber: 'AABCI1234L',
  email: 'contact@invoicegen.com',
  phone: '+91 9876543200',
  website: 'www.invoicegen.com',
  address: {
    line1: '42, Tech Park Tower',
    line2: 'Hinjewadi Phase 2',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411057',
    country: 'India',
  },
  logo: '',
  signature: '',
  primaryColor: '#876CD4',
  footerText: 'InvoiceGen — Premium Invoicing & Payments',
  showLogo: true,
};

export const mockBankInfo: BankInfo = {
  bankName: 'HDFC Bank',
  accountName: 'InvoiceGen Technologies Pvt. Ltd.',
  accountNumber: '501000123456789',
  ifsc: 'HDFC0001234',
  branch: 'Hinjewadi, Pune',
  upiId: 'invoicegen@hdfc',
};

export const mockInvoiceSettings: InvoiceSettings = {
  prefix: 'INV',
  nextNumber: 1061,
  defaultTaxRate: 18,
  defaultCurrency: 'INR',
  defaultTerms: 'Payment due within 30 days. Late payments subject to 1.5% monthly interest.',
  defaultNotes: 'Thank you for your business.',
  autoNumbering: true,
  paymentTerms: 30,
};

export const mockCommunicationSettings: CommunicationSettings = {
  whatsappEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  email: 'noreply@invoicegen.com',
  whatsappNumber: '+91 9876543200',
};

export const mockGatewaySettings: GatewaySettings = {
  razorpay: {
    status: 'connected',
  },
  paytm: {
    status: 'disconnected',
  },
};

// ============ INVOICE TEMPLATES ============
export const mockInvoiceTemplates: InvoiceTemplate[] = [
  {
    id: 'tpl_001',
    name: 'Modern Minimal',
    type: 'tsx',
    version: '1.2.0',
    status: 'active',
    isDefault: true,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-01-10T10:00:00.000Z',
    createdAt: '2025-01-10T10:00:00.000Z',
    updatedAt: '2025-03-15T14:30:00.000Z',
  },
  {
    id: 'tpl_002',
    name: 'GST Retail',
    type: 'html',
    version: '2.0.1',
    status: 'active',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-01-15T09:30:00.000Z',
    createdAt: '2025-01-15T09:30:00.000Z',
    updatedAt: '2025-03-01T11:00:00.000Z',
  },
  {
    id: 'tpl_003',
    name: 'Export Invoice',
    type: 'json',
    version: '1.0.0',
    status: 'active',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-02-01T08:00:00.000Z',
    createdAt: '2025-02-01T08:00:00.000Z',
    updatedAt: '2025-02-01T08:00:00.000Z',
  },
  {
    id: 'tpl_004',
    name: 'Manufacturing',
    type: 'tsx',
    version: '1.1.0',
    status: 'active',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-02-10T14:00:00.000Z',
    createdAt: '2025-02-10T14:00:00.000Z',
    updatedAt: '2025-03-10T09:00:00.000Z',
  },
  {
    id: 'tpl_005',
    name: 'Professional Blue',
    type: 'html',
    version: '3.0.0',
    status: 'active',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-02-20T11:30:00.000Z',
    createdAt: '2025-02-20T11:30:00.000Z',
    updatedAt: '2025-03-05T16:00:00.000Z',
  },
  {
    id: 'tpl_006',
    name: 'Classic Ledger',
    type: 'tsx',
    version: '2.1.0',
    status: 'disabled',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2024-12-01T10:00:00.000Z',
    createdAt: '2024-12-01T10:00:00.000Z',
    updatedAt: '2025-01-05T09:00:00.000Z',
  },
  {
    id: 'tpl_007',
    name: 'Service Invoice',
    type: 'json',
    version: '1.0.2',
    status: 'active',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-03-01T08:00:00.000Z',
    createdAt: '2025-03-01T08:00:00.000Z',
    updatedAt: '2025-03-01T08:00:00.000Z',
  },
  {
    id: 'tpl_008',
    name: 'E-commerce Order',
    type: 'html',
    version: '1.3.0',
    status: 'draft',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-03-10T12:00:00.000Z',
    createdAt: '2025-03-10T12:00:00.000Z',
    updatedAt: '2025-03-10T12:00:00.000Z',
  },
  {
    id: 'tpl_009',
    name: 'Freelancer',
    type: 'tsx',
    version: '1.0.0',
    status: 'active',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-03-12T09:00:00.000Z',
    createdAt: '2025-03-12T09:00:00.000Z',
    updatedAt: '2025-03-12T09:00:00.000Z',
  },
  {
    id: 'tpl_010',
    name: 'Consulting Firm',
    type: 'json',
    version: '2.0.0',
    status: 'active',
    isDefault: false,
    uploadedBy: 'Aarav Sharma',
    uploadedAt: '2025-03-14T10:30:00.000Z',
    createdAt: '2025-03-14T10:30:00.000Z',
    updatedAt: '2025-03-14T10:30:00.000Z',
  },
];

export const mockTemplateVersions: TemplateVersion[] = [
  { id: 'tv_001', templateId: 'tpl_001', version: '1.0.0', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-01-10T10:00:00.000Z', createdAt: '2025-01-10T10:00:00.000Z' },
  { id: 'tv_002', templateId: 'tpl_001', version: '1.1.0', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-02-10T14:00:00.000Z', createdAt: '2025-02-10T14:00:00.000Z' },
  { id: 'tv_003', templateId: 'tpl_001', version: '1.2.0', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-03-15T14:30:00.000Z', createdAt: '2025-03-15T14:30:00.000Z' },
  { id: 'tv_004', templateId: 'tpl_002', version: '1.0.0', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-01-15T09:30:00.000Z', createdAt: '2025-01-15T09:30:00.000Z' },
  { id: 'tv_005', templateId: 'tpl_002', version: '2.0.0', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-02-20T11:30:00.000Z', createdAt: '2025-02-20T11:30:00.000Z' },
  { id: 'tv_006', templateId: 'tpl_002', version: '2.0.1', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-03-01T11:00:00.000Z', createdAt: '2025-03-01T11:00:00.000Z' },
  { id: 'tv_007', templateId: 'tpl_004', version: '1.0.0', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-02-10T14:00:00.000Z', createdAt: '2025-02-10T14:00:00.000Z' },
  { id: 'tv_008', templateId: 'tpl_004', version: '1.1.0', uploadedBy: 'Aarav Sharma', uploadedAt: '2025-03-10T09:00:00.000Z', createdAt: '2025-03-10T09:00:00.000Z' },
];

export const mockUserInvoiceTemplates: UserInvoiceTemplate[] = Array.from({ length: 20 }, (_, i) => {
  const userNames = [
    'Aarav Sharma', 'Diya Kapoor', 'Rohan Mehta', 'Priya Nair', 'Vikram Joshi',
    'Ananya Reddy', 'Karthik Iyer', 'Neha Gupta', 'Siddharth Rao', 'Meera Patel',
    'Arjun Desai', 'Kavya Menon', 'Nikhil Bhat', 'Sanya Khanna', 'Dev Malhotra',
    'Isha Agarwal', 'Rahul Verma', 'Tanvi Shah', 'Amit Choudhary', 'Riya Das',
  ];
  const companies = [
    'TechFlow Solutions', 'GreenLeaf Exports', 'SteelCraft Industries', 'CloudNine IT',
    'Urban Retail Pvt Ltd', 'Oceanic Logistics', 'BrightSpark Consulting', 'Nova Pharma',
    'Prime Manufacturing', 'Vertex Software', 'Apex Constructions', 'Zenith Retail',
    'Horizon Exports', 'Pinnacle Services', 'Quantum Labs', 'Synergy Foods',
    'Titan Engineering', 'Evergreen Farms', 'Delta Logistics', 'Omega Healthcare',
  ];
  const tpl = mockInvoiceTemplates[i % mockInvoiceTemplates.length];
  return {
    id: `uit_${String(i + 1).padStart(3, '0')}`,
    userId: `user_${String(i + 1).padStart(4, '0')}`,
    userEmail: `user${i + 1}@company.com`,
    userName: userNames[i],
    companyName: companies[i],
    templateId: tpl.id,
    isActive: tpl.status === 'active',
    assignedAt: tpl.uploadedAt,
    assignedBy: 'Aarav Sharma',
    createdAt: tpl.uploadedAt,
    updatedAt: tpl.updatedAt,
  };
});

// ============ EXTERNAL INTEGRATIONS ============
// export const mockExternalIntegrations: ExternalIntegration[] = [
//   {
//     id: 'int_001',
//     name: 'Tally Prime',
//     provider: 'tally',
//     description: 'Connect with Tally Prime ERP for seamless invoice and ledger sync.',
//     status: 'connected',
//     config: { connectionName: 'Tally Primary', apiUrl: 'http://localhost:9000', username: 'admin', companyCode: 'DEMO-001' },
//     syncOptions: { customers: true, invoices: true, products: true, taxes: true, payments: false, chartOfAccounts: true },
//     lastSyncAt: '2025-03-20T06:00:00.000Z',
//     nextSyncAt: '2025-03-21T06:00:00.000Z',
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-03-20T06:00:00.000Z',
//   },
//   {
//     id: 'int_002',
//     name: 'Busy Accounting',
//     provider: 'busy',
//     description: 'Sync with Busy Accounting Software for inventory and billing.',
//     status: 'disconnected',
//     config: {},
//     syncOptions: { customers: false, invoices: false, products: false, taxes: false, payments: false, chartOfAccounts: false },
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-01-01T00:00:00.000Z',
//   },
//   {
//     id: 'int_003',
//     name: 'Zoho Books',
//     provider: 'zoho_books',
//     description: 'Integrate with Zoho Books for cloud-based accounting and GST filing.',
//     status: 'error',
//     config: { connectionName: 'Zoho Primary', apiUrl: 'https://books.zoho.in/api/v3', username: 'api@company.com', companyCode: 'ZOHO-001' },
//     syncOptions: { customers: true, invoices: true, products: false, taxes: true, payments: true, chartOfAccounts: false },
//     lastSyncAt: '2025-03-18T12:00:00.000Z',
//     nextSyncAt: '2025-03-19T12:00:00.000Z',
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-03-18T12:00:00.000Z',
//   },
//   {
//     id: 'int_004',
//     name: 'Marg ERP',
//     provider: 'marg',
//     description: 'Connect with Marg ERP for pharmaceutical and retail billing.',
//     status: 'pending',
//     config: { connectionName: 'Marg Primary', apiUrl: 'https://api.margerp.com', username: 'marg_user' },
//     syncOptions: { customers: true, invoices: false, products: true, taxes: false, payments: false, chartOfAccounts: false },
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-03-15T10:00:00.000Z',
//   },
//   {
//     id: 'int_005',
//     name: 'SAP Business One',
//     provider: 'sap',
//     description: 'Enterprise-grade integration with SAP Business One for manufacturing and distribution.',
//     status: 'disconnected',
//     config: {},
//     syncOptions: { customers: false, invoices: false, products: false, taxes: false, payments: false, chartOfAccounts: false },
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-01-01T00:00:00.000Z',
//   },
//   {
//     id: 'int_006',
//     name: 'Microsoft Dynamics 365',
//     provider: 'dynamics',
//     description: 'Integrate with Dynamics 365 Finance for enterprise accounting.',
//     status: 'disconnected',
//     config: {},
//     syncOptions: { customers: false, invoices: false, products: false, taxes: false, payments: false, chartOfAccounts: false },
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-01-01T00:00:00.000Z',
//   },
//   {
//     id: 'int_007',
//     name: 'QuickBooks',
//     provider: 'quickbooks',
//     description: 'Sync with QuickBooks Online for small business accounting.',
//     status: 'connected',
//     config: { connectionName: 'QB Primary', apiUrl: 'https://sandbox-quickbooks.api.intuit.com', username: 'qb_user', companyCode: 'QB-001' },
//     syncOptions: { customers: true, invoices: true, products: true, taxes: true, payments: true, chartOfAccounts: true },
//     lastSyncAt: '2025-03-20T08:30:00.000Z',
//     nextSyncAt: '2025-03-21T08:30:00.000Z',
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-03-20T08:30:00.000Z',
//   },
//   {
//     id: 'int_008',
//     name: 'Xero',
//     provider: 'xero',
//     description: 'Connect with Xero for modern cloud accounting and bank reconciliation.',
//     status: 'disconnected',
//     config: {},
//     syncOptions: { customers: false, invoices: false, products: false, taxes: false, payments: false, chartOfAccounts: false },
//     createdAt: '2025-01-01T00:00:00.000Z',
//     updatedAt: '2025-01-01T00:00:00.000Z',
//   },
// ];

