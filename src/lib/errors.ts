export type AppErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'SLUG_TAKEN'
  | 'CATEGORY_IN_USE'
  | 'DB_UNAVAILABLE'
  | 'INTERNAL';

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Status mapping from architecture.md §10.5.
const STATUS: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  CONFLICT: 409,
  SLUG_TAKEN: 409,
  CATEGORY_IN_USE: 409,
  DB_UNAVAILABLE: 503,
  INTERNAL: 500,
};

// Titles for the RFC 9457 `title` member. `VALIDATION_FAILED` and `CONFLICT`
// are fixed verbatim by the §7.3 examples; the rest were authored here because
// the specification illustrates only those two.
const PROBLEM_TITLES: Record<AppErrorCode, string> = {
  NOT_FOUND: 'Not found',
  VALIDATION_FAILED: 'Validation failed',
  CONFLICT: 'This article changed since you opened it',
  SLUG_TAKEN: 'That slug is already in use',
  CATEGORY_IN_USE: 'Category is in use',
  DB_UNAVAILABLE: 'Database unavailable',
  INTERNAL: 'Something went wrong',
};

export type ProblemJson = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: unknown;
};

export function toProblemJson(error: AppError, instance: string): ProblemJson {
  return {
    type: `https://kb.local/problems/${error.code.toLowerCase().replace(/_/g, '-')}`,
    title: PROBLEM_TITLES[error.code],
    status: STATUS[error.code],
    detail: error.message,
    instance,
    ...(error.details ? { errors: error.details.errors } : {}),
  };
}
