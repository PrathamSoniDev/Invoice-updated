export interface FindManyParams {
  where?: Record<string, unknown>;
  orderBy?: Record<string, string>;
  skip?: number;
  take?: number;
  include?: Record<string, boolean | object>;
  select?: Record<string, boolean>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<T> {
  protected model: any;
  protected modelKey: string;

  constructor(model: any, modelKey: string) {
    this.model = model;
    this.modelKey = modelKey;
  }

  async findById(id: string, companyId?: string, include?: Record<string, boolean | object>): Promise<T | null> {
    const where: Record<string, unknown> = { id };
    if (companyId) {
      where['companyId'] = companyId;
    }

    return this.model.findFirst({
      where,
      include,
    });
  }

  async findMany(params: FindManyParams & { companyId?: string }): Promise<T[]> {
    const where: Record<string, unknown> = {
      ...params.where,
    };
    if (params.companyId) {
      where['companyId'] = params.companyId;
    }

    return this.model.findMany({
      where,
      orderBy: params.orderBy,
      skip: params.skip,
      take: params.take,
      include: params.include,
      select: params.select,
    });
  }

  async findPaginated(
    companyId: string,
    page: number = 1,
    limit: number = 10,
    params?: Omit<FindManyParams, 'skip' | 'take'>
  ): Promise<PaginatedResult<T>> {
    const where: Record<string, unknown> = {
      ...params?.where,
    };
    where['companyId'] = companyId;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where,
        orderBy: params?.orderBy,
        skip,
        take: limit,
        include: params?.include,
        select: params?.select,
      }),
      this.model.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.model.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<T> {
    return this.model.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async softDelete(id: string): Promise<T> {
    return this.model.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<T> {
    return this.model.delete({ where: { id } });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where: where || {} });
  }

  async exists(where: Record<string, unknown>): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }
}
