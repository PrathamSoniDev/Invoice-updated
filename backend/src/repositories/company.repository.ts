import prisma from '../config/database';
import { BaseRepository } from './base.repository';
import { Company } from '@prisma/client';

export class CompanyRepository extends BaseRepository<Company> {
  constructor() {
    super(prisma.company, 'company');
  }

  override async findById(id: string): Promise<Company | null> {
    return prisma.company.findFirst({
      where: {
        id,
        isActive: true,
      },
    });
  }

  async createCompany(data: {
    name: string;
    legalName: string;
    email: string;
    addressLine1: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber?: string;
    phone?: string;
  }): Promise<Company> {
    return prisma.company.create({ data });
  }

  override async update(id: string, data: Record<string, unknown>): Promise<Company> {
    return prisma.company.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }
}

export const companyRepository = new CompanyRepository();
