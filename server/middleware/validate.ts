import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      (req as Request & { validatedBody: T }).validatedBody = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: err.errors,
          },
        });
        return;
      }
      next(err);
    }
  };
}
