import { templateRepository } from '../repositories/template.repository';
import { cache } from '../config/redis';
import { emitToCompany } from '../socket';
import config from '../config';
import prisma from '../config/database';
import { TemplateStatus, TemplateType } from '@prisma/client';

class TemplateService {
  private getCacheKey(companyId: string, suffix: string): string {
    return `${config.redis.prefix}templates:${companyId}:${suffix}`;
  }

  private async invalidateCache(companyId: string): Promise<void> {
    await cache.delPattern(`${config.redis.prefix}templates:${companyId}:*`);
  }

  async getTemplates(companyId: string, params: { search?: string; status?: string; type?: string }) {
    const cacheKey = this.getCacheKey(companyId, `list:${params.status || 'all'}:${params.type || 'all'}`);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const templates = await templateRepository.findMany(companyId, params);
    await cache.set(cacheKey, templates, 300);
    return templates;
  }

  async getTemplate(id: string, companyId: string) {
    return templateRepository.findById(id, companyId);
  }

  async getDefaultTemplate(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'default');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const template = await templateRepository.findDefault(companyId);
    if (template) {
      await cache.set(cacheKey, template, 300);
    }
    return template;
  }

  async createTemplate(companyId: string, userId: string, data: {
    name: string;
    type: TemplateType;
    version?: string;
    content?: string;
    config?: Record<string, unknown>;
    status?: TemplateStatus;
    isDefault?: boolean;
  }) {
    // Check if template with same name exists
    const existing = await prisma.invoiceTemplate.findFirst({
      where: { companyId, name: data.name, deletedAt: null },
    });

    if (existing) {
      throw new Error('Template with this name already exists');
    }

    const template = await templateRepository.create({
      companyId,
      name: data.name,
      type: data.type,
      version: data.version || '1.0.0',
      content: data.content,
      config: data.config,
      status: data.status || 'DRAFT',
      isDefault: data.isDefault || false,
      uploadedById: userId,
    });

    // Create initial version
    await templateRepository.createVersion(template.id, {
      version: template.version,
      content: template.content || undefined,
      config: template.config as Record<string, unknown> | undefined,
      uploadedById: userId,
    });

    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'CREATE',
        module: 'Templates',
        entityId: template.id,
        entityName: data.name,
        description: `Created invoice template: ${data.name}`,
      },
    }).catch(() => {});

    return template;
  }

  async updateTemplate(id: string, companyId: string, userId: string, data: {
    name?: string;
    content?: string;
    config?: Record<string, unknown>;
    status?: TemplateStatus;
  }) {
    const template = await templateRepository.findById(id, companyId);
    if (!template) {
      return null;
    }

    // If content changed, create new version
    if (data.content && data.content !== template.content) {
      const versions = await templateRepository.getVersions(id);
      const newVersion = this.incrementVersion(template.version);

      await templateRepository.createVersion(id, {
        version: newVersion,
        content: data.content,
        config: data.config,
        uploadedById: userId,
      });

      await prisma.invoiceTemplate.update({
        where: { id },
        data: { version: newVersion },
      });
    }

    await templateRepository.update(id, companyId, data);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Templates',
        entityId: id,
        entityName: data.name || template.name,
        description: 'Updated invoice template',
      },
    }).catch(() => {});

    return templateRepository.findById(id, companyId);
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  async deleteTemplate(id: string, companyId: string, userId: string) {
    const template = await templateRepository.findById(id, companyId);
    if (!template) return null;

    if (template.isDefault) {
      throw new Error('Cannot delete default template. Set another template as default first.');
    }

    await templateRepository.softDelete(id, companyId);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'DELETE',
        module: 'Templates',
        entityId: id,
        entityName: template.name,
        description: `Deleted invoice template: ${template.name}`,
      },
    }).catch(() => {});

    return true;
  }

  async setAsDefault(id: string, companyId: string, userId: string) {
    const template = await templateRepository.findById(id, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (template.status !== 'ACTIVE') {
      throw new Error('Only active templates can be set as default');
    }

    await templateRepository.setAsDefault(id, companyId);
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Templates',
        entityId: id,
        entityName: template.name,
        description: `Set template as default: ${template.name}`,
      },
    }).catch(() => {});

    return templateRepository.findById(id, companyId);
  }

  async activateTemplate(id: string, companyId: string, userId: string) {
    await templateRepository.update(id, companyId, { status: 'ACTIVE' });
    await this.invalidateCache(companyId);

    const template = await templateRepository.findById(id, companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Templates',
        entityId: id,
        entityName: template?.name || 'Template',
        description: 'Activated invoice template',
      },
    }).catch(() => {});

    return template;
  }

  async deactivateTemplate(id: string, companyId: string, userId: string) {
    const template = await templateRepository.findById(id, companyId);
    if (template?.isDefault) {
      throw new Error('Cannot deactivate default template');
    }

    await templateRepository.update(id, companyId, { status: 'DISABLED' });
    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Templates',
        entityId: id,
        entityName: template?.name || 'Template',
        description: 'Deactivated invoice template',
      },
    }).catch(() => {});

    return templateRepository.findById(id, companyId);
  }

  // Template Versions
  async getVersions(templateId: string, companyId: string) {
    const template = await templateRepository.findById(templateId, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    return templateRepository.getVersions(templateId);
  }

  async rollbackToVersion(templateId: string, versionId: string, companyId: string, userId: string) {
    const template = await templateRepository.findById(templateId, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    const version = await templateRepository.getVersion(versionId, templateId);
    if (!version) {
      throw new Error('Version not found');
    }

    await templateRepository.update(templateId, companyId, {
      content: version.content || undefined,
      config: version.config as Record<string, unknown> | undefined,
    });

    // Create new version for rollback
    const newVersion = this.incrementVersion(template.version);
    await templateRepository.createVersion(templateId, {
      version: newVersion,
      content: version.content || undefined,
      config: version.config as Record<string, unknown> | undefined,
      uploadedById: userId,
    });

    await prisma.invoiceTemplate.update({
      where: { id: templateId },
      data: { version: newVersion },
    });

    await this.invalidateCache(companyId);

    await prisma.auditLog.create({
      data: {
        companyId,
        userId,
        userName: 'System',
        userRole: 'ADMIN',
        action: 'UPDATE',
        module: 'Templates',
        entityId: templateId,
        entityName: template.name,
        description: `Rolled back template to version ${version.version}`,
      },
    }).catch(() => {});

    return templateRepository.findById(templateId, companyId);
  }

  // User Template Assignments
  async getUserAssignments(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'assignments');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const assignments = await templateRepository.getUserTemplateAssignments(companyId);
    await cache.set(cacheKey, assignments, 300);
    return assignments;
  }

  async getUserAssignment(userId: string, companyId: string) {
    return templateRepository.getUserTemplateAssignment(userId, companyId);
  }

  async setUserTemplate(companyId: string, userId: string, targetUserId: string, templateId: string | null) {
    const assignment = await templateRepository.setUserTemplateAssignment(
      companyId,
      targetUserId,
      templateId,
      userId
    );

    await this.invalidateCache(companyId);

    emitToCompany(companyId, 'template:assigned', {
      userId: targetUserId,
      templateId,
    });

    return assignment;
  }

  // Stats
  async getStats(companyId: string) {
    const cacheKey = this.getCacheKey(companyId, 'stats');
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const stats = await templateRepository.getStats(companyId);
    await cache.set(cacheKey, stats, 300);
    return stats;
  }

  // Preview - generates a sample invoice with the template
  async previewTemplate(id: string, companyId: string) {
    const template = await templateRepository.findById(id, companyId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Return template with sample data for preview
    return {
      template,
      sampleData: {
        invoiceNumber: 'INV-PREVIEW-001',
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        customer: {
          name: 'Sample Customer',
          businessName: 'Sample Business Ltd.',
          gstNumber: '27AAAAA0000A1Z5',
          address: '123, Business Street, Mumbai - 400001',
        },
        items: [
          { description: 'Sample Service', quantity: 1, rate: 1000, tax: 180, total: 1180 },
        ],
        subtotal: 1000,
        taxAmount: 180,
        total: 1180,
      },
    };
  }
}

export const templateService = new TemplateService();
