import { communicationRepository } from '../repositories/communication.repository';
import { cache } from '../config/redis';
import { emitToCompany } from '../socket';
import config from '../config';
import prisma from '../config/database';
import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { CommunicationChannel, CommunicationStatus } from '@prisma/client';

interface SendCommunicationJob {
  companyId: string;
  userId?: string;
  channel: CommunicationChannel;
  recipient: string;
  recipientName: string;
  subject: string;
  body: string;
  templateId?: string;
  templateName?: string;
  relatedType?: string;
  relatedId?: string;
  customerId?: string;
}

class CommunicationService {
  private emailQueue: Queue<SendCommunicationJob>;
  private whatsappQueue: Queue<SendCommunicationJob>;
  private emailWorker: Worker<SendCommunicationJob> | null = null;
  private whatsappWorker: Worker<SendCommunicationJob> | null = null;

  constructor() {
    this.emailQueue = new Queue<SendCommunicationJob>(config.queues.email, {
      connection: redisConnection,
    });

    this.whatsappQueue = new Queue<SendCommunicationJob>(config.queues.whatsapp, {
      connection: redisConnection,
    });

    this.initializeWorkers();
  }

  private initializeWorkers() {
    // Email Worker
    this.emailWorker = new Worker<SendCommunicationJob>(
      config.queues.email,
      async (job: Job<SendCommunicationJob>) => {
        return this.processEmailJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    // WhatsApp Worker
    this.whatsappWorker = new Worker<SendCommunicationJob>(
      config.queues.whatsapp,
      async (job: Job<SendCommunicationJob>) => {
        return this.processWhatsAppJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );
  }

  private async processEmailJob(job: Job<SendCommunicationJob>) {
    const data = job.data;
    let log = await communicationRepository.createLog({
      companyId: data.companyId,
      channel: 'EMAIL',
      recipient: data.recipient,
      recipientName: data.recipientName,
      subject: data.subject,
      body: data.body,
      status: 'PENDING',
      templateId: data.templateId,
      templateName: data.templateName,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
      customerId: data.customerId,
    });

    try {
      // Simulate email sending (replace with actual email provider integration)
      // In production, integrate with SendGrid, AWS SES, or SMTP
      const emailConfig = config.email;

      // Log email send attempt
      if (config.app.env === 'development') {
        console.log(`[EMAIL] Sending to ${data.recipient}: ${data.subject}`);
      }

      // Simulate success (in production, call actual email service)
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sentAt = new Date();
      await communicationRepository.updateLogStatus(log.id, 'SENT', { sentAt });

      // Simulate delivery callback (in production, handle via webhook)
      setTimeout(async () => {
        const deliveredAt = new Date();
        await communicationRepository.updateLogStatus(log.id, 'DELIVERED', { deliveredAt });
        emitToCompany(data.companyId, 'communication:delivered', { id: log.id, channel: 'EMAIL' });
      }, 500);

      return { success: true, logId: log.id };
    } catch (error) {
      const failedReason = error instanceof Error ? error.message : 'Unknown error';
      await communicationRepository.updateLogStatus(log.id, 'FAILED', { failedReason });
      throw error;
    }
  }

  private async processWhatsAppJob(job: Job<SendCommunicationJob>) {
    const data = job.data;
    let log = await communicationRepository.createLog({
      companyId: data.companyId,
      channel: 'WHATSAPP',
      recipient: data.recipient,
      recipientName: data.recipientName,
      subject: data.subject,
      body: data.body,
      status: 'PENDING',
      templateId: data.templateId,
      templateName: data.templateName,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
      customerId: data.customerId,
    });

    try {
      // Simulate WhatsApp sending (replace with actual WhatsApp Business API)
      if (config.app.env === 'development') {
        console.log(`[WHATSAPP] Sending to ${data.recipient}: ${data.subject}`);
      }

      // Simulate success
      await new Promise((resolve) => setTimeout(resolve, 100));

      const sentAt = new Date();
      await communicationRepository.updateLogStatus(log.id, 'SENT', { sentAt });

      // Simulate delivery
      setTimeout(async () => {
        const deliveredAt = new Date();
        await communicationRepository.updateLogStatus(log.id, 'DELIVERED', { deliveredAt });
        emitToCompany(data.companyId, 'communication:delivered', { id: log.id, channel: 'WHATSAPP' });
      }, 500);

      return { success: true, logId: log.id };
    } catch (error) {
      const failedReason = error instanceof Error ? error.message : 'Unknown error';
      await communicationRepository.updateLogStatus(log.id, 'FAILED', { failedReason });
      throw error;
    }
  }

  private getCacheKey(companyId: string, suffix: string): string {
    return `${config.redis.prefix}communication:${companyId}:${suffix}`;
  }

  private async invalidateCache(companyId: string): Promise<void> {
    await cache.delPattern(`${config.redis.prefix}communication:${companyId}:*`);
  }

  // Templates
  async getTemplates(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'templates');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const templates = await communicationRepository.getTemplates(companyId);
    await cache.set(cacheKey, templates, 300);
    return templates;
  }

  async getTemplate(id: string, companyId: string) {
    return communicationRepository.getTemplate(id, companyId);
  }

  async createTemplate(companyId: string, userId: string, data: {
    name: string;
    channel: CommunicationChannel;
    subject?: string;
    body: string;
    variables?: string[];
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    const template = await communicationRepository.createTemplate({
      companyId,
      ...data,
      variables: data.variables || [],
    });

    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'CREATE',
        module: 'Communication',
        entityId: template.id,
        entityName: data.name,
        description: `Created ${data.channel} template: ${data.name}`,
      },
    }).catch(() => {});

    return template;
  }

