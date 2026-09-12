import { NextResponse } from 'next/server';
import { notFoundResponse, problemResponse } from '@/server/http';
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
