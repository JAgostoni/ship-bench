import { NextRequest, NextResponse } from 'next/server';
import { searchQuerySchema } from '@/src/lib/validation';
import { searchArticles } from '@/src/lib/search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limitParam = searchParams.get('limit');

    // Return empty results for empty query without hitting the DB
    if (!q || q.trim() === '') {
      return NextResponse.json({ results: [], query: '' });
    }

    const limit = limitParam ? Number(limitParam) : undefined;

    // Validate query params
    const validation = searchQuerySchema.safeParse({ q, limit });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { q: query, limit: validatedLimit } = validation.data;
    const searchResult = searchArticles(query, { limit: validatedLimit });

    return NextResponse.json(searchResult);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
