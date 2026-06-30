import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, z, ZodType } from 'zod';
import { AppError, ErrorCodes } from '../utils/error';

interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

function createValidationAppError(error: ZodError): AppError {
  const details: ValidationErrorDetail[] = error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message,
    code: e.code,
  }));
  return new AppError(
    'Validation failed',
    400,
    ErrorCodes.VALIDATION_ERROR,
    true,
    details as unknown as Record<string, unknown>[]
  );
}

type ZodSchema = AnyZodObject | ZodType<any, any, any>;

export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(createValidationAppError(error));
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query) as typeof req.query;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(createValidationAppError(error));
        return;
      }
      next(error);
    }
  };
}

export function validateParams<T extends ZodSchema>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params) as typeof req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(createValidationAppError(error));
        return;
      }
      next(error);
    }
  };
}

export function validateRequest(
  bodySchema?: ZodSchema,
  querySchema?: ZodSchema,
  paramsSchema?: ZodSchema
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (bodySchema) {
        req.body = await bodySchema.parseAsync(req.body);
      }
      if (querySchema) {
        req.query = await querySchema.parseAsync(req.query) as typeof req.query;
      }
      if (paramsSchema) {
        req.params = await paramsSchema.parseAsync(req.params) as typeof req.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(createValidationAppError(error));
        return;
      }
      next(error);
    }
  };
}

export function validateWithRefine<T extends ZodSchema>(schema: T) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(createValidationAppError(error));
        return;
      }
      next(error);
    }
  };
}
