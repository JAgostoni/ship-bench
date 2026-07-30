import { NextResponse } from 'next/server';
import { getArticle, updateArticle } from '@/lib/articles';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const article = await getArticle(id);
  if (!article) {
    return new NextResponse('Not found', { status: 404 });
  }
  const serialized = {
    ...article,
    createdAt: article.createdAt instanceof Date ? article.createdAt.toISOString() : article.createdAt,
    updatedAt: article.updatedAt instanceof Date ? article.updatedAt.toISOString() : article.updatedAt,
    tags: article.tags?.map((t: any) => t.name) ?? [],
  };
  return NextResponse.json(serialized);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions as any);
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 });
  }
  const body = await request.json();
  try {
    const article = await updateArticle(id, body);
    return NextResponse.json(article);
  } catch (e: any) {
    return new NextResponse(e.message, { status: 400 });
  }
}
