import { createArticle, getArticles } from '../../../src/lib/articles';
import prisma from '../../../src/lib/prisma';

describe('Article API service', () => {
  beforeAll(async () => {
    await prisma.article.deleteMany();
  });

  test('creates and fetches articles', async () => {
    await createArticle({ title: 'Test', content: 'Hello', status: 'DRAFT' });
    const articles = await getArticles();
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Test');
  });
});
