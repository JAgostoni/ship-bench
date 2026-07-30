import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const tags = await prisma.tag.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(tags);
}
