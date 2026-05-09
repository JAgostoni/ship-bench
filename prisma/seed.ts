import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';
import { setupFTS } from './fts-setup';

const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();

  // Create categories
  const guides = await prisma.category.create({
    data: {
      name: 'Guides',
      slug: 'guides',
      description: 'Step-by-step guides and tutorials',
    },
  });

  const reference = await prisma.category.create({
    data: {
      name: 'Reference',
      slug: 'reference',
      description: 'Technical reference documentation',
    },
  });

  const policies = await prisma.category.create({
    data: {
      name: 'Policies',
      slug: 'policies',
      description: 'Internal policies and guidelines',
    },
  });

  console.log(`Created ${3} categories`);

  // Article 1: Getting Started with the Knowledge Base (published, Guides)
  await prisma.article.create({
    data: {
      title: 'Getting Started with the Knowledge Base',
      slug: 'getting-started-with-the-knowledge-base',
      content: `# Getting Started with the Knowledge Base

Welcome to the Knowledge Base! This guide will help you get up and running quickly.

## What is the Knowledge Base?

The Knowledge Base is your team's central repository for documentation, guides, reference material, and internal policies. Think of it as a shared library where everyone can contribute and find information.

## Key Features

- **Browse articles** by category or view the full list
- **Search** across all article titles and content
- **Write and edit** articles using Markdown
- **Organize** content with categories
- **Track status** with draft and published states

## Writing Your First Article

1. Click the **"New Article"** button in the header
2. Give your article a descriptive title
3. Choose a category (optional but recommended)
4. Write your content using Markdown — use the live preview to see how it will look
5. Click **Publish** when you're ready, or **Save as Draft** to continue later

## Markdown Basics

Markdown is a lightweight markup language that lets you format text easily. Here are some basics:

- Use \`#\` for headings (\`##\` for subheadings, \`###\` for sub-subheadings)
- Use \`**bold**\` for **bold text** and \`*italic*\` for *italic text*
- Use \`- \` for bullet lists (like this one)
- Use \`1. \` for numbered lists
- Use \`[link text](url)\` for links
- Use \`> \` for blockquotes

## Tips for Great Articles

1. **Start with a clear title** that tells readers what to expect
2. **Add an introduction** that summarizes the article's purpose
3. **Use headings** to break content into scannable sections
4. **Include examples** where helpful
5. **Link to related articles** to help readers find more information

## Need Help?

Check out the other articles in the Guides section or search for specific topics using the search bar at the top of the page.

Happy writing!`,
      excerpt: 'Welcome to the Knowledge Base! This guide will help you get up and running quickly. The Knowledge Base is your team\'s central repository for documentation, guides, reference material, and internal policies.',
      status: 'published',
      categoryId: guides.id,
    },
  });

  // Article 2: Development Environment Setup (published, Guides)
  await prisma.article.create({
    data: {
      title: 'Development Environment Setup',
      slug: 'development-environment-setup',
      content: `# Development Environment Setup

This guide walks through setting up a complete development environment for working on the Knowledge Base application.

## Prerequisites

- **Node.js 20** or later
- **npm** (ships with Node.js)
- A code editor (VS Code recommended)

## Step 1: Clone the Repository

\`\`\`bash
git clone https://github.com/your-org/knowledge-base.git
cd knowledge-base
\`\`\`

## Step 2: Install Dependencies

\`\`\`bash
npm install
\`\`\`

## Step 3: Set Up the Database

\`\`\`bash
npm run db:migrate
npm run db:seed
\`\`\`

This creates a local SQLite database and populates it with sample data.

## Step 4: Start the Dev Server

\`\`\`bash
npm run dev
\`\`\`

The app will be available at **http://localhost:3000**.

## Project Structure Overview

- \`src/app/\` — Next.js App Router pages and API routes
- \`src/components/\` — Reusable React components
- \`src/lib/\` — Utility functions and shared logic
- \`prisma/\` — Database schema and migrations
- \`docs/\` — Project documentation

## Running Tests

\`\`\`bash
# Unit tests
npm run test

# E2E tests
npx playwright test
\`\`\`

## Troubleshooting

### Database Issues

If you encounter database errors, try resetting:

\`\`\`bash
npm run db:reset
\`\`\`

### Port Already in Use

If port 3000 is taken, specify a different port:

\`\`\`bash
npm run dev -- -p 3001
\`\`\`

## Next Steps

After setting up, check out the "Getting Started with the Knowledge Base" article to learn how to use the application.`,
      excerpt: 'This guide walks through setting up a complete development environment for working on the Knowledge Base application. Prerequisites include Node.js 20 or later and npm.',
      status: 'published',
      categoryId: guides.id,
    },
  });

  // Article 3: API Reference (published, Reference)
  await prisma.article.create({
    data: {
      title: 'API Reference',
      slug: 'api-reference',
      content: `# API Reference

Complete reference for the Knowledge Base REST API.

## Base URL

All API endpoints are relative to \`/api\`.

## Endpoints

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/articles\` | List articles (with search, filter, pagination) |
| POST | \`/api/articles\` | Create a new article |
| GET | \`/api/articles/[id]\` | Get a single article by ID |
| PUT | \`/api/articles/[id]\` | Update an existing article |
| DELETE | \`/api/articles/[id]\` | Delete an article |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/categories\` | List all categories |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | \`/api/search?q=term\` | Full-text search across articles |

## Query Parameters

### GET /api/articles

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`q\` | string | — | Full-text search query |
| \`category\` | string | — | Filter by category slug |
| \`status\` | string | \`published\` | Filter by status |
| \`page\` | number | \`1\` | Page number |
| \`limit\` | number | \`20\` | Items per page (max 50) |

## Response Format

All list endpoints return:

\`\`\`json
{
  "articles": [...],
  "total": 42,
  "page": 1,
  "totalPages": 3
}
\`\`\`

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 404 | Not Found |
| 500 | Internal Server Error |

## Validation Rules

- **Title:** 1–200 characters, required
- **Content:** 1–100,000 characters, required
- **Status:** \`draft\` or \`published\`
- **Category ID:** Must reference an existing category`,
      excerpt: 'Complete reference for the Knowledge Base REST API. All API endpoints are relative to /api. Covers articles, categories, and search endpoints.',
      status: 'published',
      categoryId: reference.id,
    },
  });

  // Article 4: Code Review Guidelines (draft, Policies)
  await prisma.article.create({
    data: {
      title: 'Code Review Guidelines',
      slug: 'code-review-guidelines',
      content: `# Code Review Guidelines

## Purpose

Code reviews ensure quality, share knowledge, and catch issues before they reach production. These guidelines define our team's review process.

## When to Request a Review

- All code changes must be reviewed before merging
- Draft PRs can be shared early for feedback on approach
- Mark PRs as "Ready for Review" only when CI passes

## Review Priorities

1. **Correctness** — Does the code do what it's supposed to?
2. **Security** — Are there any vulnerabilities?
3. **Performance** — Are there obvious bottlenecks?
4. **Maintainability** — Is the code clear and well-structured?
5. **Style** — Does it follow our conventions?

## Providing Feedback

- Be specific and constructive
- Distinguish between "must fix" and "nice to have"
- Explain *why* a change is suggested
- Offer alternatives when possible

### Good Feedback Example

> This query could be slow with large datasets because it's missing an index. Consider adding an index on the \`status\` column.

### Poor Feedback Example

> This is wrong.

## Responding to Feedback

- Address all comments before re-requesting review
- If you disagree, explain your reasoning respectfully
- Resolve conversations once addressed

## Review Checklist

- [ ] Code compiles without errors
- [ ] Tests pass (existing and new)
- [ ] No hardcoded credentials or secrets
- [ ] Error states are handled
- [ ] Documentation is updated if needed

## Review Size Guidelines

- Keep PRs small (< 400 lines changed when possible)
- Large PRs should be broken into logical commits
- Consider pairing on complex changes before review`,
      excerpt: 'Code reviews ensure quality, share knowledge, and catch issues before they reach production. These guidelines define our team\'s review process.',
      status: 'draft',
      categoryId: policies.id,
    },
  });

  console.log(`Created ${4} articles`);

  // Set up FTS5 indexes and triggers
  const db = new Database(path.join(__dirname, 'dev.db'));
  setupFTS(db);
  db.close();
  console.log('FTS5 indexes and triggers configured');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });