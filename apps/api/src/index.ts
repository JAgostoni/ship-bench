import express from 'express';
import cors from 'cors';
import { prisma } from '@kb/db';
import { CreateArticleSchema, UpdateArticleSchema } from '@kb/types';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper: Slugify
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-');    // Replace multiple - with single -
};

// Helper: Ensure unique slug
const ensureUniqueSlug = async (title: string, currentId?: string) => {
  let slug = slugify(title);
  let uniqueSlug = slug;
  let counter = 1;

  while (true) {
    const existing = await prisma.article.findFirst({
      where: {
        slug: uniqueSlug,
        NOT: currentId ? { id: currentId } : undefined,
      },
    });

    if (!existing) break;
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
};

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Articles List
app.get('/api/articles', async (req, res) => {
  try {
    const { search, category, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) {
      where.status = status as string;
    } else {
      where.status = 'PUBLISHED'; // Default to published for read flow
    }

    if (category) {
      where.category = {
        slug: category as string,
      };
    }

    if (search) {
      const searchString = (search as string).trim().split(/\s+/).join(' | ');
      where.OR = [
        { title: { search: searchString } },
        { content: { search: searchString } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          category: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: search ? undefined : { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Article Detail
app.get('/api/articles/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const article = await prisma.article.findUnique({
      where: { slug },
      include: {
        category: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json(article);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Create Article
app.post('/api/articles', async (req, res) => {
  try {
    const body = req.body;
    
    // Auto-generate slug if not provided
    if (!body.slug && body.title) {
      body.slug = await ensureUniqueSlug(body.title);
    }

    const result = CreateArticleSchema.safeParse(body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid article data', details: result.error.format() });
      return;
    }

    const article = await prisma.article.create({
      data: result.data,
      include: {
        category: true,
      },
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Failed to create article:', error);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// Update Article
app.patch('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const result = UpdateArticleSchema.safeParse(body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid article data', details: result.error.format() });
      return;
    }

    // If title is changing, optionally update slug? 
    // Usually it's better to keep slugs stable, but if it's a DRAFT maybe?
    // The task says "Automatically generate unique slugs from the title".
    // I'll update it if title is provided and slug is not.
    if (body.title && !body.slug) {
      body.slug = await ensureUniqueSlug(body.title, id);
    }

    const article = await prisma.article.update({
      where: { id },
      data: body,
      include: {
        category: true,
      },
    });

    res.json(article);
  } catch (error) {
    console.error('Failed to update article:', error);
    res.status(500).json({ error: 'Failed to update article' });
  }
});

// Delete Article
app.delete('/api/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.article.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete article:', error);
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
