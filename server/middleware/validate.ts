import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export class ValidationError extends Error {
  public code = 'VALIDATION_ERROR';
  public details: { field: string; message: string }[];

  constructor(issues: { field: string; message: string }[]) {
    super('Request validation failed');
    this.details = issues;
  }
}

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      (req as Request & { validatedBody: T }).validatedBody = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = (err.issues || []).map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        next(new ValidationError(issues));
        return;
      }
      next(err);
    }
  };
}
