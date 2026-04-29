import { Router } from 'express';
import { listCategories } from '../services/categoryService';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const categories = await listCategories();
    res.json({ data: categories, error: null });
  } catch (err) {
    next(err);
  }
});

export default router;
