export type ArticleStatus = 'DRAFT' | 'PUBLISHED';

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  colorIndex: number;
  createdAt: Date;
};

export type ArticleDTO = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: ArticleStatus;
  category: CategoryDTO | null;
  createdAt: Date;
  updatedAt: Date;
  readingTimeMinutes: number;
};

export type ArticleListItem = Omit<ArticleDTO, 'content'>;
