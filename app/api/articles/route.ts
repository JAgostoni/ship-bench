import { NextRequest, NextResponse } from 'next/server';
import { getArticles } from '@/src/lib/articles';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const cursor = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    if (isNaN(limit) || limit <= 0 || limit > 100) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }

    const result = await getArticles({ limit, cursor: cursor ?? undefined });

    return NextResponse.json({
      articles: result.articles,
      nextCursor: result.nextCursor,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
