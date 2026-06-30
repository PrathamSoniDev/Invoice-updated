-- CreateTable
CREATE TABLE `companies` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `legalName` VARCHAR(255) NOT NULL,
    `gstNumber` VARCHAR(15) NULL,
    `panNumber` VARCHAR(10) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `website` VARCHAR(255) NULL,
    `addressLine1` VARCHAR(255) NOT NULL,
    `addressLine2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NOT NULL,
    `state` VARCHAR(100) NOT NULL,
    `pincode` VARCHAR(10) NOT NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'India',
    `logo` VARCHAR(500) NULL,
    `signature` VARCHAR(500) NULL,
    `primaryColor` VARCHAR(20) NULL,
    `footerText` TEXT NULL,
    `showLogo` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `subscriptionStatus` VARCHAR(20) NULL,
    `subscriptionExpiry` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `companies_gstNumber_idx`(`gstNumber`),
    INDEX `companies_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `emailVerifiedAt` DATETIME(3) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `avatar` VARCHAR(500) NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER') NOT NULL DEFAULT 'STAFF',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'INVITED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `permissions` JSON NOT NULL,
    `lastActiveAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `loginCount` INTEGER NOT NULL DEFAULT 0,
    `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `users_companyId_idx`(`companyId`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `users_companyId_email_key`(`companyId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `userAgent` TEXT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `deviceId` VARCHAR(255) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActivity` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_tokenHash_key`(`tokenHash`),
    INDEX `sessions_userId_idx`(`userId`),
    INDEX `sessions_tokenHash_idx`(`tokenHash`),
    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `revokedAt` DATETIME(3) NULL,
    `replacedBy` CHAR(36) NULL,
    `deviceId` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_tokenHash_key`(`tokenHash`),
    INDEX `refresh_tokens_userId_idx`(`userId`),
    INDEX `refresh_tokens_tokenHash_idx`(`tokenHash`),
    INDEX `refresh_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_token_key`(`token`),
    INDEX `password_reset_tokens_token_idx`(`token`),
    INDEX `password_reset_tokens_userId_idx`(`userId`),
    INDEX `password_reset_tokens_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `theme` VARCHAR(20) NOT NULL DEFAULT 'system',
    `language` VARCHAR(10) NOT NULL DEFAULT 'en',
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    `notifications` JSON NOT NULL,
    `dashboardLayout` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_settings_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `account_security` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `passwordChangedAt` DATETIME(3) NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorSecret` VARCHAR(255) NULL,
    `twoFactorBackupCodes` JSON NULL,
    `securityQuestions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `account_security_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trusted_devices` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `deviceHash` VARCHAR(255) NOT NULL,
    `deviceName` VARCHAR(255) NULL,
    `deviceType` VARCHAR(50) NULL,
    `browser` VARCHAR(100) NULL,
    `os` VARCHAR(100) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `trustedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `trusted_devices_userId_idx`(`userId`),
    UNIQUE INDEX `trusted_devices_userId_deviceHash_key`(`userId`, `deviceHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_info` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `bankName` VARCHAR(255) NOT NULL,
    `accountName` VARCHAR(255) NOT NULL,
    `accountNumber` VARCHAR(50) NOT NULL,
    `ifsc` VARCHAR(20) NOT NULL,
    `branch` VARCHAR(255) NULL,
    `upiId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_info_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_settings` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `prefix` VARCHAR(10) NOT NULL DEFAULT 'INV',
    `nextNumber` INTEGER NOT NULL DEFAULT 1001,
    `defaultTaxRate` DECIMAL(5, 2) NOT NULL DEFAULT 18,
    `defaultCurrency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `defaultTerms` TEXT NULL,
    `defaultNotes` TEXT NULL,
    `autoNumbering` BOOLEAN NOT NULL DEFAULT true,
    `paymentTerms` INTEGER NOT NULL DEFAULT 30,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoice_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_settings` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `whatsappEnabled` BOOLEAN NOT NULL DEFAULT false,
    `emailEnabled` BOOLEAN NOT NULL DEFAULT true,
    `smsEnabled` BOOLEAN NOT NULL DEFAULT false,
    `email` VARCHAR(255) NULL,
    `whatsappNumber` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `communication_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gateway_settings` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `razorpayStatus` ENUM('CONNECTED', 'DISCONNECTED') NOT NULL DEFAULT 'DISCONNECTED',
    `razorpayKeyId` VARCHAR(255) NULL,
    `razorpayKeySecret` VARCHAR(255) NULL,
    `razorpayWebhookSecret` VARCHAR(255) NULL,
    `paytmStatus` ENUM('CONNECTED', 'DISCONNECTED') NOT NULL DEFAULT 'DISCONNECTED',
    `paytmMerchantId` VARCHAR(255) NULL,
    `paytmMerchantKey` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `gateway_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_settings` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `timezone` VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    `dateFormat` VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `language` VARCHAR(10) NOT NULL DEFAULT 'en',
    `numberFormat` VARCHAR(10) NOT NULL DEFAULT 'en-IN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_settings_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `keyHash` VARCHAR(255) NOT NULL,
    `prefix` VARCHAR(10) NOT NULL,
    `permissions` JSON NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_keyHash_key`(`keyHash`),
    INDEX `api_keys_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `modules` (
    `id` CHAR(36) NOT NULL,
    `key` ENUM('DASHBOARD', 'CUSTOMERS', 'INVOICES', 'PAYMENT_LINKS', 'WHATSAPP', 'EMAIL', 'REPORTS', 'SETTINGS', 'ADMIN') NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `icon` VARCHAR(50) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `modules_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `module_roles` (
    `id` CHAR(36) NOT NULL,
    `moduleId` CHAR(36) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER') NOT NULL,
    `canRead` BOOLEAN NOT NULL DEFAULT true,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canUpdate` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `canExport` BOOLEAN NOT NULL DEFAULT false,
    `canConfigure` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `module_roles_moduleId_idx`(`moduleId`),
    UNIQUE INDEX `module_roles_moduleId_role_key`(`moduleId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `businessName` VARCHAR(255) NOT NULL,
    `gstNumber` VARCHAR(15) NULL,
    `email` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL,
    `whatsapp` VARCHAR(20) NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `billingLine1` VARCHAR(255) NOT NULL,
    `billingLine2` VARCHAR(255) NULL,
    `billingCity` VARCHAR(100) NOT NULL,
    `billingState` VARCHAR(100) NOT NULL,
    `billingPincode` VARCHAR(10) NOT NULL,
    `billingCountry` VARCHAR(100) NOT NULL DEFAULT 'India',
    `shippingLine1` VARCHAR(255) NULL,
    `shippingLine2` VARCHAR(255) NULL,
    `shippingCity` VARCHAR(100) NULL,
    `shippingState` VARCHAR(100) NULL,
    `shippingPincode` VARCHAR(10) NULL,
    `shippingCountry` VARCHAR(100) NULL,
    `totalInvoices` INTEGER NOT NULL DEFAULT 0,
    `totalRevenue` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `outstandingAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `createdById` CHAR(36) NULL,
    `updatedById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `customers_companyId_idx`(`companyId`),
    INDEX `customers_name_idx`(`name`),
    INDEX `customers_businessName_idx`(`businessName`),
    INDEX `customers_gstNumber_idx`(`gstNumber`),
    INDEX `customers_status_idx`(`status`),
    INDEX `customers_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `customers_companyId_email_key`(`companyId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `number` VARCHAR(50) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `issueDate` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `taxAmount` DECIMAL(15, 2) NOT NULL,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(15, 2) NOT NULL,
    `amountPaid` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `balance` DECIMAL(15, 2) NOT NULL,
    `notes` TEXT NULL,
    `terms` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `viewedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `placeOfSupply` VARCHAR(100) NULL,
    `reverseCharge` BOOLEAN NOT NULL DEFAULT false,
    `createdById` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `invoices_companyId_idx`(`companyId`),
    INDEX `invoices_customerId_idx`(`customerId`),
    INDEX `invoices_status_idx`(`status`),
    INDEX `invoices_issueDate_idx`(`issueDate`),
    INDEX `invoices_dueDate_idx`(`dueDate`),
    INDEX `invoices_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `invoices_companyId_number_key`(`companyId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `hsnCode` VARCHAR(20) NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `rate` DECIMAL(15, 2) NOT NULL,
    `discount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxRate` DECIMAL(5, 2) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_items_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_taxes` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `taxType` ENUM('GST', 'CGST', 'SGST', 'IGST', 'CESS', 'TDS', 'TCS') NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL,
    `taxableAmount` DECIMAL(15, 2) NOT NULL,
    `taxAmount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_taxes_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_discounts` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `couponId` CHAR(36) NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    `discountValue` DECIMAL(15, 2) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_discounts_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_attachments` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `uploadedById` CHAR(36) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `invoice_attachments_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_activities` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `action` VARCHAR(50) NOT NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_activities_invoiceId_idx`(`invoiceId`),
    INDEX `invoice_activities_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_comments` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_comments_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_versions` (
    `id` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NOT NULL,
    `version` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `changedById` CHAR(36) NOT NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changeDescription` VARCHAR(500) NULL,

    INDEX `invoice_versions_invoiceId_idx`(`invoiceId`),
    UNIQUE INDEX `invoice_versions_invoiceId_version_key`(`invoiceId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_configurations` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `taxType` ENUM('GST', 'CGST', 'SGST', 'IGST', 'CESS', 'TDS', 'TCS') NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `isIntraState` BOOLEAN NOT NULL DEFAULT true,
    `description` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tax_configurations_companyId_idx`(`companyId`),
    UNIQUE INDEX `tax_configurations_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hsn_sac_codes` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `taxRate` DECIMAL(5, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `hsn_sac_codes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `description` VARCHAR(500) NULL,
    `discountType` ENUM('PERCENTAGE', 'FIXED') NOT NULL,
    `discountValue` DECIMAL(15, 2) NOT NULL,
    `minOrderValue` DECIMAL(15, 2) NULL,
    `maxDiscount` DECIMAL(15, 2) NULL,
    `usageLimit` INTEGER NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `validFrom` DATETIME(3) NOT NULL,
    `validTo` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `coupons_companyId_idx`(`companyId`),
    UNIQUE INDEX `coupons_companyId_code_key`(`companyId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_notes` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `number` VARCHAR(50) NOT NULL,
    `invoiceId` CHAR(36) NULL,
    `customerId` CHAR(36) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `issuedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `credit_notes_companyId_idx`(`companyId`),
    INDEX `credit_notes_customerId_idx`(`customerId`),
    UNIQUE INDEX `credit_notes_companyId_number_key`(`companyId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `debit_notes` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `number` VARCHAR(50) NOT NULL,
    `invoiceId` CHAR(36) NULL,
    `customerId` CHAR(36) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` ENUM('DRAFT', 'ISSUED', 'APPLIED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `issuedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `debit_notes_companyId_idx`(`companyId`),
    INDEX `debit_notes_customerId_idx`(`customerId`),
    UNIQUE INDEX `debit_notes_companyId_number_key`(`companyId`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_invoices` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `templateInvoiceId` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL,
    `interval` INTEGER NOT NULL DEFAULT 1,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `nextRunAt` DATETIME(3) NOT NULL,
    `lastRunAt` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recurring_invoices_companyId_idx`(`companyId`),
    INDEX `recurring_invoices_customerId_idx`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_invoice_runs` (
    `id` CHAR(36) NOT NULL,
    `recurringInvoiceId` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `executedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `recurring_invoice_runs_recurringInvoiceId_idx`(`recurringInvoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_links` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `linkId` VARCHAR(50) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `gateway` ENUM('RAZORPAY', 'PAYTM') NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `gatewayLinkId` VARCHAR(255) NULL,
    `url` VARCHAR(500) NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `payment_links_linkId_key`(`linkId`),
    INDEX `payment_links_companyId_idx`(`companyId`),
    INDEX `payment_links_customerId_idx`(`customerId`),
    INDEX `payment_links_status_idx`(`status`),
    INDEX `payment_links_gateway_idx`(`gateway`),
    INDEX `payment_links_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `invoiceId` CHAR(36) NULL,
    `paymentLinkId` CHAR(36) NULL,
    `customerId` CHAR(36) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `method` ENUM('CARD', 'UPI', 'NETBANKING', 'WALLET', 'CASH', 'CHEQUE') NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `gateway` ENUM('RAZORPAY', 'PAYTM') NULL,
    `transactionId` VARCHAR(100) NOT NULL,
    `gatewayResponse` JSON NULL,
    `date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_transactionId_key`(`transactionId`),
    INDEX `payments_companyId_idx`(`companyId`),
    INDEX `payments_invoiceId_idx`(`invoiceId`),
    INDEX `payments_paymentLinkId_idx`(`paymentLinkId`),
    INDEX `payments_customerId_idx`(`customerId`),
    INDEX `payments_transactionId_idx`(`transactionId`),
    INDEX `payments_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_logs` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `channel` ENUM('WHATSAPP', 'EMAIL', 'SMS') NOT NULL,
    `recipient` VARCHAR(255) NOT NULL,
    `recipientName` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `templateId` CHAR(36) NULL,
    `templateName` VARCHAR(255) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `failedReason` TEXT NULL,
    `relatedType` VARCHAR(50) NULL,
    `relatedId` CHAR(36) NULL,
    `customerId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `communication_logs_companyId_idx`(`companyId`),
    INDEX `communication_logs_channel_idx`(`channel`),
    INDEX `communication_logs_status_idx`(`status`),
    INDEX `communication_logs_customerId_idx`(`customerId`),
    INDEX `communication_logs_sentAt_idx`(`sentAt`),
    INDEX `communication_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_templates` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `channel` ENUM('WHATSAPP', 'EMAIL', 'SMS') NOT NULL,
    `subject` VARCHAR(500) NULL,
    `body` TEXT NOT NULL,
    `variables` JSON NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_templates_companyId_idx`(`companyId`),
    INDEX `message_templates_channel_idx`(`channel`),
    UNIQUE INDEX `message_templates_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_templates` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `type` ENUM('TSX', 'HTML', 'JSON') NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `content` LONGTEXT NULL,
    `config` JSON NULL,
    `status` ENUM('ACTIVE', 'DISABLED', 'DRAFT') NOT NULL DEFAULT 'ACTIVE',
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `uploadedById` CHAR(36) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `invoice_templates_companyId_idx`(`companyId`),
    INDEX `invoice_templates_status_idx`(`status`),
    INDEX `invoice_templates_isDefault_idx`(`isDefault`),
    UNIQUE INDEX `invoice_templates_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_versions` (
    `id` CHAR(36) NOT NULL,
    `templateId` CHAR(36) NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `content` LONGTEXT NULL,
    `config` JSON NULL,
    `uploadedById` CHAR(36) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `template_versions_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_invoice_templates` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `templateId` CHAR(36) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assignedById` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_invoice_templates_companyId_idx`(`companyId`),
    INDEX `user_invoice_templates_userId_idx`(`userId`),
    UNIQUE INDEX `user_invoice_templates_companyId_userId_key`(`companyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_logs` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `userName` VARCHAR(255) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(100) NOT NULL,
    `entityId` CHAR(36) NOT NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_logs_companyId_idx`(`companyId`),
    INDEX `activity_logs_userId_idx`(`userId`),
    INDEX `activity_logs_entity_idx`(`entity`),
    INDEX `activity_logs_entityId_idx`(`entityId`),
    INDEX `activity_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `userName` VARCHAR(255) NOT NULL,
    `userRole` ENUM('ADMIN', 'MANAGER', 'STAFF', 'BUSINESS', 'VIEWER') NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'SETTINGS', 'VIEW') NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `entityId` CHAR(36) NOT NULL,
    `entityName` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `changes` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_companyId_idx`(`companyId`),
    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_module_idx`(`module`),
    INDEX `audit_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `external_integrations` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `provider` ENUM('TALLY', 'BUSY', 'ZOHO_BOOKS', 'MARG', 'SAP', 'DYNAMICS', 'QUICKBOOKS', 'XERO') NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('CONNECTED', 'DISCONNECTED', 'ERROR', 'PENDING') NOT NULL DEFAULT 'DISCONNECTED',
    `config` JSON NULL,
    `syncOptions` JSON NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `nextSyncAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `external_integrations_companyId_idx`(`companyId`),
    INDEX `external_integrations_provider_idx`(`provider`),
    INDEX `external_integrations_status_idx`(`status`),
    UNIQUE INDEX `external_integrations_companyId_provider_key`(`companyId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `integration_logs` (
    `id` CHAR(36) NOT NULL,
    `integrationId` CHAR(36) NOT NULL,
    `level` VARCHAR(20) NOT NULL,
    `message` TEXT NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `integration_logs_integrationId_idx`(`integrationId`),
    INDEX `integration_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_history` (
    `id` CHAR(36) NOT NULL,
    `integrationId` CHAR(36) NOT NULL,
    `syncType` VARCHAR(20) NOT NULL,
    `entityType` VARCHAR(100) NOT NULL,
    `status` ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `recordsCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `sync_history_integrationId_idx`(`integrationId`),
    INDEX `sync_history_status_idx`(`status`),
    INDEX `sync_history_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `data` JSON NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_companyId_idx`(`companyId`),
    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_readAt_idx`(`readAt`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_reports` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `reportType` VARCHAR(100) NOT NULL,
    `config` JSON NOT NULL,
    `schedule` JSON NULL,
    `lastRunAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `saved_reports_companyId_idx`(`companyId`),
    UNIQUE INDEX `saved_reports_companyId_name_key`(`companyId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `export_history` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `reportType` VARCHAR(100) NOT NULL,
    `format` VARCHAR(20) NOT NULL,
    `parameters` JSON NOT NULL,
    `filePath` VARCHAR(500) NULL,
    `fileSize` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `export_history_companyId_idx`(`companyId`),
    INDEX `export_history_userId_idx`(`userId`),
    INDEX `export_history_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_uploads` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `publicId` VARCHAR(255) NULL,
    `uploadedById` CHAR(36) NULL,
    `relatedType` VARCHAR(50) NULL,
    `relatedId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `file_uploads_companyId_idx`(`companyId`),
    INDEX `file_uploads_relatedType_relatedId_idx`(`relatedType`, `relatedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_usage_logs` (
    `id` CHAR(36) NOT NULL,
    `companyId` CHAR(36) NULL,
    `userId` CHAR(36) NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `statusCode` INTEGER NOT NULL,
    `duration` INTEGER NOT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `requestSize` INTEGER NULL,
    `responseSize` INTEGER NULL,
    `error` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_usage_logs_companyId_idx`(`companyId`),
    INDEX `api_usage_logs_userId_idx`(`userId`),
    INDEX `api_usage_logs_endpoint_idx`(`endpoint`),
    INDEX `api_usage_logs_timestamp_idx`(`timestamp`),
    INDEX `api_usage_logs_statusCode_idx`(`statusCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `account_security` ADD CONSTRAINT `account_security_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trusted_devices` ADD CONSTRAINT `trusted_devices_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_info` ADD CONSTRAINT `bank_info_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_settings` ADD CONSTRAINT `invoice_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_settings` ADD CONSTRAINT `communication_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gateway_settings` ADD CONSTRAINT `gateway_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `company_settings` ADD CONSTRAINT `company_settings_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `module_roles` ADD CONSTRAINT `module_roles_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `modules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_taxes` ADD CONSTRAINT `invoice_taxes_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_discounts` ADD CONSTRAINT `invoice_discounts_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_attachments` ADD CONSTRAINT `invoice_attachments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_activities` ADD CONSTRAINT `invoice_activities_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_comments` ADD CONSTRAINT `invoice_comments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_versions` ADD CONSTRAINT `invoice_versions_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax_configurations` ADD CONSTRAINT `tax_configurations_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_notes` ADD CONSTRAINT `credit_notes_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `debit_notes` ADD CONSTRAINT `debit_notes_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_invoices` ADD CONSTRAINT `recurring_invoices_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_invoice_runs` ADD CONSTRAINT `recurring_invoice_runs_recurringInvoiceId_fkey` FOREIGN KEY (`recurringInvoiceId`) REFERENCES `recurring_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_links` ADD CONSTRAINT `payment_links_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_links` ADD CONSTRAINT `payment_links_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_paymentLinkId_fkey` FOREIGN KEY (`paymentLinkId`) REFERENCES `payment_links`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_logs` ADD CONSTRAINT `communication_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_logs` ADD CONSTRAINT `communication_logs_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_logs` ADD CONSTRAINT `communication_logs_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `message_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_templates` ADD CONSTRAINT `invoice_templates_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_templates` ADD CONSTRAINT `invoice_templates_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_versions` ADD CONSTRAINT `template_versions_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `invoice_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_versions` ADD CONSTRAINT `template_versions_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_invoice_templates` ADD CONSTRAINT `user_invoice_templates_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_invoice_templates` ADD CONSTRAINT `user_invoice_templates_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_invoice_templates` ADD CONSTRAINT `user_invoice_templates_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `invoice_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `external_integrations` ADD CONSTRAINT `external_integrations_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `integration_logs` ADD CONSTRAINT `integration_logs_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `external_integrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_history` ADD CONSTRAINT `sync_history_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `external_integrations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_reports` ADD CONSTRAINT `saved_reports_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `export_history` ADD CONSTRAINT `export_history_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
