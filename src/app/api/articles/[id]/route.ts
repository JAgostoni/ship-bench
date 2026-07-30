import { NextResponse } from 'next/server';
import { getArticle, updateArticle } from '@/lib/articles';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const article = await getArticle(params.id);
  if (!article) {
    return new NextResponse('Not found', { status: 404 });
  }
  return NextResponse.json(article);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse('Unauthenticated', { status: 401 });
  }
  const body = await request.json();
  try {
    const article = await updateArticle(params.id, body);
    return NextResponse.json(article);
  } catch (e: any) {
    return new NextResponse(e.message, { status: 400 });
  }
}
