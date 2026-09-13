import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError, toProblemJson } from '@/lib/errors';

/**
 * Same-origin enforcement for route-handler mutations (`architecture.md` §13.2).
 *
 * Server Actions get this from Next.js automatically, because the framework already
 * validates the `Origin`/`Host` pair on the request it generates. **Route handlers get
 * nothing**, so a `POST`/`PATCH`/`DELETE` handler is a plain browser-reachable
 * endpoint and needs its own check — without it, any page on the internet could make
 * a visitor's browser archive an article.
 *
 * The rule: when an `Origin` header is present it must match the request's own host.
 * A **missing** `Origin` is allowed, because non-browser clients (the Playwright
 * suite, `curl`, a future service) legitimately omit it, and the header is not
 * forgeable *from a browser* — which is the threat this actually addresses.
 *
 * Returns `null` when the request is acceptable, or a `403` problem document when it
 * is not, so call sites read `const denied = assertSameOrigin(request); if (denied)
 * return denied;`.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // A malformed Origin is not a same-origin request by any reading.
    originHost = '';
  }

  const host = request.headers.get('host') ?? new URL(request.url).host;
  if (originHost && originHost === host) return null;

  return NextResponse.json(
    {
      type: 'https://kb.local/problems/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'This request must originate from the same site.',
      instance: new URL(request.url).pathname,
    },
    { status: 403, headers: { 'Content-Type': 'application/problem+json; charset=utf-8' } },
  );
}

/**
 * The `Content-Type: application/json` requirement for mutations (§7.3).
 *
 * This is a CSRF defence, not pedantry. A cross-site HTML form can only send
 * `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain` —
 * `application/json` forces a CORS preflight the browser will not grant. Combined
 * with the origin check above, a mutation endpoint therefore cannot be driven from
 * another origin by a plain form post.
 *
 * Returns `null` when acceptable, or a `415` problem document when not.
 */
export function assertJsonContentType(request: Request): NextResponse | null {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('application/json')) return null;

  return NextResponse.json(
    {
      type: 'https://kb.local/problems/unsupported-media-type',
      title: 'Unsupported media type',
      status: 415,
      detail: 'Requests that change data must use Content-Type: application/json.',
      instance: new URL(request.url).pathname,
    },
    { status: 415, headers: { 'Content-Type': 'application/problem+json; charset=utf-8' } },
  );
}

/**
 * Parses a JSON body, mapping a malformed document to a `400` problem rather than
 * letting `request.json()`'s `SyntaxError` reach the generic 500 branch.
 */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          type: 'https://kb.local/problems/bad-request',
          title: 'Bad request',
          status: 400,
          detail: 'The request body is not valid JSON.',
          instance: new URL(request.url).pathname,
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json; charset=utf-8' } },
      ),
    };
  }
}

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
