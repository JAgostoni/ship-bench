import { Router } from 'express';
import { ArticleCreateSchema, ArticleUpdateSchema } from '@shared/schemas';
import { validateBody } from '../middleware/validate';
import {
  listArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} from '../services/articleService';
import { searchArticles } from '../services/searchService';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    if (search !== undefined && search.trim().length > 0) {
      const results = await searchArticles(search);
      res.json({ data: results, error: null });
      return;
    }

    const result = await listArticles({ page, limit });
    res.json({ data: result, error: null });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const article = await getArticleBySlug(req.params.slug);
    if (!article) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Article not found' },
      });
      return;
    }
    res.json({ data: article, error: null });
  } catch (err) {
    next(err);
  }
});

router.post('/', validateBody(ArticleCreateSchema), async (req, res, next) => {
  try {
    const data = (req as Request & { validatedBody: unknown }).validatedBody;
    const article = await createArticle(data as Parameters<typeof createArticle>[0]);
    res.status(201).json({ data: article, error: null });
  } catch (err) {
    next(err);
  }
});

router.put('/:slug', validateBody(ArticleUpdateSchema), async (req, res, next) => {
  try {
    const data = (req as Request & { validatedBody: unknown }).validatedBody;
    const article = await updateArticle(req.params.slug, data as Parameters<typeof updateArticle>[1]);
    if (!article) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Article not found' },
      });
      return;
    }
    res.json({ data: article, error: null });
  } catch (err) {
    next(err);
  }
});

router.delete('/:slug', async (req, res, next) => {
  try {
    const ok = await deleteArticle(req.params.slug);
    if (!ok) {
      res.status(404).json({
        data: null,
        error: { code: 'NOT_FOUND', message: 'Article not found' },
      });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
