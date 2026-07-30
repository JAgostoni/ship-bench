import { NextResponse } from 'next/server';
import { getArticles, createArticle } from '@/lib/articles';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  const articles = await getArticles();
  // Serialize Date fields to ISO strings for client consumption
  const serialized = articles.map(a => ({
    ...a,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
  }));
  return NextResponse.json(serialized);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 });
  }
  const body = await request.json();
  try {
    const article = await createArticle(body);
    return NextResponse.json(article, { status: 201 });
  } catch (e: any) {
    return new NextResponse(e.message, { status: 400 });
  }
}
