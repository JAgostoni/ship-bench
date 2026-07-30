import { z } from 'zod';

export const articleSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
});
