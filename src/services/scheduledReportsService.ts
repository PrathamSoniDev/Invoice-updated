import { supabase } from '@/lib/supabase';
import { getCurrentCompanyId, getCurrentUserId } from '@/lib/database';

export type ReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduledReportType = 'overview' | 'invoices' | 'customers' | 'payments' | 'tax';

export interface ScheduledReport {
  id: string;
  reportType: ScheduledReportType;
  filters: Record<string, unknown>;
  frequency: ReportFrequency;
  recipientEmails: string[];
  isActive: boolean;
  lastSentAt: string | null;
  nextSendAt: string;
  createdAt: string;
}

function transform(row: Record<string, unknown>): ScheduledReport {
  return {
    id: row.id as string,
    reportType: row.reportType as ScheduledReportType,
    filters: (row.filters as Record<string, unknown>) || {},
    frequency: row.frequency as ReportFrequency,
    recipientEmails: (row.recipientEmails as string[]) || [],
    isActive: row.isActive as boolean,
    lastSentAt: row.lastSentAt as string | null,
    nextSendAt: row.nextSendAt as string,
    createdAt: row.createdAt as string,
  };
}

function computeNextSendAt(frequency: ReportFrequency, from: Date = new Date()): string {
  const next = new Date(from);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

export const scheduledReportsService = {
  /** All schedules for the current company, most recently created first. */
  async list(): Promise<ScheduledReport[]> {
    const companyId = await getCurrentCompanyId();
    const { data, error } = await supabase
      .from('scheduled_reports')
      .select('*')
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data || []).map(transform);
  },

  async create(input: {
    reportType: ScheduledReportType;
    filters: Record<string, unknown>;
    frequency: ReportFrequency;
    recipientEmails: string[];
  }): Promise<ScheduledReport> {
    if (input.recipientEmails.length === 0) {
      throw new Error('Add at least one recipient email');
    }

    const companyId = await getCurrentCompanyId();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        companyId,
        userId,
        reportType: input.reportType,
        filters: input.filters,
        frequency: input.frequency,
        recipientEmails: input.recipientEmails,
        nextSendAt: computeNextSendAt(input.frequency),
      })
      .select()
      .single();

    if (error) throw error;
    return transform(data);
  },

  async update(id: string, input: Partial<{
    frequency: ReportFrequency;
    recipientEmails: string[];
    filters: Record<string, unknown>;
    isActive: boolean;
  }>): Promise<ScheduledReport> {
    const updateData: Record<string, unknown> = { ...input, updatedAt: new Date().toISOString() };
    if (input.frequency) {
      updateData.nextSendAt = computeNextSendAt(input.frequency);
    }

    const { data, error } = await supabase
      .from('scheduled_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transform(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('scheduled_reports').delete().eq('id', id);
    if (error) throw error;
  },
};
