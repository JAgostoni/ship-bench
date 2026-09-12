import { NextResponse } from 'next/server';
import { problemResponse } from '@/server/http';
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
