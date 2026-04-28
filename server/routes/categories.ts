import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(501).json({ data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Categories not yet implemented' } });
});

export default router;
