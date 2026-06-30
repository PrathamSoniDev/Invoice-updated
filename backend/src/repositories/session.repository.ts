import prisma from '../config/database';
import { BaseRepository } from './base.repository';
import { Session } from '@prisma/client';

export class SessionRepository extends BaseRepository<Session> {
  constructor() {
    super(prisma.session, 'session');
  }

  override async create(data: {
    userId: string;
    tokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    deviceId?: string;
    expiresAt: Date;
  }): Promise<Session> {
    return prisma.session.create({
      data: {
        ...data,
        lastActivity: new Date(),
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async updateActivity(id: string): Promise<void> {
    await prisma.session.update({
      where: { id },
      data: { lastActivity: new Date() },
    });
  }

  async deleteById(id: string): Promise<void> {
    await prisma.session.delete({ where: { id } });
  }

  async deleteByUserId(userId: string, excludeSessionId?: string): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        userId,
        ...(excludeSessionId && { id: { not: excludeSessionId } }),
      },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  async countUserSessions(userId: string): Promise<number> {
    return prisma.session.count({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });
  }
}

export const sessionRepository = new SessionRepository();
