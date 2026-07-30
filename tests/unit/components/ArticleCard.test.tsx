import { render, screen } from '@testing-library/react';
import ArticleCard from '@/components/ArticleCard';

const article = {
  id: '1',
  title: 'Test Article',
  content: 'This is a test article content',
  status: 'DRAFT',
  tags: [{ id: 't1', name: 'Tag1' }],
};

test('renders article title and content', () => {
  render(<ArticleCard article={article} />);
  expect(screen.getByText('Test Article')).toBeInTheDocument();
  expect(screen.getByText('This is a test article content')).toBeInTheDocument();
});

ntest('highlights query matches in content', () => {
  const query = 'test';
  render(<ArticleCard article={article} query={query} />);
  const highlighted = screen.getAllByText((content, node) => {
    return node?.tagName.toLowerCase() === 'mark' && content === query;
  });
  expect(highlighted.length).toBeGreaterThan(0);
});
