import { ArticleStatus, prisma } from './index';

async function main() {
  console.log('Seeding database...');

  // Upsert Categories
  const engineering = await prisma.category.upsert({
    where: { slug: 'engineering' },
    update: {},
    create: { name: 'Engineering', slug: 'engineering' },
  });

  const product = await prisma.category.upsert({
    where: { slug: 'product' },
    update: {},
    create: { name: 'Product', slug: 'product' },
  });

  const hr = await prisma.category.upsert({
    where: { slug: 'hr' },
    update: {},
    create: { name: 'Human Resources', slug: 'hr' },
  });

  // Upsert Tags
  const react = await prisma.tag.upsert({
    where: { name: 'React' },
    update: {},
    create: { name: 'React' },
  });

  const node = await prisma.tag.upsert({
    where: { name: 'Node.js' },
    update: {},
    create: { name: 'Node.js' },
  });

  // Create Articles
  const articles = [
    {
      title: 'Getting Started with React 19',
      slug: 'getting-started-with-react-19',
      content: 'React 19 introduces several new features including Actions, useOptimistic, and better server component support...',
      excerpt: 'A guide to the newest features in React 19.',
      status: ArticleStatus.PUBLISHED,
      categoryId: engineering.id,
    },
    {
      title: 'Node.js 24 Best Practices',
      slug: 'node-js-24-best-practices',
      content: 'With Node.js 24, we see improvements in performance and built-in support for more web standards...',
      excerpt: 'How to write modern Node.js code in 2026.',
      status: ArticleStatus.PUBLISHED,
      categoryId: engineering.id,
    },
    {
      title: 'Product Roadmap 2026',
      slug: 'product-roadmap-2026',
      content: 'Our focus for this year is on user experience and seamless integrations...',
      excerpt: 'What we are building this year.',
      status: ArticleStatus.DRAFT,
      categoryId: product.id,
    },
    {
      title: 'Onboarding Guide',
      slug: 'onboarding-guide',
      content: 'Welcome to the team! Here is how to get set up on your first day...',
      excerpt: 'Everything a new hire needs to know.',
      status: ArticleStatus.PUBLISHED,
      categoryId: hr.id,
    },
    {
      title: 'Prisma 7.8 Tips',
      slug: 'prisma-7-8-tips',
      content: 'Prisma 7.8 makes database migrations and type safety even easier...',
      excerpt: 'Optimizing your database workflow.',
      status: ArticleStatus.PUBLISHED,
      categoryId: engineering.id,
    },
    {
      title: 'Understanding PostgreSQL FTS',
      slug: 'understanding-postgres-fts',
      content: 'PostgreSQL Full-Text Search is a powerful tool for building search features without extra dependencies...',
      excerpt: 'Leveraging Postgres for high-performance search.',
      status: ArticleStatus.PUBLISHED,
      categoryId: engineering.id,
    },
    {
      title: 'Team Culture and Values',
      slug: 'team-culture-values',
      content: 'Our culture is built on transparency, collaboration, and continuous learning...',
      excerpt: 'What defines us as a team.',
      status: ArticleStatus.PUBLISHED,
      categoryId: hr.id,
    },
    {
      title: 'Agile Process at Scale',
      slug: 'agile-process-scale',
      content: 'Scaling agile requires clear communication and robust tooling...',
      excerpt: 'How we manage projects across multiple teams.',
      status: ArticleStatus.DRAFT,
      categoryId: product.id,
    },
    {
      title: 'Design System Documentation',
      slug: 'design-system-docs',
      content: 'Our design system ensures consistency across all our products...',
      excerpt: 'Reference guide for UI components and styles.',
      status: ArticleStatus.PUBLISHED,
      categoryId: product.id,
    },
    {
      title: 'Security 101 for Developers',
      slug: 'security-101-devs',
      content: 'Security is everyone\'s responsibility. Here are the basics every developer should know...',
      excerpt: 'Keeping our applications and data safe.',
      status: ArticleStatus.PUBLISHED,
      categoryId: engineering.id,
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
