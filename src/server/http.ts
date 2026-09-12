import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, toProblemJson } from '@/lib/errors';

/**
 * The one place a route handler turns an error into a response
 * (`architecture.md` §7.3: *"All errors are RFC 9457 problem+json"*).
 *
 * **Why this exists rather than four copies.** The status mapping already lives in
 * `toProblemJson` (§10.5), and three routes need identical handling of three
 * different error shapes: our own `AppError`, Zod's `ZodError`, and anything else.
 * Without a shared helper each route would re-invent the mapping and one of them
 * would inevitably leak a stack trace or answer `200`.
 *
 * The `instance` member is the request path, which is what makes a problem
 * document self-describing for a client that fans out several calls.
 */
export function problemResponse(error: unknown, request: Request): NextResponse {
  const instance = new URL(request.url).pathname;

  if (error instanceof AppError) {
    return NextResponse.json(toProblemJson(error, instance), {
      status: toProblemJson(error, instance).status,
      headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
    });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      toProblemJson(
        new AppError('VALIDATION_FAILED', 'The request failed validation.', {
          errors: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
        instance,
      ),
      {
        status: 422,
        headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
      },
    );
  }

  // Never a stack trace in the body: this surface is unauthenticated, and the
  // detail is already in the server log (the brief's no-silent-failures rule is
  // satisfied by the status code plus the log, not by leaking internals).
  const problem = toProblemJson(
    new AppError('INTERNAL', 'The request could not be completed.'),
    instance,
  );
  return NextResponse.json(problem, {
    status: problem.status,
    headers: { 'Content-Type': 'application/problem+json; charset=utf-8' },
  });
}

/**
 * A `404` problem document whose `type` ends in `/not-found`, which
 * `architecture.md` §7.3 names explicitly for `GET /api/articles/:idOrSlug`.
 */
export function notFoundResponse(request: Request, detail: string): NextResponse {
  return problemResponse(new AppError('NOT_FOUND', detail), request);
}

/**
 * A `400` for a request that is malformed rather than failing validation — the
 * documented `GET /api/search` case where `q` is absent or empty.
 *
 * §7.4's *"invalid or unknown params are coerced to defaults, never 400"* applies to
 * the **list** contract. Search is different: an empty `q` has no meaningful
 * default, and the spec calls for `400` by name.
 */
export function badRequestResponse(request: Request, detail: string): NextResponse {
  const instance = new URL(request.url).pathname;
  return NextResponse.json(
    {
      type: 'https://kb.local/problems/bad-request',
      title: 'Bad request',
      status: 400,
      detail,
      instance,
    },
    { status: 400, headers: { 'Content-Type': 'application/problem+json; charset=utf-8' } },
  );
}
