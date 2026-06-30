import { Worker, Job } from 'bullmq';
import logger from '../utils/logger';

interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, unknown>;
  companyId: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

export function createEmailWorker(): Worker<EmailJobData> {
  const connection = {
    host: 'localhost',
    port: 6379,
  };

  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      const { to, subject, template, context, companyId, attachments } = job.data;

      logger.info('Processing email job', {
        jobId: job.id,
        to,
        subject,
        template,
        companyId,
      });

      try {
        const { emailService } = await import('../services/email.service');
        await emailService.send({
          to,
          subject,
          template,
          context,
          attachments,
        });

        logger.info('Email sent successfully', { jobId: job.id });
        return { success: true };
      } catch (error) {
        logger.error('Failed to send email', {
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.debug('Email job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('Email job failed', {
      jobId: job?.id,
      error: err.message,
      attemptsMade: job?.attemptsMade,
    });
  });

  return worker;
}
