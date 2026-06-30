import prisma from '../config/database';
import { BaseRepository } from './base.repository';
import { PasswordResetToken } from '@prisma/client';

export class PasswordResetTokenRepository extends BaseRepository<PasswordResetToken> {
  constructor() {
    super(prisma.passwordResetToken, 'passwordResetToken');
  }

  override async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({ data });
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async markAsUsed(id: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { usedAt: { not: null } },
        ],
      },
    });
    return result.count;
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
