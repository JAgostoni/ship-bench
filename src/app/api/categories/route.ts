import { NextResponse } from 'next/server';
import { categoryCreateSchema } from '@/lib/validation/category';
import {
  assertJsonContentType,
  assertSameOrigin,
  problemResponse,
  readJsonBody,
} from '@/server/http';
import { logger } from '@/server/logger';
import { categoryRepository } from '@/server/repositories/categories';
import { toCategoryWire } from '@/server/serialize';

export const dynamic = 'force-dynamic';

/**
 * `GET /api/categories` — `{ items: [{ id, name, slug, description, articleCount }] }`
 * (architecture.md §7.3).
 *
 * `articleCount` is the **published** count, matching the sidebar
 * (`design-spec.md` §4.4's counts and §4.5's "drafts must not dilute the default
 * view"). The `POST` half of this route is iteration 6's write path.
 */
export function GET(request: Request): NextResponse {
  try {
    return NextResponse.json(
      { items: categoryRepository.listWithCounts().map(toCategoryWire) },
      { headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemResponse(error, request);
  }
}

/**
 * `POST /api/categories` — create (§7.3).
 *
 * `201` returns `{ id, slug, name }`, exactly the three members the contract names.
 * A duplicate name — compared case-insensitively by the repository — is a `409`
 * problem, not a thrown constraint error, because the repository already turns it into
 * a `CONFLICT` `AppError` with a user-readable message.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const denied = assertSameOrigin(request);
  if (denied) return denied;

  const unsupported = assertJsonContentType(request);
  if (unsupported) return unsupported;

  try {
    const parsedBody = await readJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const input = categoryCreateSchema.parse(parsedBody.body);
    const startedAt = Date.now();
    const result = categoryRepository.create(input);

    if (!result.ok) return problemResponse(result.error, request);

    const { id, slug, name } = result.value;
    logger.info(
      { event: 'api.category.create', categoryId: id, slug, durationMs: Date.now() - startedAt },
      'api.category.create',
    );

    return NextResponse.json(
      { id, slug, name },
      { status: 201, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemResponse(error, request);
  }
}