  async updateTemplate(id: string, companyId: string, userId: string, data: {
    name?: string;
    subject?: string;
    body?: string;
    variables?: string[];
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    await communicationRepository.updateTemplate(id, companyId, data);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Communication',
        entityId: id,
        entityName: data.name || 'Template',
        description: 'Updated communication template',
      },
    }).catch(() => {});

    return communicationRepository.getTemplate(id, companyId);
  }

  async deleteTemplate(id: string, companyId: string, userId: string) {
    const template = await communicationRepository.getTemplate(id, companyId);
    if (!template) return null;

    await communicationRepository.deleteTemplate(id, companyId);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'DELETE',
        module: 'Communication',
        entityId: id,
        entityName: template.name,
        description: `Deleted ${template.channel} template: ${template.name}`,
      },
    }).catch(() => {});

    return true;
  }

  async setDefaultTemplate(id: string, companyId: string, userId: string, channel: CommunicationChannel) {
    await communicationRepository.setDefaultTemplate(id, companyId, channel);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Communication',
        entityId: id,
        entityName: 'Default Template',
        description: `Set default ${channel} template`,
      },
    }).catch(() => {});

    return communicationRepository.getTemplate(id, companyId);
  }

  // Communication Logs
  async getLogs(companyId: string, params: {
    search?: string;
    channel?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    return communicationRepository.getLogs(companyId, {
      search: params.search,
      channel: params.channel,
      status: params.status,
      page,
      limit,
    });
  }

  async getLog(id: string, companyId: string) {
    return communicationRepository.getLog(id, companyId);
  }

  // Send Communications
  async sendEmail(companyId: string, userId: string | undefined, data: {
    recipient: string;
    recipientName: string;
    subject: string;
    body: string;
    templateId?: string;
    templateName?: string;
    relatedType?: string;
    relatedId?: string;
    customerId?: string;
  }) {
    const job = await this.emailQueue.add('send-email', {
      companyId,
      userId,
      channel: 'EMAIL',
      ...data,
    });

    await this.invalidateCache(companyId);

    emitToCompany(companyId, 'communication:queued', {
      jobId: job.id,
      channel: 'EMAIL',
      recipient: data.recipient,
    });

    return { jobId: job.id, status: 'queued' };
  }

  async sendWhatsApp(companyId: string, userId: string | undefined, data: {
    recipient: string;
    recipientName: string;
    subject: string;
    body: string;
    templateId?: string;
    templateName?: string;
    relatedType?: string;
    relatedId?: string;
    customerId?: string;
  }) {
    const job = await this.whatsappQueue.add('send-whatsapp', {
      companyId,
      userId,
      channel: 'WHATSAPP',
      ...data,
    });

    await this.invalidateCache(companyId);

    emitToCompany(companyId, 'communication:queued', {
      jobId: job.id,
      channel: 'WHATSAPP',
      recipient: data.recipient,
    });

    return { jobId: job.id, status: 'queued' };
  }

  async sendInvoiceEmail(companyId: string, userId: string | undefined, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get default email template
    const template = await prisma.messageTemplate.findFirst({
      where: { companyId, channel: 'EMAIL', isActive: true, isDefault: true },
    });

    let subject = `Invoice ${invoice.number}`;
    let body = `Dear ${invoice.customer.name},\n\nPlease find attached invoice ${invoice.number}.\n\nTotal: ₹${invoice.total}\nDue Date: ${invoice.dueDate}\n\nThank you for your business.`;

    if (template) {
      subject = template.subject || subject;
      body = template.body
        .replace(/\{\{customer_name\}\}/g, invoice.customer.name)
        .replace(/\{\{invoice_number\}\}/g, invoice.number)
        .replace(/\{\{amount\}\}/g, invoice.total.toString())
        .replace(/\{\{due_date\}\}/g, invoice.dueDate.toISOString().split('T')[0] || '');
    }

    return this.sendEmail(companyId, userId, {
      recipient: invoice.customer.email,
      recipientName: invoice.customer.name,
      subject,
      body,
      templateId: template?.id,
      templateName: template?.name || undefined,
      relatedType: 'invoice',
      relatedId: invoiceId,
      customerId: invoice.customerId,
    });
  }

  async sendPaymentReminderWhatsApp(companyId: string, userId: string | undefined, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { customer: true },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Get default WhatsApp template
    const template = await prisma.messageTemplate.findFirst({
      where: { companyId, channel: 'WHATSAPP', isActive: true, isDefault: true },
    });

    let subject = 'Payment Reminder';
    let body = `Hi ${invoice.customer.name}, this is a reminder that invoice ${invoice.number} for ₹${invoice.total} is due. Please process payment.`;

    if (template) {
      subject = template.subject || subject;
      body = template.body
        .replace(/\{\{customer_name\}\}/g, invoice.customer.name)
        .replace(/\{\{invoice_number\}\}/g, invoice.number)
        .replace(/\{\{amount\}\}/g, invoice.total.toString())
        .replace(/\{\{due_date\}\}/g, invoice.dueDate.toISOString().split('T')[0] || '');
    }

    const whatsappNumber = invoice.customer.whatsapp || invoice.customer.mobile;

    return this.sendWhatsApp(companyId, userId, {
      recipient: whatsappNumber,
      recipientName: invoice.customer.name,
      subject,
      body,
      templateId: template?.id,
      templateName: template?.name,
      relatedType: 'invoice',
      relatedId: invoiceId,
      customerId: invoice.customerId,
    });
  }

  // Stats
  async getStats(companyId: string, startDate?: Date, endDate?: Date) {
    const cacheKey = this.getCacheKey(companyId, `stats:${startDate?.getTime() || 'all'}:${endDate?.getTime() || 'all'}`);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const stats = await communicationRepository.getStats(companyId, startDate, endDate);
    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  // Queue status
  async getQueueStatus() {
    const [emailWaiting, whatsappWaiting] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.whatsappQueue.getWaitingCount(),
    ]);

    return {
      email: { waiting: emailWaiting },
      whatsapp: { waiting: whatsappWaiting },
    };
  }
}

export const communicationService = new CommunicationService();
