const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'file:./dev.db',
});

async function main() {
  console.log('Start seeding...');
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
    },
  });

  const articles = [
    {
      title: 'Getting Started with the KB',
      slug: 'getting-started',
      content: '# Getting Started\n\nWelcome to the internal knowledge base. This tool helps us keep track of everything!',
      authorId: user.id,
    },
    {
      title: 'Development Guidelines',
      slug: 'dev-guidelines',
      content: '# Development Guidelines\n\n- Use TypeScript\n- Write tests\n- Follow the architecture spec.',
      authorId: user.id,
    },
    {
      title: 'Company Culture',
      slug: 'company-culture',
      content: '# Company Culture\n\nWe value transparency, collaboration, and a calm working environment.',
      authorId: user.id,
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });