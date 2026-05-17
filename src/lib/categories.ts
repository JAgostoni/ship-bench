import slugifyLib from 'slugify';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from './prisma';
import type { Category } from '@/generated/prisma/client';
import type { CategoryDTO } from '@/types';

export function buildColorIndexMap(categories: Category[]): Map<string, number> {
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const map = new Map<string, number>();
  sorted.forEach((cat, idx) => map.set(cat.id, idx % 6));
  return map;
}

function toDTO(cat: Category, colorIndex: number): CategoryDTO {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    colorIndex,
    createdAt: cat.createdAt,
  };
}

export async function listCategories(): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const colorMap = buildColorIndexMap(categories);
  return categories.map(cat => toDTO(cat, colorMap.get(cat.id) ?? 0));
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDTO | null> {
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) return null;
  const all = await prisma.category.findMany();
  const colorMap = buildColorIndexMap(all);
  return toDTO(cat, colorMap.get(cat.id) ?? 0);
}

export async function createCategory(data: { name: string }): Promise<CategoryDTO> {
  const slug = slugifyLib(data.name, { lower: true, strict: true });
  try {
    const cat = await prisma.category.create({ data: { name: data.name, slug } });
    const all = await prisma.category.findMany();
    const colorMap = buildColorIndexMap(all);
    return toDTO(cat, colorMap.get(cat.id) ?? 0);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error(`A category named "${data.name}" already exists`);
    }
    throw err;
  }
}
