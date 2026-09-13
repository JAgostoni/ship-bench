import { NextResponse } from 'next/server';
import { articleUpdateSchema } from '@/lib/validation/article';
import {
  assertJsonContentType,
  assertSameOrigin,
  notFoundResponse,
  problemResponse,
  readJsonBody,
} from '@/server/http';
import { readDisplayName } from '@/server/display-name';
import { logger } from '@/server/logger';
import { articleRepository } from '@/server/repositories/articles';
import { toArticleDetailWire } from '@/server/serialize';

export const dynamic = 'force-dynamic';

/** A URL segment that is all digits is an id; anything else is a slug (§7.3). */
const NUMERIC = /^\d+$/;

/**
 * `GET /api/articles/:idOrSlug` — the full record, including `bodyMd` and
 * `category` (architecture.md §7.3).
 *
 * **Two addressing modes on one route** is what makes a slug changeable without
 * invalidating an id-based client, and what lets the API resolve the ids the search
 * endpoint returns. `404` is a `application/problem+json` document whose `type` ends
 * in `/not-found`, per the contract.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> {
  try {
    const { idOrSlug } = await context.params;
    const decoded = decodeURIComponent(idOrSlug);

    const result = NUMERIC.test(decoded)
      ? articleRepository.getArticleById(Number(decoded))
      : articleRepository.getArticleBySlug(decoded);

    if (!result.ok) {
      return notFoundResponse(request, result.error.message);
    }

    return NextResponse.json(toArticleDetailWire(result.value.article), {
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    return problemResponse(error, request);
  }
}

/**
 * Resolves the `:idOrSlug` segment to an article id, or a `404` response.
 *
 * The mutations need the same two addressing modes as `GET`, and `updateArticle`/
 * `archiveArticle` take an id, so a slug has to be resolved first. Going through
 * `getArticleById`/`getArticleBySlug` means an unknown segment produces the route's
 * documented `/not-found` problem document rather than a repository-level error string.
 */
function resolveId(
  idOrSlug: string,
): { ok: true; id: number } | { ok: false; response: NextResponse } {
  const decoded = decodeURIComponent(idOrSlug);
  const result = NUMERIC.test(decoded)
    ? articleRepository.getArticleById(Number(decoded), 1)
    : articleRepository.getArticleBySlug(decoded, 1);

  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          type: 'https://kb.local/problems/not-found',
          title: 'Not found',
          status: 404,
          detail: result.error.message,
          instance: `/api/articles/${decoded}`,
        },
        { status: 404, headers: { 'Content-Type': 'application/problem+json; charset=utf-8' } },
      ),
    };
  }

  return { ok: true, id: result.value.article.id };
}

/**
 * `PATCH /api/articles/:idOrSlug` — an optimistic-concurrency save (§7.3).
 *
 * `version` is **required**: the contract's whole point is that a client sends the
 * revision it last read, and the `409` body names both numbers
 * (`Expected version 4, found 5.`) so a client can decide whether to re-fetch or
 * surface the conflict. The `errors` array is produced by the repository's
 * `CONFLICT` `AppError`, whose `details.errors` `toProblemJson` already passes
 * through — so the shape is the same one the read endpoints use.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const unsupported = assertJsonContentType(request);
  if (unsupported) return unsupported;

  try {
    const { idOrSlug } = await context.params;
    const resolved = resolveId(idOrSlug);
    if (!resolved.ok) return resolved.response;

    const parsedBody = await readJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const input = articleUpdateSchema.parse(parsedBody.body);
    const editorName = await readDisplayName();
    const startedAt = Date.now();
    const result = articleRepository.updateArticle(resolved.id, { ...input, editorName });

    if (!result.ok) return problemResponse(result.error, request);

    const { id, slug, version, updatedAt } = result.value;
    logger.info(
      {
        event: 'api.article.update',
        articleId: id,
        slug,
        version,
        durationMs: Date.now() - startedAt,
      },
      'api.article.update',
    );

    return NextResponse.json(
      { id, slug, version, updatedAt: updatedAt.toISOString() },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemResponse(error, request);
  }
}

/**
 * `DELETE /api/articles/:idOrSlug` — **soft**-archive (§7.3).
 *
 * Sets `status = 'archived'` and stamps `archived_at`; revisions are retained and no
 * row is removed. Hard delete is deliberately not exposed in v1, so this endpoint
 * cannot destroy history even if a client asks in the imperative.
 *
 * `204 No Content` on success, per the contract — the body would have nothing to say.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ idOrSlug: string }> },
): Promise<NextResponse> {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  try {
    const { idOrSlug } = await context.params;
    const resolved = resolveId(idOrSlug);
    if (!resolved.ok) return resolved.response;

    const editorName = await readDisplayName();
    const startedAt = Date.now();
    const result = articleRepository.archiveArticle(resolved.id, editorName);

    if (!result.ok) return problemResponse(result.error, request);

    logger.info(
      {
        event: 'api.article.archive',
        articleId: result.value.id,
        slug: result.value.slug,
        version: result.value.version,
        durationMs: Date.now() - startedAt,
      },
      'api.article.archive',
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return problemResponse(error, request);
  }
}
