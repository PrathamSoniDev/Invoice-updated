import { PrismaClient, UserRole, UserStatus, InvoiceStatus, TaxType, GatewayStatus, ModuleKey } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const defaultPermissions = {
  ADMIN: [
    'invoices:all', 'customers:all', 'payments:all', 'reports:all',
    'settings:all', 'users:all', 'templates:all', 'notifications:all',
  ],
  MANAGER: [
    'invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete', 'invoices:export',
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    'payments:read', 'payments:create', 'payments:update',
    'reports:read', 'reports:export',
    'users:read', 'users:update',
  ],
  STAFF: [
    'invoices:read', 'invoices:create', 'invoices:update',
    'customers:read', 'customers:create', 'customers:update',
    'payments:read',
  ],
  BUSINESS: [
    'invoices:read', 'invoices:create',
    'customers:read', 'customers:create',
    'payments:read',
  ],
  VIEWER: [
    'invoices:read',
    'customers:read',
    'payments:read',
    'reports:read',
  ],
};

async function main() {
  console.log('Seeding database...');

  await prisma.company.upsert({
    where: { id: 'company_001' },
    update: {},
    create: {
      id: 'company_001',
      name: 'Acme Corporation',
      legalName: 'Acme Corporation Pvt Ltd',
      gstNumber: '29AABCU9603R1ZM',
      panNumber: 'AABCU9603R',
      phone: '+91-9876543210',
      email: 'contact@acme.com',
      addressLine1: '123 Business Park',
      addressLine2: 'Building A',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      isActive: true,
    },
  });

  await prisma.company.upsert({
    where: { id: 'company_002' },
    update: {},
    create: {
      id: 'company_002',
      name: 'TechStart Solutions',
      legalName: 'TechStart Solutions Pvt Ltd',
      gstNumber: '27AABCT1234R1ZN',
      panNumber: 'AABCT1234R',
      phone: '+91-9876543211',
      email: 'contact@techstart.com',
      addressLine1: '456 Tech Hub',
      addressLine2: 'Floor 5',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isActive: true,
    },
  });

  const hashedPassword = await hash('Password@123', 10);

  await prisma.user.upsert({
    where: { id: 'user_admin_001' },
    update: {},
    create: {
      id: 'user_admin_001',
      email: 'admin@acme.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      phone: '+91-9876543220',
      role: 'ADMIN' as UserRole,
      status: 'ACTIVE' as UserStatus,
      companyId: 'company_001',
      emailVerified: true,
      permissions: defaultPermissions.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { id: 'user_manager_001' },
    update: {},
    create: {
      id: 'user_manager_001',
      email: 'manager@acme.com',
      passwordHash: hashedPassword,
      name: 'Manager User',
      phone: '+91-9876543221',
      role: 'MANAGER' as UserRole,
      status: 'ACTIVE' as UserStatus,
      companyId: 'company_001',
      emailVerified: true,
      permissions: defaultPermissions.MANAGER,
    },
  });

  await prisma.user.upsert({
    where: { id: 'user_staff_001' },
    update: {},
    create: {
      id: 'user_staff_001',
      email: 'staff@acme.com',
      passwordHash: hashedPassword,
      name: 'Staff User',
      phone: '+91-9876543222',
      role: 'STAFF' as UserRole,
      status: 'ACTIVE' as UserStatus,
      companyId: 'company_001',
      emailVerified: true,
      permissions: defaultPermissions.STAFF,
    },
  });

  await prisma.user.upsert({
    where: { id: 'user_admin_002' },
    update: {},
    create: {
      id: 'user_admin_002',
      email: 'admin@techstart.com',
      passwordHash: hashedPassword,
      name: 'TechStart Admin',
      phone: '+91-9876543223',
      role: 'ADMIN' as UserRole,
      status: 'ACTIVE' as UserStatus,
      companyId: 'company_002',
      emailVerified: true,
      permissions: defaultPermissions.ADMIN,
    },
  });

  const modules = [
    { id: 'module_invoices', key: 'INVOICES' as ModuleKey, label: 'Invoices', description: 'Invoice management module', icon: 'file-text' },
    { id: 'module_customers', key: 'CUSTOMERS' as ModuleKey, label: 'Customers', description: 'Customer management module', icon: 'users' },
    { id: 'module_payments', key: 'PAYMENT_LINKS' as ModuleKey, label: 'Payments', description: 'Payment processing module', icon: 'credit-card' },
    { id: 'module_reports', key: 'REPORTS' as ModuleKey, label: 'Reports', description: 'Reports and analytics module', icon: 'bar-chart' },
    { id: 'module_settings', key: 'SETTINGS' as ModuleKey, label: 'Settings', description: 'Company settings module', icon: 'settings' },
    { id: 'module_users', key: 'ADMIN' as ModuleKey, label: 'Users', description: 'User management module', icon: 'user-plus' },
    { id: 'module_templates', key: 'DASHBOARD' as ModuleKey, label: 'Templates', description: 'Invoice templates module', icon: 'layout' },
    { id: 'module_notifications', key: 'EMAIL' as ModuleKey, label: 'Notifications', description: 'Notifications module', icon: 'bell' },
  ];

  for (const module of modules) {
    await prisma.module.upsert({
      where: { id: module.id },
      update: {},
      create: module,
    });
  }

  for (const module of modules) {
    await prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId: module.id, role: 'ADMIN' } },
      update: {},
      create: {
        moduleId: module.id,
        role: 'ADMIN',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canExport: true,
        canConfigure: true,
      },
    });
    await prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId: module.id, role: 'MANAGER' } },
      update: {},
      create: {
        moduleId: module.id,
        role: 'MANAGER',
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        canExport: true,
      },
    });
    await prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId: module.id, role: 'STAFF' } },
      update: {},
      create: {
        moduleId: module.id,
        role: 'STAFF',
        canRead: true,
        canCreate: true,
        canUpdate: true,
      },
    });
    await prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId: module.id, role: 'BUSINESS' } },
      update: {},
      create: {
        moduleId: module.id,
        role: 'BUSINESS',
        canRead: true,
        canCreate: true,
      },
    });
    await prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId: module.id, role: 'VIEWER' } },
      update: {},
      create: {
        moduleId: module.id,
        role: 'VIEWER',
        canRead: true,
      },
    });
  }

  await prisma.customer.upsert({
    where: { id: 'customer_001' },
    update: {},
    create: {
      id: 'customer_001',
      companyId: 'company_001',
      name: 'ABC Enterprises',
      businessName: 'ABC Enterprises Pvt Ltd',
      email: 'abc@example.com',
      mobile: '+91-9876543230',
      gstNumber: '29AABCE1234R1ZN',
      billingLine1: '789 Commercial Street',
      billingCity: 'Chennai',
      billingState: 'Tamil Nadu',
      billingPincode: '600001',
      status: 'active',
    },
  });

  await prisma.customer.upsert({
    where: { id: 'customer_002' },
    update: {},
    create: {
      id: 'customer_002',
      companyId: 'company_001',
      name: 'XYZ Solutions',
      businessName: 'XYZ Solutions Pvt Ltd',
      email: 'xyz@example.com',
      mobile: '+91-9876543231',
      gstNumber: '27AABCX5678R1ZM',
      billingLine1: '321 Tech Park',
      billingCity: 'Hyderabad',
      billingState: 'Telangana',
      billingPincode: '500001',
      status: 'active',
    },
  });

  await prisma.taxConfiguration.create({
    data: {
      id: 'tax_cgst_9',
      companyId: 'company_001',
      name: 'CGST 9%',
      taxType: 'CGST' as TaxType,
      rate: 9,
      description: 'Central GST at 9%',
      isActive: true,
    },
  }).catch(() => {});

  await prisma.taxConfiguration.create({
    data: {
      id: 'tax_sgst_9',
      companyId: 'company_001',
      name: 'SGST 9%',
      taxType: 'SGST' as TaxType,
      rate: 9,
      description: 'State GST at 9%',
      isActive: true,
    },
  }).catch(() => {});

  await prisma.taxConfiguration.create({
    data: {
      id: 'tax_igst_18',
      companyId: 'company_001',
      name: 'IGST 18%',
      taxType: 'IGST' as TaxType,
      rate: 18,
      description: 'Integrated GST at 18%',
      isActive: true,
    },
  }).catch(() => {});

  const invoice = await prisma.invoice.upsert({
    where: { id: 'invoice_001' },
    update: {},
    create: {
      id: 'invoice_001',
      companyId: 'company_001',
      customerId: 'customer_001',
      number: 'INV-2024-0001',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'DRAFT' as InvoiceStatus,
      subtotal: 10000,
      taxAmount: 1800,
      discountAmount: 0,
      total: 11800,
      amountPaid: 0,
      balance: 11800,
      notes: 'Thank you for your business',
      terms: 'Net 30',
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'invoice_item_001' },
    update: {},
    create: {
      id: 'invoice_item_001',
      invoiceId: invoice.id,
      description: 'Software Development Services',
      hsnCode: '998314',
      quantity: 1,
      rate: 10000,
      discount: 0,
      taxRate: 18,
      amount: 11800,
    },
  });

  await prisma.invoiceSettings.upsert({
    where: { id: 'invoice_settings_001' },
    update: {},
    create: {
      id: 'invoice_settings_001',
      companyId: 'company_001',
      prefix: 'INV',
      autoNumbering: true,
      paymentTerms: 30,
      defaultTerms: 'Thank you for your business',
    },
  });

  await prisma.gatewaySettings.create({
    data: {
      id: 'gateway_settings_001',
      companyId: 'company_001',
      razorpayStatus: 'DISCONNECTED' as GatewayStatus,
    },
  }).catch(() => {});

  console.log('Seed completed successfully!');
  console.log('\nTest users:');
  console.log('  - admin@acme.com (password: Password@123) - ADMIN');
  console.log('  - manager@acme.com (password: Password@123) - MANAGER');
  console.log('  - staff@acme.com (password: Password@123) - STAFF');
  console.log('  - admin@techstart.com (password: Password@123) - ADMIN');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
