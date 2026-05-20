import { db } from './db';
import { categories, articles } from './schema';

async function main() {
  console.log("Seeding database...");
  
  // Clean database
  await db.delete(articles);
  await db.delete(categories);

  // Seed Categories
  const [catEng] = await db.insert(categories).values({
    name: "Engineering",
    slug: "engineering",
    description: "Technical specifications, environment setups, and coding guidelines.",
  }).returning();

  const [catProd] = await db.insert(categories).values({
    name: "Product",
    slug: "product",
    description: "Product roadmaps, release specifications, and client briefs.",
  }).returning();

  const [catOps] = await db.insert(categories).values({
    name: "Operations",
    slug: "operations",
    description: "Deployment runbooks, backup configurations, and general operations.",
  }).returning();

  // Seed Articles
  await db.insert(articles).values([
    {
      title: "Setup Node.js Development Environment",
      slug: "setup-nodejs-development-environment",
      categoryId: catEng.id,
      status: "published",
      content: `# Getting Started with Node.js Setup

Follow these basic guidelines to configure your project structure and libraries:

## Required Tools
* Node.js v24.x or higher
* npm v10.x or higher
* A clean terminal interface

## Setup Sequence
1. Clone the repository locally
2. Configure environmental options in \`.env\`
3. Run \`npm install\` to prepare assets

| Command | Action |
| :--- | :--- |
| \`npm run dev\` | Spin up local hot-reloader dev-server |
| \`npm run test\` | Execute Vitest assertions suite |

\`\`\`typescript
// Verify system runtime capabilities
console.log("System Initialized!");
\`\`\`
`,
    },
    {
      title: "Core System Architecture Overview",
      slug: "core-system-architecture-overview",
      categoryId: catEng.id,
      status: "published",
      content: `# Core System Architecture

An overview of our application stack:

* **Front-End**: Next.js App Router with Vanilla CSS Module layouts.
* **Database**: SQLite with Write-Ahead Logging (WAL) and synchronous standard mode enabled.
* **ORM Layer**: Drizzle ORM mapping SQL schema bindings to client files.
* **Search Utility**: Native SQLite FTS5 matching indexes automatically updated via database triggers.
`,
    },
    {
      title: "Product Milestones & Roadmap Review",
      slug: "product-milestones-roadmap-review",
      categoryId: catProd.id,
      status: "published",
      content: `# Product Milestones & Roadmap Review

Our execution schedule is planned in three focused phases:

## Phase 1: Local Development & Search Focus
- Setup stable configurations and database triggers.
- Verify sub-millisecond full-text queries.

## Phase 2: Collaboration Workspace
- Introduce WebSockets and real-time live cursors.

## Phase 3: Access Permissions (RBAC)
- Define admin boundaries and account rules.
`,
    },
    {
      title: "Q4 Product Strategy Draft",
      slug: "q4-product-strategy-draft",
      categoryId: catProd.id,
      status: "draft",
      content: `# Q4 Product Strategy Notes

> [!NOTE]
> This is a high-priority draft. Do not publish it publicly.

We are outlining the upcoming marketing campaign targets, key product features, and user feedback metrics to review.
`,
    },
    {
      title: "General Onboarding Guide",
      slug: "general-onboarding-guide",
      categoryId: null, // Uncategorized
      status: "published",
      content: `# Welcome to TeamKB

This general onboarding guide covers the foundational knowledge you need on day one.

## Helpful Tips
* Request access permissions for Slack and GitHub.
* Keep standard coding specs active in your workspace.
* Review general office FAQs.
`,
    }
  ]);

  console.log("Seeding completed successfully!");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
