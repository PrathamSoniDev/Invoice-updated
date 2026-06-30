import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  html?: string;
  text?: string;
  context?: Record<string, unknown>;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (config.email.provider === 'log') {
      return;
    }

    if (config.email.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp?.host,
        port: config.email.smtp?.port,
        secure: config.email.smtp?.secure,
        auth: config.email.smtp?.auth,
      });
    }

    if (config.email.provider === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: config.email.sendgrid?.apiKey,
        },
      });
    }
  }

  async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    const { to, subject, template, html, text, context, attachments } = options;

    let htmlContent = html;
    let textContent = text;

    if (template && !html) {
      htmlContent = await this.renderTemplate(template, context || {});
    }

    if (config.email.provider === 'log') {
      logger.info('Email (log mode)', {
        to,
        subject,
        template,
        hasHtml: !!htmlContent,
        hasText: !!textContent,
      });
      return { messageId: `log-${Date.now()}` };
    }

    if (!this.transporter) {
      throw new Error('Email transporter not configured');
    }

    const mailOptions = {
      from: config.email.from,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html: htmlContent,
      text: textContent,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    };

    const result = await this.transporter.sendMail(mailOptions);
    return { messageId: result.messageId };
  }

  private async renderTemplate(
    template: string,
    context: Record<string, unknown>
  ): Promise<string> {
    const templates: Record<string, string> = {
      'welcome': `
        <h1>Welcome to InvoiceGen!</h1>
        <p>Hello {{name}},</p>
        <p>Thank you for registering. Your account is now active.</p>
        <p>Best regards,<br>The InvoiceGen Team</p>
      `,
      'password-reset': `
        <h1>Password Reset Request</h1>
        <p>Hello {{name}},</p>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <p><a href="{{resetLink}}">Reset Password</a></p>
        <p>This link will expire in {{expiryHours}} hours.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>The InvoiceGen Team</p>
      `,
      'invoice-created': `
        <h1>New Invoice: {{invoiceNumber}}</h1>
        <p>Hello {{customerName}},</p>
        <p>A new invoice has been created for you.</p>
        <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
        <p><strong>Amount:</strong> {{amount}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
        <p><a href="{{invoiceLink}}">View Invoice</a></p>
        <p>Best regards,<br>{{companyName}}</p>
      `,
      'payment-received': `
        <h1>Payment Received</h1>
        <p>Hello {{customerName}},</p>
        <p>We have received your payment of {{amount}}.</p>
        <p><strong>Invoice:</strong> {{invoiceNumber}}</p>
        <p><strong>Payment Date:</strong> {{paymentDate}}</p>
        <p>Thank you for your business!</p>
        <p>Best regards,<br>{{companyName}}</p>
      `,
    };

    let content = templates[template] || `<p>${template}</p>`;

    for (const [key, value] of Object.entries(context)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    return content;
  }

  async sendInvoiceEmail(
    to: string,
    data: {
      invoiceNumber: string;
      customerName: string;
      amount: string;
      dueDate: string;
      invoiceLink: string;
      companyName: string;
    },
    attachments?: Array<{ filename: string; content: Buffer | string }>
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      subject: `Invoice ${data.invoiceNumber} from ${data.companyName}`,
      template: 'invoice-created',
      context: data,
      attachments,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    data: {
      name: string;
      resetLink: string;
      expiryHours: number;
    }
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: data,
    });
  }

  async sendWelcomeEmail(
    to: string,
    data: { name: string }
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      subject: 'Welcome to InvoiceGen',
      template: 'welcome',
      context: data,
    });
  }
}

export const emailService = new EmailService();
