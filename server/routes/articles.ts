import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(501).json({ data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Article list not yet implemented' } });
});

router.get('/:slug', (req, res) => {
  res.status(501).json({ data: null, error: { code: 'NOT_IMPLEMENTED', message: `Article detail for ${req.params.slug} not yet implemented` } });
});

router.post('/', (_req, res) => {
  res.status(501).json({ data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Create article not yet implemented' } });
});

router.put('/:slug', (req, res) => {
  res.status(501).json({ data: null, error: { code: 'NOT_IMPLEMENTED', message: `Update article for ${req.params.slug} not yet implemented` } });
});

router.delete('/:slug', (req, res) => {
  res.status(501).json({ data: null, error: { code: 'NOT_IMPLEMENTED', message: `Delete article for ${req.params.slug} not yet implemented` } });
});

export default router;
