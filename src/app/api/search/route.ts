import { NextRequest, NextResponse } from 'next/server';
import { searchArticles } from '@/lib/search';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const params = querySchema.parse(Object.fromEntries(searchParams.entries()));

    const results = await searchArticles(params.q, params.page, params.limit);
    const totalPages = Math.ceil(results.total / params.limit);

    return NextResponse.json({
      articles: results.articles,
      total: results.total,
      page: params.page,
      totalPages,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: err.flatten() },
        { status: 400 },
      );
    }
    console.error('GET /api/search error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
