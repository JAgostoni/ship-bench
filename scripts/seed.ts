import { db } from '../src/db';
import { articles, categories } from '../src/db/schema';
import { v4 as uuidv4 } from 'uuid';

const now = new Date();

const articlesToSeed = [
  {
    title: 'Getting Started with the Knowledge Base',
    content: `# Getting Started

Welcome to the team Knowledge Base! This guide will help you navigate the app.

## What is this?

This is our internal documentation hub where we store:

- Engineering guides and best practices
- Troubleshooting runbooks
- Onboarding documentation

## How to Use

1. **Browse** articles on the home page
2. **Search** using the search bar in the header
3. **Create** new articles with the "+ New" button

## Writing Articles

Articles are written in Markdown. Here's a quick reference:

- Use \`#\` for headings
- Use \`**bold**\` and \`*italic*\` for emphasis
- Use backticks for inline \`code\`
- Use triple backticks for code blocks:

\`\`\`typescript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

> **Pro tip**: Use the search bar (Ctrl+K) to quickly find what you need.

Happy writing!`,
  },
  {
    title: 'Project Architecture Overview',
    content: `# Architecture Overview

This document describes the technical architecture of the Knowledge Base application.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) |
| Styling | Tailwind CSS 4 |
| Database | SQLite (better-sqlite3) |
| ORM | Drizzle ORM |
| Search | SQLite FTS5 |

## Directory Structure

\`\`\`
app/          # Next.js App Router pages
components/   # Shared React components
src/db/       # Database connection and schema
src/lib/      # Utility functions
scripts/      # Development scripts
drizzle/      # Database migrations
\`\`\`

## Key Decisions

1. **Server Components by default** — Client components only when interactivity is needed.
2. **SQLite for simplicity** — Zero-config database, perfect for small teams.
3. **Drizzle ORM** — Type-safe queries with excellent TypeScript support.

For more details, see \`docs/architecture.md\`.`,
  },
  {
    title: 'How to Contribute to Documentation',
    content: `# How to Contribute

Everyone on the team can create and edit articles. Here's how:

## Creating an Article

1. Click **"+ New"** in the header
2. Enter a descriptive title
3. Write your content in Markdown
4. Preview in the right pane
5. Click **Save** when ready

## Markdown Tips

- Use headings (\`##\`) to structure long articles
- Links: \`[text](url)\`
- Images are not supported in v1
- For code, always specify the language

## Editing Guidelines

- Keep articles up to date
- Add an \`Updated \` date at the top for significant changes
- If an article becomes obsolete, mark it clearly at the top`,
  },
  {
    title: 'Troubleshooting: Database Connection Issues',
    content: `# Troubleshooting: Database Connection

## Symptoms

The app fails to start with errors like:

- \`unable to open database file\`
- \`SQLITE_CANTOPEN\`

## Likely Causes

1. **Missing data directory**: The \`data/\` folder must exist.
2. **Incorrect path**: The database path in \`src/db/index.ts\` should resolve to \`./data/knowledge-base.db\`.
3. **File permissions**: Ensure Node.js can write to the \`data/\` directory.

## Resolution

\`\`\`bash
# Recreate the data directory
mkdir -p data

# Re-initialize the database
npm run seed
\`\`\`

## Prevention

- Never commit the \`data/\` directory (already in \`.gitignore\`)
- Always run \`npm run seed\` after pulling the repo`,
  },
  {
    title: 'Design System Tokens',
    content: `# Design Tokens

This page summarizes the visual style system used in the Knowledge Base app.

## Colors

| Token | Hex | Usage |
|---|---|---|
| bg | \`#F8F9FA\` | Page background |
| surface | \`#FFFFFF\` | Card backgrounds |
| accent | \`#3B82F6\` | Links, buttons |
| text | \`#1A1A2E\` | Primary text |
| text-muted | \`#868E96\` | Secondary info |

## Typography Scale

- \`--text-3xl\` (30px) — Page titles
- \`--text-2xl\` (24px) — Article titles
- \`--text-base\` (16px) — Body text
- \`--text-sm\` (14px) — Meta, previews
- \`--text-xs\` (12px) — Badges

All tokens are defined as CSS custom properties in \`app/global.css\`.`,
  },
  {
    title: 'Quick: How to restart the dev server',
    content: `Kill the existing process and run \`npm run dev\`.`,
  },
  {
    title: 'Quick: Where is the database file?',
    content: `The SQLite database lives at \`data/knowledge-base.db\`. It is gitignored.`,
  },
];

const categoriesToSeed = [
  { name: 'Getting Started', slug: 'getting-started', description: 'Onboarding and setup guides' },
  { name: 'Engineering', slug: 'engineering', description: 'Technical documentation and architecture' },
  { name: 'Troubleshooting', slug: 'troubleshooting', description: 'How to fix common issues' },
];

async function seed() {
  console.log('🌱 Seeding database...');

  // Seed categories
  console.log('Seeding categories...');
  for (const cat of categoriesToSeed) {
    await db.insert(categories).values({
      id: uuidv4(),
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      createdAt: now.toISOString(),
    });
  }
  console.log(`  ✓ Inserted ${categoriesToSeed.length} categories`);

  // Seed articles with staggered dates
  console.log('Seeding articles...');
  const articleDbEntries = [];
  for (let i = 0; i < articlesToSeed.length; i++) {
    const createdAt = new Date(now.getTime() - (articlesToSeed.length - i) * 24 * 60 * 60 * 1000);
    const article = articlesToSeed[i];

    const [inserted] = await db.insert(articles).values({
      id: uuidv4(),
      title: article.title,
      content: article.content,
      status: 'published',
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    }).returning();

    articleDbEntries.push(inserted);
  }
  console.log(`  ✓ Inserted ${articlesToSeed.length} articles`);

  console.log(`\n✅ Database seeded! ${articleDbEntries.length} articles, ${categoriesToSeed.length} categories.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
