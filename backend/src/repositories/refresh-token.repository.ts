import prisma from '../config/database';
import { BaseRepository } from './base.repository';
import { RefreshToken } from '@prisma/client';

export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
  constructor() {
    super(prisma.refreshToken, 'refreshToken');
  }

  override async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceId?: string;
  }): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async revoke(tokenHash: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeWithReplacement(tokenHash: string, replacedBy: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: {
        revoked: true,
        revokedAt: new Date(),
        replacedBy,
      },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revoked: true },
        ],
      },
    });
    return result.count;
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
