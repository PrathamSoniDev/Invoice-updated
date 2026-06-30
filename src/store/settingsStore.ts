import { create } from 'zustand';
import type {
  CompanyInfo,
  BankInfo,
  InvoiceSettings,
  CommunicationSettings,
  GatewaySettings,
} from '@/types';
import { settingsApi } from '@/utils/api';

interface SettingsState {
  company: CompanyInfo | null;
  bank: BankInfo | null;
  invoice: InvoiceSettings | null;
  communication: CommunicationSettings | null;
  gateways: GatewaySettings | null;
  isLoading: boolean;
  isInitialized: boolean;
  fetchSettings: () => Promise<void>;
  updateCompany: (data: Partial<CompanyInfo>) => Promise<void>;
  updateBank: (data: Partial<BankInfo>) => Promise<void>;
  updateInvoice: (data: Partial<InvoiceSettings>) => Promise<void>;
  updateCommunication: (data: Partial<CommunicationSettings>) => Promise<void>;
  updateGateways: (data: Partial<GatewaySettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  company: null,
  bank: null,
  invoice: null,
  communication: null,
  gateways: null,
  isLoading: false,
  isInitialized: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await settingsApi.getCompleteSettings();

      const company: CompanyInfo | null = settings.company ? {
        name: settings.company.name,
        legalName: settings.company.legalName,
        gstNumber: settings.company.gstNumber || '',
        panNumber: settings.company.panNumber || '',
        email: settings.company.email,
        phone: settings.company.phone || '',
        website: settings.company.website || '',
        address: {
          line1: settings.company.addressLine1,
          line2: settings.company.addressLine2 || '',
          city: settings.company.city,
          state: settings.company.state,
          pincode: settings.company.pincode,
          country: settings.company.country,
        },
        logo: settings.company.logo || '',
        signature: settings.company.signature || '',
        primaryColor: settings.company.primaryColor || '',
        footerText: settings.company.footerText || '',
        showLogo: settings.company.showLogo ?? true,
      } : null;

      const bank: BankInfo | null = settings.bankInfo ? {
        bankName: settings.bankInfo.bankName,
        accountName: settings.bankInfo.accountName,
        accountNumber: settings.bankInfo.accountNumber,
        ifsc: settings.bankInfo.ifsc,
        branch: settings.bankInfo.branch || '',
        upiId: settings.bankInfo.upiId || '',
      } : null;

      const invoice: InvoiceSettings | null = settings.invoiceSettings ? {
        prefix: settings.invoiceSettings.prefix,
        nextNumber: settings.invoiceSettings.nextNumber,
        defaultTaxRate: Number(settings.invoiceSettings.defaultTaxRate) || 18,
        defaultCurrency: settings.invoiceSettings.defaultCurrency,
        defaultTerms: settings.invoiceSettings.defaultTerms || '',
        defaultNotes: settings.invoiceSettings.defaultNotes || '',
        autoNumbering: settings.invoiceSettings.autoNumbering,
        paymentTerms: settings.invoiceSettings.paymentTerms,
      } : null;

      const communication: CommunicationSettings | null = settings.communicationSettings ? {
        whatsappEnabled: settings.communicationSettings.whatsappEnabled,
        emailEnabled: settings.communicationSettings.emailEnabled,
        smsEnabled: settings.communicationSettings.smsEnabled,
        email: settings.communicationSettings.email || '',
        whatsappNumber: settings.communicationSettings.whatsappNumber || '',
      } : null;

      const gateways: GatewaySettings | null = settings.gatewaySettings ? {
        razorpay: {
          status: settings.gatewaySettings.razorpayStatus?.toLowerCase() as 'connected' | 'disconnected',
        },
        paytm: {
          status: settings.gatewaySettings.paytmStatus?.toLowerCase() as 'connected' | 'disconnected',
        },
      } : null;

      set({
        company,
        bank,
        invoice,
        communication,
        gateways,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      set({ isLoading: false, isInitialized: true });
    }
  },

  updateCompany: async (data: Partial<CompanyInfo>) => {
    try {
      const updateData = {
        name: data.name,
        legalName: data.legalName,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        email: data.email,
        phone: data.phone,
        website: data.website,
        addressLine1: data.address?.line1,
        addressLine2: data.address?.line2,
        city: data.address?.city,
        state: data.address?.state,
        pincode: data.address?.pincode,
        country: data.address?.country,
        logo: data.logo,
        signature: data.signature,
        primaryColor: data.primaryColor,
        footerText: data.footerText,
        showLogo: data.showLogo,
      };
      await settingsApi.updateCompanyProfile(updateData);
      set((state) => ({
        company: state.company ? { ...state.company, ...data } : null,
      }));
    } catch (error) {
      throw error;
    }
  },

  updateBank: async (data: Partial<BankInfo>) => {
    try {
      await settingsApi.upsertBankInfo(data);
      set((state) => ({
        bank: state.bank ? { ...state.bank, ...data } : data as BankInfo,
      }));
    } catch (error) {
      throw error;
    }
  },

  updateInvoice: async (data: Partial<InvoiceSettings>) => {
    try {
      await settingsApi.updateInvoiceSettings(data);
      set((state) => ({
        invoice: state.invoice ? { ...state.invoice, ...data } : null,
      }));
    } catch (error) {
      throw error;
    }
  },

  updateCommunication: async (data: Partial<CommunicationSettings>) => {
    try {
      await settingsApi.updateCommunicationSettings(data);
      set((state) => ({
        communication: state.communication ? { ...state.communication, ...data } : null,
      }));
    } catch (error) {
      throw error;
    }
  },

  updateGateways: async (data: Partial<GatewaySettings>) => {
    set((state) => ({
      gateways: state.gateways ? { ...state.gateways, ...data } : null,
    }));
  },
}));
