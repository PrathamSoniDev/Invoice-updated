import prisma from '../config/database';
import { GatewayStatus, TaxType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class SettingsRepository {
  // Company Settings
  async getCompanySettings(companyId: string) {
    const settings = await prisma.companySettings.findUnique({
      where: { companyId },
    });
    return settings;
  }

  async upsertCompanySettings(companyId: string, data: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    language?: string;
    numberFormat?: string;
  }) {
    return prisma.companySettings.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }

  // Bank Info
  async getBankInfo(companyId: string) {
    return prisma.bankInfo.findUnique({
      where: { companyId },
    });
  }

  async upsertBankInfo(companyId: string, data: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    branch?: string;
    upiId?: string;
  }) {
    return prisma.bankInfo.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }

  async deleteBankInfo(companyId: string) {
    return prisma.bankInfo.delete({
      where: { companyId },
    });
  }

  // Invoice Settings
  async getInvoiceSettings(companyId: string) {
    return prisma.invoiceSettings.findUnique({
      where: { companyId },
    });
  }

  async upsertInvoiceSettings(companyId: string, data: {
    prefix?: string;
    nextNumber?: number;
    defaultTaxRate?: Decimal;
    defaultCurrency?: string;
    defaultTerms?: string;
    defaultNotes?: string;
    autoNumbering?: boolean;
    paymentTerms?: number;
  }) {
    return prisma.invoiceSettings.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }

  // Communication Settings
  async getCommunicationSettings(companyId: string) {
    return prisma.communicationSettings.findUnique({
      where: { companyId },
    });
  }

  async upsertCommunicationSettings(companyId: string, data: {
    whatsappEnabled?: boolean;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    email?: string;
    whatsappNumber?: string;
  }) {
    return prisma.communicationSettings.upsert({
      where: { companyId },
      update: data,
      create: { companyId, ...data },
    });
  }

  // Gateway Settings
  async getGatewaySettings(companyId: string) {
    return prisma.gatewaySettings.findUnique({
      where: { companyId },
    });
  }

  async upsertGatewaySettings(companyId: string, data: {
    razorpayStatus?: GatewayStatus;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    razorpayWebhookSecret?: string;
    paytmStatus?: GatewayStatus;
    paytmMerchantId?: string;
    paytmMerchantKey?: string;
  }) {
    return prisma.gatewaySettings.upsert({
      where: { companyId },
      update: data,
      create: {
        companyId,
        razorpayStatus: data.razorpayStatus || 'DISCONNECTED',
        paytmStatus: data.paytmStatus || 'DISCONNECTED',
        ...data,
      },
    });
  }

  // Tax Configurations
  async getTaxConfigurations(companyId: string) {
    return prisma.taxConfiguration.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async getTaxConfiguration(id: string, companyId: string) {
    return prisma.taxConfiguration.findFirst({
      where: { id, companyId },
    });
  }

  async createTaxConfiguration(companyId: string, data: {
    name: string;
    taxType: TaxType;
    rate: Decimal;
    isIntraState?: boolean;
    description?: string;
    isActive?: boolean;
  }) {
    return prisma.taxConfiguration.create({
      data: { companyId, ...data },
    });
  }

  async updateTaxConfiguration(id: string, companyId: string, data: {
    name?: string;
    taxType?: TaxType;
    rate?: Decimal;
    isIntraState?: boolean;
    description?: string;
    isActive?: boolean;
  }) {
    return prisma.taxConfiguration.updateMany({
      where: { id, companyId },
      data,
    });
  }

  async deleteTaxConfiguration(id: string, companyId: string) {
    return prisma.taxConfiguration.deleteMany({
      where: { id, companyId },
    });
  }

  // User Settings
  async getUserSettings(userId: string) {
    return prisma.userSettings.findUnique({
      where: { userId },
    });
  }

  async upsertUserSettings(userId: string, data: {
    theme?: string;
    language?: string;
    timezone?: string;
    notifications?: object;
    dashboardLayout?: object;
  }) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  // Account Security
  async getAccountSecurity(userId: string) {
    return prisma.accountSecurity.findUnique({
      where: { userId },
    });
  }

  // Company Profile
  async getCompanyProfile(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        legalName: true,
        gstNumber: true,
        panNumber: true,
        email: true,
        phone: true,
        website: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        logo: true,
        signature: true,
        primaryColor: true,
        footerText: true,
        showLogo: true,
        isActive: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateCompanyProfile(companyId: string, data: {
    name?: string;
    legalName?: string;
    gstNumber?: string;
    panNumber?: string;
    email?: string;
    phone?: string;
    website?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    logo?: string;
    signature?: string;
    primaryColor?: string;
    footerText?: string;
    showLogo?: boolean;
  }) {
    return prisma.company.update({
      where: { id: companyId },
      data,
    });
  }

  // Complete Settings Bundle
  async getCompleteSettings(companyId: string) {
    const [company, companySettings, bankInfo, invoiceSettings, communicationSettings, gatewaySettings, taxConfigurations] = await Promise.all([
      this.getCompanyProfile(companyId),
      this.getCompanySettings(companyId),
      this.getBankInfo(companyId),
      this.getInvoiceSettings(companyId),
      this.getCommunicationSettings(companyId),
      this.getGatewaySettings(companyId),
      this.getTaxConfigurations(companyId),
    ]);

    return {
      company,
      companySettings,
      bankInfo,
      invoiceSettings,
      communicationSettings,
      gatewaySettings,
      taxConfigurations,
    };
  }
}

export const settingsRepository = new SettingsRepository();
