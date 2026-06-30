import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export function success<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

export function created<T>(data: T, message?: string): SuccessResponse<T> {
  return success(data, message);
}

export function paginated<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  statusCode: number = 200
): Response {
  const response: SuccessResponse<T[]> = {
    success: true,
    data,
    metadata: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNext: pagination.page < pagination.totalPages,
      hasPrev: pagination.page > 1,
    },
  };
  return res.status(statusCode).json(response);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function accepted<T>(data: T, message?: string): SuccessResponse<T> {
  return success(data, message);
}

export function fileDownload(
  res: Response,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Response {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(fileBuffer);
}
