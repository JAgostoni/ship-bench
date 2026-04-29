import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ValidationError } from './validate';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Validation errors
  if (err instanceof ValidationError) {
    res.status(400).json({
      data: null,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Prisma not found (P2025)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: err.message || 'Resource not found',
      },
    });
    return;
  }

  // Prisma unique constraint violation (P2002)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const target = (err.meta as { target?: string[] })?.target?.join(', ') || 'field';
    res.status(409).json({
      data: null,
      error: {
        code: 'CONFLICT',
        message: `Unique constraint failed on ${target}`,
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}
