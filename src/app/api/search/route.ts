import { NextResponse } from 'next/server';
import { searchArticles } from '@/lib/search';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() ?? '';
  if (!query) {
    return NextResponse.json({ results: [] });
  }
  const results = await searchArticles(query);
  return NextResponse.json({ results });
}
