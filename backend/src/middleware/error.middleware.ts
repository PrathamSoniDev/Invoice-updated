import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';
import { AppError } from '../utils/error';
import process from 'process';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
    stack?: string;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response<ErrorResponse> {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: Array<{ field: string; message: string }> | undefined;

  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    if (err.details) {
      details = err.details.map(d => ({
        field: String(d['field'] || ''),
        message: String(d['message'] || ''),
      }));
    }
  }

  else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        const field = (err.meta?.['target'] as string[])?.[0] || 'field';
        message = `A record with this ${field} already exists`;
        break;
      case 'P2025':
        statusCode = 404;
        code = 'NOT_FOUND';
        message = 'Record not found';
        break;
      case 'P2003':
        statusCode = 400;
        code = 'FOREIGN_KEY_ERROR';
        message = 'Related record not found';
        break;
      case 'P2014':
        statusCode = 400;
        code = 'RELATION_ERROR';
        message = 'Invalid relation';
        break;
      default:
        statusCode = 500;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed';
    }
  }

  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'TOKEN_INVALID';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  }

  else if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    if (err.message.includes('File too large')) {
      message = 'File size exceeds limit';
    } else {
      message = err.message;
    }
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack }),
    },
  };

  return res.status(statusCode).json(response);
}

export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
