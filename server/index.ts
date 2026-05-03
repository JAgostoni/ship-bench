import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import articlesRouter from './routes/articles';
import searchRouter from './routes/search';
import categoriesRouter from './routes/categories';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(morgan('dev'));
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use('/api/articles', articlesRouter);
app.use('/api/search', searchRouter);
app.use('/api/categories', categoriesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ data: { status: 'ok' }, error: null });
});

// Serve React SPA in production
app.use(express.static('dist'));
app.use((_req, res) => {
  res.sendFile('dist/index.html', { root: process.cwd() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
