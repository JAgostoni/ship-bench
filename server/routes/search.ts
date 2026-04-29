import { Router } from 'express';
import { searchArticles } from '../services/searchService';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const results = await searchArticles(q);
    res.json({ data: results, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
