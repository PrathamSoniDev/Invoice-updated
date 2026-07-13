/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId } from '@/lib/database';
import type { CompanyInfo, BankInfo, InvoiceSettings, CommunicationSettings, GatewaySettings } from '@/types';

export const settingsService = {
  async getCompanyProfile(): Promise<CompanyInfo | null> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (error) return null;

    return {
      name: data.name,
      legalName: data.legalName,
      gstNumber: data.gstNumber || '',
      panNumber: data.panNumber || '',
      email: data.email,
      phone: data.phone || '',
      website: data.website || '',
      address: {
        line1: data.addressLine1,
        line2: data.addressLine2 || '',
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country,
      },
      logo: data.logo || undefined,
      signature: data.signature || undefined,
      primaryColor: data.primaryColor || undefined,
      footerText: data.footerText || undefined,
      showLogo: data.showLogo ?? true,
    };
  },

  async updateCompanyProfile(input: Partial<CompanyInfo>): Promise<CompanyInfo> {
    const companyId = await getCurrentCompanyId();

    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.legalName !== undefined) updateData.legalName = input.legalName;
    if (input.gstNumber !== undefined) updateData.gstNumber = input.gstNumber || null;
    if (input.panNumber !== undefined) updateData.panNumber = input.panNumber || null;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.website !== undefined) updateData.website = input.website || null;
    if (input.logo !== undefined) updateData.logo = input.logo || null;
    if (input.signature !== undefined) updateData.signature = input.signature || null;
    if (input.primaryColor !== undefined) updateData.primaryColor = input.primaryColor;
    if (input.footerText !== undefined) updateData.footerText = input.footerText;
    if (input.showLogo !== undefined) updateData.showLogo = input.showLogo;

    if (input.address) {
      if (input.address.line1 !== undefined) updateData.addressLine1 = input.address.line1;
      if (input.address.line2 !== undefined) updateData.addressLine2 = input.address.line2;
      if (input.address.city !== undefined) updateData.city = input.address.city;
      if (input.address.state !== undefined) updateData.state = input.address.state;
      if (input.address.pincode !== undefined) updateData.pincode = input.address.pincode;
      if (input.address.country !== undefined) updateData.country = input.address.country;
    }

    const { data, error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', companyId)
      .select()
      .single();

    if (error) throw error;

    return {
      name: data.name,
      legalName: data.legalName,
      gstNumber: data.gstNumber || '',
      panNumber: data.panNumber || '',
      email: data.email,
      phone: data.phone || '',
      website: data.website || '',
      address: {
        line1: data.addressLine1,
        line2: data.addressLine2 || '',
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        country: data.country,
      },
      logo: data.logo || undefined,
      signature: data.signature || undefined,
      primaryColor: data.primaryColor || undefined,
      footerText: data.footerText || undefined,
      showLogo: data.showLogo ?? true,
    };
  },

  async getBankInfo(): Promise<BankInfo | null> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('bank_info')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      bankName: data.bankName,
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      ifsc: data.ifsc,
      branch: data.branch || '',
      upiId: data.upiId || '',
    };
  },

  async upsertBankInfo(input: Partial<BankInfo>): Promise<BankInfo> {
    const companyId = await getCurrentCompanyId();

    const defaults: BankInfo = {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      upiId: '',
    };

    // Check if bank info exists
    const { data: existing, error: existingError } = await supabase
      .from('bank_info')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { data, error } = await supabase
        .from('bank_info')
        .update({
          ...input,
          branch: input.branch ?? existing.branch,
          upiId: input.upiId ?? existing.upiId,
        })
        .eq('companyId', companyId)
        .select()
        .single();

      if (error) throw error;
      return {
        bankName: data.bankName,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        ifsc: data.ifsc,
        branch: data.branch || '',
        upiId: data.upiId || '',
      };
    }

    const { data, error } = await supabase
      .from('bank_info')
      .insert({
        companyId,
        ...defaults,
        ...input,
        branch: input.branch || null,
        upiId: input.upiId || null,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      bankName: data.bankName,
      accountName: data.accountName,
      accountNumber: data.accountNumber,
      ifsc: data.ifsc,
      branch: data.branch || '',
      upiId: data.upiId || '',
    };
  },

  async deleteBankInfo(): Promise<void> {
    const companyId = await getCurrentCompanyId();
    const { error } = await supabase.from('bank_info').delete().eq('companyId', companyId);

    if (error) throw error;
  },

  async getInvoiceSettings(): Promise<InvoiceSettings | null> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      prefix: data.prefix,
      nextNumber: data.nextNumber,
      defaultTaxRate: parseFloat(data.defaultTaxRate) || 18,
      defaultCurrency: data.defaultCurrency,
      defaultTerms: data.defaultTerms || '',
      defaultNotes: data.defaultNotes || '',
      autoNumbering: data.autoNumbering,
      paymentTerms: data.paymentTerms,
    };
  },

  async updateInvoiceSettings(input: Partial<InvoiceSettings>): Promise<InvoiceSettings> {
    const companyId = await getCurrentCompanyId();

    const { data: existing, error: existingError } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (existingError) throw existingError;

    const defaults: InvoiceSettings = {
      prefix: 'INV',
      nextNumber: 1001,
      defaultTaxRate: 18,
      defaultCurrency: 'INR',
      defaultTerms: '',
      defaultNotes: '',
      autoNumbering: true,
      paymentTerms: 30,
    };

    const updateData: Record<string, any> = {};
    if (input.prefix !== undefined) updateData.prefix = input.prefix;
    if (input.nextNumber !== undefined) updateData.nextNumber = input.nextNumber;
    if (input.defaultTaxRate !== undefined) updateData.defaultTaxRate = input.defaultTaxRate;
    if (input.defaultCurrency !== undefined) updateData.defaultCurrency = input.defaultCurrency;
    if (input.defaultTerms !== undefined) updateData.defaultTerms = input.defaultTerms;
    if (input.defaultNotes !== undefined) updateData.defaultNotes = input.defaultNotes;
    if (input.autoNumbering !== undefined) updateData.autoNumbering = input.autoNumbering;
    if (input.paymentTerms !== undefined) updateData.paymentTerms = input.paymentTerms;

    if (existing) {
      const { data, error } = await supabase
        .from('invoice_settings')
        .update(updateData)
        .eq('companyId', companyId)
        .select()
        .single();

      if (error) throw error;

      return {
        prefix: data.prefix,
        nextNumber: data.nextNumber,
        defaultTaxRate: parseFloat(data.defaultTaxRate) || 18,
        defaultCurrency: data.defaultCurrency,
        defaultTerms: data.defaultTerms || '',
        defaultNotes: data.defaultNotes || '',
        autoNumbering: data.autoNumbering,
        paymentTerms: data.paymentTerms,
      };
    }

    const { data, error } = await supabase
      .from('invoice_settings')
      .insert({
        companyId,
        ...defaults,
        ...updateData,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      prefix: data.prefix,
      nextNumber: data.nextNumber,
      defaultTaxRate: parseFloat(data.defaultTaxRate) || 18,
      defaultCurrency: data.defaultCurrency,
      defaultTerms: data.defaultTerms || '',
      defaultNotes: data.defaultNotes || '',
      autoNumbering: data.autoNumbering,
      paymentTerms: data.paymentTerms,
    };
  },

  async getCommunicationSettings(): Promise<CommunicationSettings | null> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('communication_settings')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      whatsappEnabled: data.whatsappEnabled,
      emailEnabled: data.emailEnabled,
      smsEnabled: data.smsEnabled,
      email: data.email || '',
      whatsappNumber: data.whatsappNumber || '',
    };
  },

  async updateCommunicationSettings(input: Partial<CommunicationSettings>): Promise<CommunicationSettings> {
    const companyId = await getCurrentCompanyId();

    const { data: existing, error: existingError } = await supabase
      .from('communication_settings')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (existingError) throw existingError;

    const defaults: CommunicationSettings = {
      whatsappEnabled: false,
      emailEnabled: true,
      smsEnabled: false,
      email: '',
      whatsappNumber: '',
    };

    const updateData: Record<string, any> = {};
    if (input.whatsappEnabled !== undefined) updateData.whatsappEnabled = input.whatsappEnabled;
    if (input.emailEnabled !== undefined) updateData.emailEnabled = input.emailEnabled;
    if (input.smsEnabled !== undefined) updateData.smsEnabled = input.smsEnabled;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.whatsappNumber !== undefined) updateData.whatsappNumber = input.whatsappNumber;

    if (existing) {
      const { data, error } = await supabase
        .from('communication_settings')
        .update(updateData)
        .eq('companyId', companyId)
        .select()
        .single();

      if (error) throw error;

      return {
        whatsappEnabled: data.whatsappEnabled,
        emailEnabled: data.emailEnabled,
        smsEnabled: data.smsEnabled,
        email: data.email || '',
        whatsappNumber: data.whatsappNumber || '',
      };
    }

    const { data, error } = await supabase
      .from('communication_settings')
      .insert({
        companyId,
        ...defaults,
        ...updateData,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      whatsappEnabled: data.whatsappEnabled,
      emailEnabled: data.emailEnabled,
      smsEnabled: data.smsEnabled,
      email: data.email || '',
      whatsappNumber: data.whatsappNumber || '',
    };
  },

  async getGatewaySettings(): Promise<GatewaySettings | null> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('gateway_settings')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      razorpay: {
        status: data.razorpayEnabled ? 'connected' : 'disconnected',
      },
      paytm: {
        status: data.paytmEnabled ? 'connected' : 'disconnected',
      },
    };
  },

  async updateGatewaySettings(input: Partial<GatewaySettings>): Promise<GatewaySettings> {
    const companyId = await getCurrentCompanyId();

    const updateData: Record<string, any> = {};
    if (input.razorpay?.status !== undefined) updateData.razorpayEnabled = input.razorpay.status === 'connected';
    if (input.paytm?.status !== undefined) updateData.paytmEnabled = input.paytm.status === 'connected';

    const { data: existing, error: existingError } = await supabase
      .from('gateway_settings')
      .select('*')
      .eq('companyId', companyId)
      .maybeSingle();

    if (existingError) throw existingError;

    const query = existing
      ? supabase.from('gateway_settings').update(updateData).eq('companyId', companyId)
      : supabase.from('gateway_settings').insert({ companyId, ...updateData });

    const { data, error } = await query.select().single();

    if (error) throw error;

    return {
      razorpay: {
        status: data.razorpayEnabled ? 'connected' : 'disconnected',
      },
      paytm: {
        status: data.paytmEnabled ? 'connected' : 'disconnected',
      },
    };
  },

  async getTaxConfigurations(): Promise<any[]> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('tax_configurations')
      .select('*')
      .eq('companyId', companyId)
      .eq('isActive', true);

    if (error) throw error;

    return (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      rate: parseFloat(t.rate) || 0,
      isDefault: t.isDefault,
    }));
  },

  async createTaxConfiguration(input: { name: string; type: string; rate: number; isDefault?: boolean }): Promise<any> {
    const companyId = await getCurrentCompanyId();

    const { data, error } = await supabase
      .from('tax_configurations')
      .insert({
        companyId,
        name: input.name,
        type: input.type.toUpperCase(),
        rate: input.rate,
        isDefault: input.isDefault || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTaxConfiguration(id: string, input: Partial<{ name: string; type: string; rate: number; isDefault: boolean }>): Promise<any> {
    const companyId = await getCurrentCompanyId();
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.type !== undefined) updateData.type = input.type.toUpperCase();
    if (input.rate !== undefined) updateData.rate = input.rate;
    if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

    const { data, error } = await supabase
      .from('tax_configurations')
      .update(updateData)
      .eq('companyId', companyId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTaxConfiguration(id: string): Promise<void> {
    const companyId = await getCurrentCompanyId();

    const { error } = await supabase
      .from('tax_configurations')
      .update({ isActive: false })
      .eq('companyId', companyId)
      .eq('id', id);

    if (error) throw error;
  },

  async getUserSettings(): Promise<any> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    if (error || !data) {
      return {
        theme: 'system',
        language: 'en',
        timezone: 'Asia/Kolkata',
        notifications: {},
      };
    }

    return {
      theme: data.theme,
      language: data.language,
      timezone: data.timezone,
      notifications: data.notifications,
      dashboardLayout: data.dashboardLayout,
    };
  },

  async updateUserSettings(input: any): Promise<any> {
    const userId = await getCurrentUserId();

    const { data: existing, error: existingError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();

    if (existingError) throw existingError;

    const updateData: Record<string, any> = {};
    if (input.theme !== undefined) updateData.theme = input.theme;
    if (input.language !== undefined) updateData.language = input.language;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.notifications !== undefined) updateData.notifications = input.notifications;
    if (input.dashboardLayout !== undefined) updateData.dashboardLayout = input.dashboardLayout;

    if (existing) {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updateData)
        .eq('userId', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        userId,
        ...updateData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCompleteSettings(): Promise<any> {
    const [company, bankInfo, invoiceSettings, communicationSettings, gatewaySettings] = await Promise.all([
      this.getCompanyProfile(),
      this.getBankInfo(),
      this.getInvoiceSettings(),
      this.getCommunicationSettings(),
      this.getGatewaySettings(),
    ]);

    return {
      company,
      bankInfo,
      invoiceSettings,
      communicationSettings,
      gatewaySettings,
    };
  },
};

// Export with the expected name for backwards compatibility
export const settingsApi = settingsService;
