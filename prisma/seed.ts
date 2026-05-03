import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugify } from '../server/lib/slugify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

function setupFts(dbPath: string) {
  const db = new Database(dbPath);
  const ftsSqlPath = path.resolve(__dirname, 'fts-setup.sql');
  const ftsSql = fs.readFileSync(ftsSqlPath, 'utf-8');
  db.exec(ftsSql);
  db.close();
  console.log('FTS5 virtual table and triggers created.');
}

async function main() {
  // Ensure FTS5 setup
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  if (dbUrl.startsWith('file:')) {
    const dbPath = path.resolve(process.cwd(), dbUrl.replace('file:', '').replace(/^\.\//, ''));
    setupFts(dbPath);
  }

  const categories = await prisma.$transaction([
    prisma.category.create({ data: { name: 'Engineering', description: 'Technical docs and runbooks' } }),
    prisma.category.create({ data: { name: 'HR', description: 'People operations and policies' } }),
    prisma.category.create({ data: { name: 'Product', description: 'Product specs and roadmaps' } }),
    prisma.category.create({ data: { name: 'Design', description: 'Design system and guidelines' } }),
  ]);

  const ensureTags = async (names: string[]) => {
    const tags = [];
    for (const name of names) {
      tags.push(
        await prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      );
    }
    return tags;
  };

  const articlesData = [
    {
      title: 'Onboarding Checklist',
      content: '# Onboarding Checklist\n\nWelcome! Here is everything you need to get started.\n\n## Accounts\n- Create Slack account\n- Create GitHub account\n- Set up 2FA on all services\n\n## First Week\n- Attend orientation\n- Meet your buddy\n- Set up your local dev environment',
      categoryId: categories[1].id,
      tagNames: ['onboarding', 'new-hire'],
    },
    {
      title: 'Engineering Runbook: Deployments',
      content: '# Engineering Runbook: Deployments\n\nThis document describes how we deploy to production.\n\n## Prerequisites\n- Access to CI/CD pipeline\n- Merge rights on the main branch\n\n## Steps\n1. Open a pull request.\n2. Get at least one approval.\n3. Merge to main and watch the pipeline.',
      categoryId: categories[0].id,
      tagNames: ['engineering', 'deployment', 'runbook'],
    },
    {
      title: 'Product Roadmap Q2 2026',
      content: '# Product Roadmap Q2 2026\n\nOur focus this quarter is on search performance and editor improvements.\n\n## Key Initiatives\n- FTS5 integration\n- Markdown editor with preview\n- Tag-based filtering',
      categoryId: categories[2].id,
      tagNames: ['roadmap', 'q2-2026'],
    },
    {
      title: 'Design System Tokens',
      content: '# Design System Tokens\n\nColors, typography, and spacing used across the product.\n\n## Colors\n- Surface: white\n- Surface raised: slate-50\n- Accent: blue-600\n\n## Typography\n- Body: text-base, line-height 1.6\n- Headings: text-2xl to text-3xl',
      categoryId: categories[3].id,
      tagNames: ['design-system', 'tokens'],
    },
    {
      title: 'Incident Response Guide',
      content: '# Incident Response Guide\n\nWhen an outage occurs, follow these steps.\n\n## Severity Levels\n1. SEV1 - Revenue-impacting\n2. SEV2 - Feature-impacting\n3. SEV3 - Minor degradation\n\n## Communication\n- Post in #incidents\n- Update the status page every 15 minutes',
      categoryId: categories[0].id,
      tagNames: ['incident', 'operations', 'runbook'],
    },
    {
      title: 'Benefits Overview',
      content: '# Benefits Overview\n\nWe offer a comprehensive benefits package.\n\n## Health\n- Medical, dental, vision\n- Mental health coverage\n\n## Time Off\n- Unlimited PTO policy\n- Parental leave',
      categoryId: categories[1].id,
      tagNames: ['benefits', 'hr'],
    },
    {
      title: 'API Style Guide',
      content: '# API Style Guide\n\nConventions for building internal and external APIs.\n\n## REST Conventions\n- Use nouns for resources\n- Use plural forms\n- Return consistent envelopes: { data, error }',
      categoryId: categories[0].id,
      tagNames: ['api', 'engineering', 'style-guide'],
    },
    {
      title: 'Accessibility Guidelines',
      content: '# Accessibility Guidelines\n\nAll features must be accessible by default.\n\n## Keyboard\n- All interactive elements must be keyboard-reachable.\n- Use visible focus rings.\n\n## Screen Readers\n- Use semantic HTML.\n- Provide labels for every input.',
      categoryId: categories[3].id,
      tagNames: ['a11y', 'design-system'],
    },
    {
      title: 'Remote Work Policy',
      content: '# Remote Work Policy\n\nWe are a remote-first company.\n\n## Core Hours\n- 10am–2pm in your local timezone\n- Async outside core hours\n\n## Equipment\n- Laptop and monitor provided\n- Home office stipend available',
      categoryId: categories[1].id,
      tagNames: ['remote', 'policy'],
    },
    {
      title: 'Release Notes Process',
      content: '# Release Notes Process\n\nHow we write and publish release notes.\n\n## Template\n- Title with version\n- Summary paragraph\n- Breaking changes section\n- Bug fixes and features',
      categoryId: categories[2].id,
      tagNames: ['release-notes', 'process'],
    },
  ];

  for (const a of articlesData) {
    const slug = slugify(a.title);
    const excerpt = a.content.replace(/#+\s/g, '').slice(0, 160).trim();
    const tags = await ensureTags(a.tagNames);
    await prisma.article.create({
      data: {
        slug,
        title: a.title,
        content: a.content,
        excerpt,
        status: 'PUBLISHED',
        categoryId: a.categoryId ?? null,
        tags: {
          connect: tags.map((t) => ({ id: t.id })),
        },
      },
    });
  }

  console.log(`Seeded ${categories.length} categories and ${articlesData.length} articles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });