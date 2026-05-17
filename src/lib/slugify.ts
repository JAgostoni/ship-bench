import slugifyLib from 'slugify';
import type { PrismaClient } from '@/generated/prisma/client';

export async function generateSlug(
  title: string,
  db: PrismaClient,
  excludeId?: string,
): Promise<string> {
  const base = slugifyLib(title, { lower: true, strict: true });

  let candidate = base;
  let counter = 2;

  for (;;) {
    const existing = await db.article.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    candidate = `${base}-${counter}`;
    counter++;
  }
}
