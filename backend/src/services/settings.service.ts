import { settingsRepository } from '../repositories/settings.repository';
import { cache } from '../config/redis';
import { emitToCompany } from '../socket';
import config from '../config';
import { TaxType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';

class SettingsService {
  private getCacheKey(companyId: string, suffix: string): string {
    return `${config.redis.prefix}settings:${companyId}:${suffix}`;
  }

  private async invalidateSettingsCache(companyId: string): Promise<void> {
    await cache.delPattern(`${config.redis.prefix}settings:${companyId}:*`);
    emitToCompany(companyId, 'settings:updated', { companyId });
  }

  // Company Profile
  async getCompanyProfile(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'profile');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const profile = await settingsRepository.getCompanyProfile(companyId);
    if (profile) {
      await cache.set(cacheKey, profile, 300);
    }
    return profile;
  }

  async updateCompanyProfile(companyId: string, userId: string, data: {
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
    const profile = await settingsRepository.updateCompanyProfile(companyId, data);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'SETTINGS',
        module: 'Settings',
        entityId: companyId,
        entityName: data.name || 'Company',
        description: 'Updated company profile settings',
        changes: data as any,
      },
    }).catch(() => {});

    await this.invalidateSettingsCache(companyId);
    return profile;
  }

  // Company Settings
  async getCompanySettings(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'company');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    let settings = await settingsRepository.getCompanySettings(companyId);
    if (!settings) {
      settings = await settingsRepository.upsertCompanySettings(companyId, {});
    }
    await cache.set(cacheKey, settings, 300);
    return settings;
  }

  async updateCompanySettings(companyId: string, userId: string, data: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    language?: string;
    numberFormat?: string;
  }) {
    const settings = await settingsRepository.upsertCompanySettings(companyId, data);
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'SETTINGS',
        module: 'Settings',
        entityId: companyId,
        entityName: 'Company Settings',
        description: 'Updated company general settings',
      },
    }).catch(() => {});

    return settings;
  }

  // Bank Info
  async getBankInfo(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'bank');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const bankInfo = await settingsRepository.getBankInfo(companyId);
    if (bankInfo) {
      await cache.set(cacheKey, bankInfo, 300);
    }
    return bankInfo;
  }

  async upsertBankInfo(companyId: string, userId: string, data: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    branch?: string;
    upiId?: string;
  }) {
    const bankInfo = await settingsRepository.upsertBankInfo(companyId, data);
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'SETTINGS',
        module: 'Settings',
        entityId: companyId,
        entityName: data.bankName,
        description: 'Updated bank information',
      },
    }).catch(() => {});

    return bankInfo;
  }

  async deleteBankInfo(companyId: string, userId: string) {
    await settingsRepository.deleteBankInfo(companyId);
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'DELETE',
        module: 'Settings',
        entityId: companyId,
        entityName: 'Bank Info',
        description: 'Deleted bank information',
      },
    }).catch(() => {});

    return true;
  }

  // Invoice Settings
  async getInvoiceSettings(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'invoice');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    let settings = await settingsRepository.getInvoiceSettings(companyId);
    if (!settings) {
      settings = await settingsRepository.upsertInvoiceSettings(companyId, {});
    }
    await cache.set(cacheKey, settings, 300);
    return settings;
  }

  async updateInvoiceSettings(companyId: string, userId: string, data: {
    prefix?: string;
    nextNumber?: number;
    defaultTaxRate?: number;
    defaultCurrency?: string;
    defaultTerms?: string;
    defaultNotes?: string;
    autoNumbering?: boolean;
    paymentTerms?: number;
  }) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.defaultTaxRate !== undefined) {
      updateData.defaultTaxRate = new Decimal(data.defaultTaxRate);
    }

    const settings = await settingsRepository.upsertInvoiceSettings(companyId, updateData as any);
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'SETTINGS',
        module: 'Settings',
        entityId: companyId,
        entityName: 'Invoice Settings',
        description: 'Updated invoice settings',
      },
    }).catch(() => {});

    return settings;
  }

  // Communication Settings
  async getCommunicationSettings(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'communication');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    let settings = await settingsRepository.getCommunicationSettings(companyId);
    if (!settings) {
      settings = await settingsRepository.upsertCommunicationSettings(companyId, {});
    }
    await cache.set(cacheKey, settings, 300);
    return settings;
  }

  async updateCommunicationSettings(companyId: string, userId: string, data: {
    whatsappEnabled?: boolean;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    email?: string;
    whatsappNumber?: string;
  }) {
    const settings = await settingsRepository.upsertCommunicationSettings(companyId, data);
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'SETTINGS',
        module: 'Settings',
        entityId: companyId,
        entityName: 'Communication Settings',
        description: 'Updated communication settings',
      },
    }).catch(() => {});

    return settings;
  }

  // Gateway Settings
  async getGatewaySettings(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'gateway');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    let settings = await settingsRepository.getGatewaySettings(companyId);
    if (!settings) {
      settings = await settingsRepository.upsertGatewaySettings(companyId, {});
    }
    await cache.set(cacheKey, settings, 300);
    return settings;
  }

  // Tax Configurations
  async getTaxConfigurations(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'tax');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const configurations = await settingsRepository.getTaxConfigurations(companyId);
    await cache.set(cacheKey, configurations, 300);
    return configurations;
  }

  async getTaxConfiguration(id: string, companyId: string) {
    return settingsRepository.getTaxConfiguration(id, companyId);
  }

  async createTaxConfiguration(companyId: string, userId: string, data: {
    name: string;
    taxType: string;
    rate: number;
    isIntraState?: boolean;
    description?: string;
    isActive?: boolean;
  }) {
    const taxConfig = await settingsRepository.createTaxConfiguration(companyId, {
      name: data.name,
      taxType: data.taxType as TaxType,
      rate: new Decimal(data.rate),
      isIntraState: data.isIntraState,
      description: data.description,
      isActive: data.isActive,
    });
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'CREATE',
        module: 'Settings',
        entityId: taxConfig.id,
        entityName: data.name,
        description: `Created tax configuration: ${data.name}`,
      },
    }).catch(() => {});

    return taxConfig;
  }

  async updateTaxConfiguration(id: string, companyId: string, userId: string, data: {
    name?: string;
    taxType?: string;
    rate?: number;
    isIntraState?: boolean;
    description?: string;
    isActive?: boolean;
  }) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.taxType) {
      updateData.taxType = data.taxType as TaxType;
    }
    if (data.rate !== undefined) {
      updateData.rate = new Decimal(data.rate);
    }

    await settingsRepository.updateTaxConfiguration(id, companyId, updateData as any);
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Settings',
        entityId: id,
        entityName: data.name || 'Tax Configuration',
        description: 'Updated tax configuration',
      },
    }).catch(() => {});

    return settingsRepository.getTaxConfiguration(id, companyId);
  }

  async deleteTaxConfiguration(id: string, companyId: string, userId: string) {
    const taxConfig = await settingsRepository.getTaxConfiguration(id, companyId);
    if (!taxConfig) return null;

    await settingsRepository.deleteTaxConfiguration(id, companyId);
    await this.invalidateSettingsCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'DELETE',
        module: 'Settings',
        entityId: id,
        entityName: taxConfig.name,
        description: `Deleted tax configuration: ${taxConfig.name}`,
      },
    }).catch(() => {});

    return true;
  }

  // User Settings
  async getUserSettings(userId: string) {
    const cacheKey = `${config.redis.prefix}user:${userId}:settings`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    let settings = await settingsRepository.getUserSettings(userId);
    if (!settings) {
      settings = await settingsRepository.upsertUserSettings(userId, {});
    }
    await cache.set(cacheKey, settings, 300);
    return settings;
  }

  async updateUserSettings(userId: string, data: {
    theme?: string;
    language?: string;
    timezone?: string;
    notifications?: object;
    dashboardLayout?: object;
  }) {
    const settings = await settingsRepository.upsertUserSettings(userId, data);
    await cache.del(`${config.redis.prefix}user:${userId}:settings`);
    return settings;
  }

  // Complete Settings Bundle
  async getCompleteSettings(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'complete');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const settings = await settingsRepository.getCompleteSettings(companyId);
    await cache.set(cacheKey, settings, 300);
    return settings;
  }
}

export const settingsService = new SettingsService();
