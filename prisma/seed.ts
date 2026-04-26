import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.article.upsert({
    where: { slug: 'welcome-to-the-knowledge-base' },
    update: {},
    create: {
      title: 'Welcome to the Knowledge Base',
      slug: 'welcome-to-the-knowledge-base',
      content: '# Welcome\n\nThis is a sample article demonstrating the markdown rendering capabilities.\n\n## Features\n\n- **Bold** text\n- *Italic* text\n- [Links](https://example.com)\n\n### Code Blocks\n\n```javascript\nconsole.log("Hello World");\n```\n',
    },
  });

  await prisma.article.upsert({
    where: { slug: 'how-to-write-good-documentation' },
    update: {},
    create: {
      title: 'How to Write Good Documentation',
      slug: 'how-to-write-good-documentation',
      content: '# Documentation Guidelines\n\nGood documentation is crucial for team success. Keep it simple, clear, and up-to-date.\n\n1. Start with a summary\n2. Provide clear examples\n3. Use formatting for readability',
    },
  });

  await prisma.article.upsert({
    where: { slug: 'onboarding-guide' },
    update: {},
    create: {
      title: 'Onboarding Guide',
      slug: 'onboarding-guide',
      content: '# New Hire Onboarding\n\nWelcome to the team! Here is what you need to do on your first day:\n\n- [ ] Set up your local environment\n- [ ] Read the architecture spec\n- [ ] Introduce yourself in Slack',
    },
  });
  
  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
