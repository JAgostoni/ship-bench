import { searchArticles } from '@/lib/search';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  $queryRawUnsafe: jest.fn(),
}));

test('searchArticles returns parsed results', async () => {
  const mockRows = [
    {
      id: '1',
      title: 'Test Title',
      content: 'Test content',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'DRAFT',
    },
  ];
  (prisma.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockRows);
  const results = await searchArticles('Test');
  expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
  expect(results).toEqual(mockRows);
});
