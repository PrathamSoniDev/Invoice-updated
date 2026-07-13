import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId } from '@/lib/database';

// Storage bucket names
const BUCKETS = {
  COMPANY_LOGOS: 'company-logos',
  SIGNATURES: 'signatures',
  INVOICE_TEMPLATES: 'invoice-templates',
  INVOICE_PDFS: 'invoice-pdfs',
  ATTACHMENTS: 'attachments',
  EXPORTS: 'exports',
} as const;

export const storageService = {
  // Initialize storage buckets (call once during setup)
  async initializeBuckets(): Promise<void> {
    const buckets = Object.values(BUCKETS);

    for (const bucket of buckets) {
      try {
        const { data: existing } = await supabase.storage.getBucket(bucket);
        if (!existing) {
          await supabase.storage.createBucket(bucket, {
            public: bucket === 'company-logos',
            fileSizeLimit: bucket === 'exports' ? 52428800 : 10485760, // 50MB for exports, 10MB for others
          });
        }
      } catch {
        console.log(`Bucket ${bucket} may already exist or cannot be created`);
      }
    }
  },

  // Upload company logo
  async uploadCompanyLogo(file: File): Promise<string> {
    const companyId = await getCurrentCompanyId();
    const ext = file.name.split('.').pop() || 'png';
    const path = `${companyId}/logo.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKETS.COMPANY_LOGOS)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from(BUCKETS.COMPANY_LOGOS)
      .getPublicUrl(path);

    // Update company record with logo URL
    await supabase
      .from('companies')
      .update({ logo: data.publicUrl })
      .eq('id', companyId);

    return data.publicUrl;
  },

  // Upload signature
  async uploadSignature(file: File): Promise<string> {
    const companyId = await getCurrentCompanyId();
    const ext = file.name.split('.').pop() || 'png';
    const path = `${companyId}/signature.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKETS.SIGNATURES)
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from(BUCKETS.SIGNATURES)
      .getPublicUrl(path);

    // Update company record with signature URL
    await supabase
      .from('companies')
      .update({ signature: data.publicUrl })
      .eq('id', companyId);

    return data.publicUrl;
  },

  // Upload invoice PDF
  async uploadInvoicePDF(invoiceId: string, pdfBlob: Blob): Promise<string> {
    const companyId = await getCurrentCompanyId();
    const path = `${companyId}/${invoiceId}.pdf`;

    const { error } = await supabase.storage
      .from(BUCKETS.INVOICE_PDFS)
      .upload(path, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) throw error;

    const { data, error: urlError } = await supabase.storage
      .from(BUCKETS.INVOICE_PDFS)
      .createSignedUrl(path, 86400 * 7); // 7 days

    if (urlError) throw urlError;
    return data.signedUrl;
  },

  // Upload export file
  async uploadExport(exportId: string, content: string | Blob, format: string): Promise<string> {
    const companyId = await getCurrentCompanyId();
    const path = `${companyId}/${exportId}.${format}`;

    const blob = typeof content === 'string' ? new Blob([content], { type: 'text/plain' }) : content;

    const { error } = await supabase.storage
      .from(BUCKETS.EXPORTS)
      .upload(path, blob, { upsert: true });

    if (error) throw error;

    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKETS.EXPORTS)
      .createSignedUrl(path, 86400); // 24 hours

    if (urlError) throw urlError;

    // Update export history
    await supabase
      .from('export_history')
      .update({
        fileUrl: urlData.signedUrl,
        fileSize: blob.size,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      })
      .eq('id', exportId);

    return urlData.signedUrl;
  },

  // Get download URL for a file
  async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },

  // Delete a file
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  },

  // List files in a directory
  async listFiles(bucket: string, path: string): Promise<string[]> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);

    if (error) throw error;
    return (data || []).map((f) => f.name);
  },

  // Download a file
  async downloadFile(bucket: string, path: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  },

  // Upload attachment
  async uploadAttachment(file: File, entityType: string, entityId: string): Promise<string> {
    const companyId = await getCurrentCompanyId();
    const path = `${companyId}/${entityType}/${entityId}/${file.name}`;

    const { error } = await supabase.storage
      .from(BUCKETS.ATTACHMENTS)
      .upload(path, file);

    if (error) throw error;

    const { data: urlData, error: urlError } = await supabase.storage
      .from(BUCKETS.ATTACHMENTS)
      .createSignedUrl(path, 86400 * 30); // 30 days

    if (urlError) throw urlError;
    return urlData.signedUrl;
  },
};

export const BUCKET_NAMES = BUCKETS;

// Legacy localStorage functions
export const APP_VERSION = '1.0.0';
const STORAGE_VERSION_KEY = 'invoicegen-version';

const knownKeys = [
  'invoicegen-auth',
  'invoicegen-settings',
  'invoicegen-modules',
  'invoicegen-theme',
];

export function initLocalStorage(): void {
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);

  if (storedVersion !== APP_VERSION) {
    knownKeys.forEach((key) => {
      localStorage.removeItem(key);
    });
    localStorage.setItem(STORAGE_VERSION_KEY, APP_VERSION);
  }
}

export function clearAllStorage(): void {
  knownKeys.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(STORAGE_VERSION_KEY);
}
