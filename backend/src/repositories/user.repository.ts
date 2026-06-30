import prisma from '../config/database';
import { BaseRepository } from './base.repository';
import { User, UserRole, UserStatus } from '@prisma/client';

export interface UserWithCompany extends User {
  company?: {
    id: string;
    name: string;
    legalName: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  permissions: any;
  companyId: string;
  avatar: string | null;
  phone: string | null;
  lastActiveAt: Date | null;
  createdAt: Date;
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(prisma.user, 'user');
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            legalName: true,
          },
        },
      },
    });
  }

  async findByEmailAndCompany(email: string, companyId: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        companyId,
        deletedAt: null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            legalName: true,
          },
        },
      },
    });
  }

  async findByIdWithCompany(id: string): Promise<UserWithCompany | null> {
    return prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            legalName: true,
          },
        },
      },
    }) as Promise<UserWithCompany | null>;
  }

  async findByIdWithPermissions(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
        companyId: true,
        avatar: true,
        phone: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
    return user as UserProfile | null;
  }

  async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
        loginCount: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  async incrementFailedLogin(id: string): Promise<number> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        failedLoginCount: { increment: 1 },
      },
      select: { failedLoginCount: true },
    });
    return user.failedLoginCount;
  }

  async lockAccount(id: string, lockedUntil: Date): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        lockedUntil,
      },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async updateStatus(id: string, status: UserStatus): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
  }

  async updatePermissions(id: string, permissions: string[]): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        permissions,
        updatedAt: new Date(),
      },
    });
  }

  async updateLastActive(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  async search(
    companyId: string,
    query: string,
    page: number,
    limit: number,
    filters?: {
      role?: UserRole;
      status?: UserStatus;
    }
  ): Promise<{ data: Partial<User>[]; total: number }> {
    const where = {
      companyId,
      deletedAt: null,
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
      ],
      ...(filters?.role && { role: filters.role }),
      ...(filters?.status && { status: filters.status }),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatar: true,
          phone: true,
          lastActiveAt: true,
          createdAt: true,
          companyId: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }
}

export const userRepository = new UserRepository();
