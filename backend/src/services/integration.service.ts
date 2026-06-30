import { integrationRepository } from '../repositories/integration.repository';
import { cache } from '../config/redis';
import { emitToCompany } from '../socket';
import config from '../config';
import prisma from '../config/database';
import crypto from 'crypto';
import { IntegrationStatus, SyncStatus, IntegrationProvider } from '@prisma/client';
import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';

interface SyncJob {
  integrationId: string;
  companyId: string;
  syncType: 'manual' | 'scheduled';
  entityTypes: string[];
}

class IntegrationService {
  private syncQueue: Queue<SyncJob>;
  private syncWorker: Worker<SyncJob> | null = null;

  constructor() {
    this.syncQueue = new Queue<SyncJob>(config.queues.sync, {
      connection: redisConnection,
    });

    this.initializeWorker();
  }

  private initializeWorker() {
    this.syncWorker = new Worker<SyncJob>(
      config.queues.sync,
      async (job: Job<SyncJob>) => {
        return this.processSyncJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 3,
      }
    );
  }

  private getEncryptionKey(): string {
    return config.security.gatewayEncryptionKey.padEnd(32, '0').slice(0, 32);
  }

  private encrypt(text: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const key = this.getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 2) throw new Error('Invalid encrypted text format');
    const iv = Buffer.from(parts[0]!, 'hex');
    const encrypted = parts[1]!;
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  private async processSyncJob(job: Job<SyncJob>) {
    const { integrationId, companyId, syncType, entityTypes } = job.data;

    const integration = await integrationRepository.findById(integrationId, companyId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const results: { entityType: string; status: string; recordsCount: number; error?: string }[] = [];

    for (const entityType of entityTypes) {
      const syncHistory = await integrationRepository.createSyncHistory({
        integrationId,
        syncType,
        entityType,
        status: 'RUNNING',
      });

      try {
        // Simulate sync (in production, implement actual API calls to each provider)
        await integrationRepository.createLog(integrationId, 'info', `Starting ${entityType} sync`);

        // Simulate processing
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        const recordsCount = Math.floor(Math.random() * 100);

        await integrationRepository.updateSyncHistory(syncHistory.id, {
          status: 'COMPLETED',
          recordsCount,
          completedAt: new Date(),
        });

        await integrationRepository.createLog(integrationId, 'info', `Completed ${entityType} sync: ${recordsCount} records`);

        results.push({ entityType, status: 'completed', recordsCount });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await integrationRepository.updateSyncHistory(syncHistory.id, {
          status: 'FAILED',
          errorMessage,
          completedAt: new Date(),
        });

        await integrationRepository.createLog(integrationId, 'error', `Failed ${entityType} sync: ${errorMessage}`);

        results.push({ entityType, status: 'failed', recordsCount: 0, error: errorMessage });
      }
    }

    await integrationRepository.update(integrationId, companyId, {
      lastSyncAt: new Date(),
    });

    emitToCompany(companyId, 'integration:synced', { integrationId, results });

    return results;
  }

  private getCacheKey(companyId: string, suffix: string): string {
    return `${config.redis.prefix}integrations:${companyId}:${suffix}`;
  }

  private async invalidateCache(companyId: string): Promise<void> {
    await cache.delPattern(`${config.redis.prefix}integrations:${companyId}:*`);
  }

  async getIntegrations(companyId: string, params: { search?: string; status?: string; provider?: string }) {
    const cacheKey = this.getCacheKey(companyId, `list:${params.status || 'all'}:${params.provider || 'all'}`);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const integrations = await integrationRepository.findMany(companyId, params);
    await cache.set(cacheKey, integrations, 60);
    return integrations;
  }

  async getIntegration(id: string, companyId: string) {
    return integrationRepository.findById(id, companyId);
  }

  async createIntegration(companyId: string, userId: string, data: {
    name: string;
    provider: string;
    description?: string;
    config: {
      apiUrl?: string;
      username?: string;
      password?: string;
      apiKey?: string;
      apiSecret?: string;
      companyCode?: string;
      [key: string]: unknown;
    };
    syncOptions: {
      customers?: boolean;
      invoices?: boolean;
      products?: boolean;
      taxes?: boolean;
      payments?: boolean;
      chartOfAccounts?: boolean;
    };
  }) {
    // Encrypt sensitive fields
    const encryptedConfig: Record<string, unknown> = { ...data.config };
    if (data.config.password) {
      encryptedConfig.password = this.encrypt(data.config.password);
    }
    if (data.config.apiSecret) {
      encryptedConfig.apiSecret = this.encrypt(data.config.apiSecret);
    }

    const integration = await integrationRepository.create({
      companyId,
      name: data.name,
      provider: data.provider as IntegrationProvider,
      description: data.description,
      status: 'PENDING',
      config: encryptedConfig,
      syncOptions: data.syncOptions,
    });

    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'CREATE',
        module: 'Integrations',
        entityId: integration.id,
        entityName: data.name,
        description: `Created ${data.provider} integration`,
      },
    }).catch(() => {});

    return integration;
  }

  async updateIntegration(id: string, companyId: string, userId: string, data: {
    name?: string;
    description?: string;
    config?: Record<string, unknown>;
    syncOptions?: Record<string, boolean>;
  }) {
    // Encrypt sensitive fields if present
    if (data.config) {
      const encryptedConfig: Record<string, unknown> = { ...data.config };
      if (data.config.password) {
        encryptedConfig.password = this.encrypt(data.config.password as string);
      }
      if (data.config.apiSecret) {
        encryptedConfig.apiSecret = this.encrypt(data.config.apiSecret as string);
      }
      data.config = encryptedConfig;
    }

    await integrationRepository.update(id, companyId, data);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Integrations',
        entityId: id,
        entityName: data.name || 'Integration',
        description: 'Updated integration settings',
      },
    }).catch(() => {});

    return integrationRepository.findById(id, companyId);
  }

  async deleteIntegration(id: string, companyId: string, userId: string) {
    const integration = await integrationRepository.findById(id, companyId);
    if (!integration) return null;

    await integrationRepository.delete(id, companyId);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'DELETE',
        module: 'Integrations',
        entityId: id,
        entityName: integration.name,
        description: `Deleted ${integration.provider} integration`,
      },
    }).catch(() => {});

    return true;
  }

  async testConnection(id: string, companyId: string): Promise<{ success: boolean; message: string }> {
    const integration = await integrationRepository.findById(id, companyId);
    if (!integration) {
      return { success: false, message: 'Integration not found' };
    }

    try {
      // In production, implement actual connection tests for each provider
      const config = integration.config as Record<string, unknown>;

      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Update status
      await integrationRepository.update(id, companyId, { status: 'CONNECTED' });
      await integrationRepository.createLog(id, 'info', 'Connection test successful');

      await this.invalidateCache(companyId);

      return { success: true, message: `Successfully connected to ${integration.provider}` };
    } catch (error) {
      await integrationRepository.update(id, companyId, { status: 'ERROR' });
      await integrationRepository.createLog(id, 'error', `Connection test failed: ${error}`);

      await this.invalidateCache(companyId);

      return { success: false, message: 'Failed to connect. Check credentials.' };
    }
  }

  async startSync(id: string, companyId: string, userId: string | undefined, data: { syncType: 'manual' | 'scheduled'; entityTypes: string[] }) {
    const integration = await integrationRepository.findById(id, companyId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.status !== 'CONNECTED') {
      throw new Error('Integration must be connected before syncing');
    }

    // Determine enabled entity types from sync options
    const syncOptions = integration.syncOptions as Record<string, boolean>;
    const enabledTypes = data.entityTypes.filter((type) => {
      const key = type === 'chartOfAccounts' ? 'chartOfAccounts' : type;
      return syncOptions[key] !== false;
    });

    if (enabledTypes.length === 0) {
      throw new Error('No entity types enabled for sync');
    }

    const job = await this.syncQueue.add('sync', {
      integrationId: id,
      companyId,
      syncType: data.syncType,
      entityTypes: enabledTypes,
    });

    await integrationRepository.createLog(id, 'info', `Started ${data.syncType} sync for: ${enabledTypes.join(', ')}`);

    emitToCompany(companyId, 'integration:syncStarted', { integrationId: id, job: job.id });

    return { jobId: job.id, entityTypes: enabledTypes };
  }

  async getLogs(id: string, companyId: string, params: { level?: string; page?: number; limit?: number }) {
    const integration = await integrationRepository.findById(id, companyId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    return integrationRepository.getLogs(id, {
      level: params.level,
      page: params.page || 1,
      limit: params.limit || 20,
    });
  }

  async getSyncHistory(id: string, companyId: string, params: { entityType?: string; status?: string; page?: number; limit?: number }) {
    const integration = await integrationRepository.findById(id, companyId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    return integrationRepository.getSyncHistory(id, {
      entityType: params.entityType,
      status: params.status,
      page: params.page || 1,
      limit: params.limit || 20,
    });
  }

  async getQueueStatus() {
    const waiting = await this.syncQueue.getWaitingCount();
    const active = await this.syncQueue.getActiveCount();

    return { waiting, active };
  }
}

export const integrationService = new IntegrationService();
