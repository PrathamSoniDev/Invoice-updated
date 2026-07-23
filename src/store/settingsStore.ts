 
import { create } from 'zustand';
import type {
  CompanyInfo,
  BankInfo,
  InvoiceSettings,
  CommunicationSettings,
  GatewaySettings,
  GatewayCredentialsUpdate,
} from '@/types';
import { settingsApi } from '@/utils/api';

const defaultBank: BankInfo = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
  upiId: '',
};

const defaultInvoice: InvoiceSettings = {
  prefix: 'INV',
  nextNumber: 1001,
  defaultTaxRate: 18,
  defaultCurrency: 'INR',
  defaultTerms: '',
  defaultNotes: '',
  autoNumbering: true,
  paymentTerms: 30,
};

const defaultCommunication: CommunicationSettings = {
  whatsappEnabled: false,
  emailEnabled: true,
  smsEnabled: false,
  email: '',
  whatsappNumber: '',
};

const defaultGateways: GatewaySettings = {
  razorpay: {
    status: 'disconnected',
    keyId: '',
    keySecretPreview: null,
    webhookSecret: '',
    upiId: '',
    connectionMethod: 'manual',
    oauth: null,
  },
  paytm: { status: 'disconnected', merchantId: '', merchantKeyPreview: null, environment: 'TEST', upiId: '' },
};

interface SettingsState {
  company: CompanyInfo | null;
  bank: BankInfo | null;
  invoice: InvoiceSettings | null;
  communication: CommunicationSettings | null;
  gateways: GatewaySettings | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateCompany: (data: Partial<CompanyInfo>) => Promise<void>;
  updateBank: (data: Partial<BankInfo>) => Promise<void>;
  updateInvoice: (data: Partial<InvoiceSettings>) => Promise<void>;
  updateCommunication: (data: Partial<CommunicationSettings>) => Promise<void>;
  updateGateways: (data: GatewayCredentialsUpdate) => Promise<void>;
  refreshGateways: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  company: null,
  bank: null,
  invoice: null,
  communication: null,
  gateways: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  fetchSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const settings = await settingsApi.getCompleteSettings();

      const company: CompanyInfo | null = settings.company ?? null;
      const bank: BankInfo = { ...defaultBank, ...(settings.bankInfo ?? {}) };
      const invoice: InvoiceSettings = { ...defaultInvoice, ...(settings.invoiceSettings ?? {}) };
      const communication: CommunicationSettings = { ...defaultCommunication, ...(settings.communicationSettings ?? {}) };
      const gateways: GatewaySettings = {
        razorpay: {
          ...defaultGateways.razorpay,
          ...(settings.gatewaySettings?.razorpay ?? {}),
        },
        paytm: {
          ...defaultGateways.paytm,
          ...(settings.gatewaySettings?.paytm ?? {}),
        },
      };

      set({
        company,
        bank,
        invoice,
        communication,
        gateways,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        isInitialized: true,
        error: error instanceof Error ? error.message : 'Unable to load settings',
      });
    }
  },

  updateCompany: async (data: Partial<CompanyInfo>) => {
    await settingsApi.updateCompanyProfile(data);
    set((state) => ({
      company: state.company ? { ...state.company, ...data } : null,
    }));
  },

  updateBank: async (data: Partial<BankInfo>) => {
    const bank = await settingsApi.upsertBankInfo(data);
    set({ bank: { ...defaultBank, ...bank } });
  },

  updateInvoice: async (data: Partial<InvoiceSettings>) => {
    const invoice = await settingsApi.updateInvoiceSettings(data);
    set({ invoice: { ...defaultInvoice, ...invoice } });
  },

  updateCommunication: async (data: Partial<CommunicationSettings>) => {
    const communication = await settingsApi.updateCommunicationSettings(data);
    set({ communication: { ...defaultCommunication, ...communication } });
  },

  updateGateways: async (data: GatewayCredentialsUpdate) => {
    const gateways = await settingsApi.updateGatewaySettings(data);
    set({ gateways });
  },

  // Used after returning from the Razorpay OAuth redirect (and after
  // "Disconnect") to pick up the freshly-changed connectionMethod/oauth
  // status without refetching every other settings section.
  refreshGateways: async () => {
    const gateways = await settingsApi.getGatewaySettings();
    if (gateways) set({ gateways });
  },
}));
