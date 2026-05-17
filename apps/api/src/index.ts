import express from 'express';
import cors from 'cors';
import { prisma } from '@kb/db';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
