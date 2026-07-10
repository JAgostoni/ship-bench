/**
 * Seed script: categories, tags, articles + FTS index.
 * Run: npm run db:seed  (or prisma migrate reset)
 *
 * Uses a dedicated Prisma client (not the Next singleton) so seed works
 * outside the app process. Pure utils are imported via relative paths.
 */
import "dotenv/config";
import { PrismaClient, type ArticleStatus } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";
import { makeExcerpt, stripHtml } from "../src/lib/utils/excerpt";
import { sanitizeHtml } from "../src/lib/utils/sanitize";

function resolveSqliteUrl(databaseUrl: string): string {
  if (databaseUrl === ":memory:" || databaseUrl.startsWith("file::memory:")) {
    return ":memory:";
  }
  const withoutScheme = databaseUrl.replace(/^file:/, "");
  if (path.isAbsolute(withoutScheme)) return withoutScheme;
  return path.join(process.cwd(), withoutScheme);
}

const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url: resolveSqliteUrl(rawUrl) });
const prisma = new PrismaClient({ adapter });

async function ensureFtsSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  article_id UNINDEXED,
  title,
  content,
  tokenize = 'unicode61'
);
`);
}

async function syncArticleToFts(
  articleId: string,
  title: string,
  plainContent: string,
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `DELETE FROM articles_fts WHERE article_id = ?`,
    articleId,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO articles_fts(article_id, title, content) VALUES (?, ?, ?)`,
    articleId,
    title,
    plainContent,
  );
}

type SeedArticle = {
  title: string;
  slug: string;
  status: ArticleStatus;
  categorySlug: string | null;
  tagSlugs: string[];
  contentHtml: string;
};

const CATEGORIES = [
  { name: "Engineering", slug: "engineering" },
  { name: "Product", slug: "product" },
  { name: "HR", slug: "hr" },
  { name: "Operations", slug: "operations" },
];

const TAGS = [
  { name: "onboarding", slug: "onboarding" },
  { name: "runbook", slug: "runbook" },
  { name: "rfc", slug: "rfc" },
  { name: "faq", slug: "faq" },
  { name: "process", slug: "process" },
  { name: "security", slug: "security" },
];

const ARTICLES: SeedArticle[] = [
  {
    title: "New Hire Onboarding Checklist",
    slug: "new-hire-onboarding",
    status: "PUBLISHED",
    categorySlug: "hr",
    tagSlugs: ["onboarding", "process"],
    contentHtml: `
      <h2>Welcome</h2>
      <p>This onboarding guide covers your first two weeks. Complete laptop setup, accounts, and buddy intro.</p>
      <h3>Day 1</h3>
      <ul>
        <li>Pick up badge and laptop</li>
        <li>Join #general and #team-help</li>
        <li>Read the handbook FAQ</li>
      </ul>
      <p>Questions? Ask your manager or People Ops.</p>
    `,
  },
  {
    title: "How We Deploy to Production",
    slug: "how-we-deploy",
    status: "PUBLISHED",
    categorySlug: "engineering",
    tagSlugs: ["runbook", "process"],
    contentHtml: `
      <h2>Deploy overview</h2>
      <p>We deploy via GitHub Actions. Merge to <code>main</code> triggers staging; promote to production with the release workflow.</p>
      <h3>Steps</h3>
      <ol>
        <li>Open a PR and get review</li>
        <li>Merge when CI is green</li>
        <li>Watch the deploy dashboard for smoke checks</li>
      </ol>
      <p>Rollback: re-run the previous deploy job or revert the commit.</p>
    `,
  },
  {
    title: "Vacation and PTO Policy",
    slug: "vacation-pto-policy",
    status: "PUBLISHED",
    categorySlug: "hr",
    tagSlugs: ["faq", "process"],
    contentHtml: `
      <h2>Taking time off</h2>
      <p>Request vacation in the HR portal at least two weeks ahead when possible. Unlimited PTO with manager approval.</p>
      <ul>
        <li>Block your calendar</li>
        <li>Set Slack status</li>
        <li>Hand off on-call if applicable</li>
      </ul>
      <p>Company holidays are listed on the internal calendar.</p>
    `,
  },
  {
    title: "Product RFC Template",
    slug: "product-rfc-template",
    status: "PUBLISHED",
    categorySlug: "product",
    tagSlugs: ["rfc", "process"],
    contentHtml: `
      <h2>RFC structure</h2>
      <p>Use this template for product change proposals.</p>
      <h3>Sections</h3>
      <ul>
        <li>Problem statement</li>
        <li>Proposed solution</li>
        <li>Alternatives considered</li>
        <li>Success metrics</li>
      </ul>
      <p>Share the RFC in #product-rfcs for feedback before kickoff.</p>
    `,
  },
  {
    title: "Incident Response Runbook",
    slug: "incident-response-runbook",
    status: "PUBLISHED",
    categorySlug: "engineering",
    tagSlugs: ["runbook", "security"],
    contentHtml: `
      <h2>When something breaks</h2>
      <p>Page the on-call engineer. Open an incident channel. Declare severity (SEV1–SEV3).</p>
      <ol>
        <li>Stabilize user impact</li>
        <li>Communicate status</li>
        <li>Write a postmortem within 5 business days</li>
      </ol>
      <blockquote>Never blame individuals — focus on systems.</blockquote>
    `,
  },
  {
    title: "Security FAQ for Engineers",
    slug: "security-faq",
    status: "PUBLISHED",
    categorySlug: "engineering",
    tagSlugs: ["faq", "security"],
    contentHtml: `
      <h2>Common security questions</h2>
      <p>Where do secrets live? In the vault — never commit them. How do I report a vulnerability? Email security@ or use the private form.</p>
      <ul>
        <li>Enable 2FA on all accounts</li>
        <li>Use company SSO where available</li>
        <li>Do not share production access casually</li>
      </ul>
    `,
  },
  {
    title: "Roadmap Planning Cadence",
    slug: "roadmap-planning-cadence",
    status: "PUBLISHED",
    categorySlug: "product",
    tagSlugs: ["process"],
    contentHtml: `
      <h2>Quarterly planning</h2>
      <p>We plan in six-week cycles with a mid-cycle checkpoint. Themes are set by leadership; squads propose bets.</p>
      <p>Track work in Linear. Publish outcomes on the wiki after each cycle.</p>
    `,
  },
  {
    title: "Draft: Office Relocation Notes",
    slug: "office-relocation-notes",
    status: "DRAFT",
    categorySlug: "operations",
    tagSlugs: ["process"],
    contentHtml: `
      <h2>WIP relocation plan</h2>
      <p>This draft captures open questions about the new office floor plan, parking, and hybrid desk booking.</p>
      <p>Do not share externally until published.</p>
    `,
  },
  {
    title: "Draft: Experimental Search Ranking",
    slug: "experimental-search-ranking",
    status: "DRAFT",
    categorySlug: "engineering",
    tagSlugs: ["rfc"],
    contentHtml: `
      <h2>Ideas</h2>
      <p>Exploring BM25 boosts for title matches and recency decay. Not ready for production.</p>
      <pre><code>// pseudocode only
score = bm25 + titleBoost + recency</code></pre>
    `,
  },
  {
    title: "Uncategorized Tips for Remote Work",
    slug: "remote-work-tips",
    status: "PUBLISHED",
    categorySlug: null,
    tagSlugs: ["faq", "onboarding"],
    contentHtml: `
      <h2>Working well remotely</h2>
      <p>Over-communicate async. Keep cameras optional but present for design reviews. Protect focus blocks on your calendar.</p>
      <p>New hires: pair with someone in the same timezone during onboarding week one.</p>
    `,
  },
];

async function main() {
  console.log("Seeding database…");
  console.log(`DATABASE_URL=${rawUrl}`);

  await prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;");
  await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");
  await ensureFtsSchema();

  // Clear existing data (idempotent re-seed)
  await prisma.articleTag.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.$executeRawUnsafe(`DELETE FROM articles_fts`);

  const categoryBySlug = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const created = await prisma.category.create({ data: cat });
    categoryBySlug.set(cat.slug, created.id);
    console.log(`  category: ${cat.name}`);
  }

  const tagBySlug = new Map<string, string>();
  for (const tag of TAGS) {
    const created = await prisma.tag.create({ data: tag });
    tagBySlug.set(tag.slug, created.id);
    console.log(`  tag: ${tag.name}`);
  }

  for (const article of ARTICLES) {
    const safeHtml = sanitizeHtml(article.contentHtml);
    const excerpt = makeExcerpt(safeHtml);
    const plain = stripHtml(safeHtml);
    const categoryId = article.categorySlug
      ? (categoryBySlug.get(article.categorySlug) ?? null)
      : null;

    const created = await prisma.article.create({
      data: {
        title: article.title,
        slug: article.slug,
        contentHtml: safeHtml,
        excerpt,
        status: article.status,
        categoryId,
        tags: {
          create: article.tagSlugs
            .map((s) => tagBySlug.get(s))
            .filter((id): id is string => Boolean(id))
            .map((tagId) => ({ tagId })),
        },
      },
    });

    await syncArticleToFts(created.id, created.title, plain);
    console.log(`  article: ${created.slug} (${created.status})`);
  }

  const counts = {
    categories: await prisma.category.count(),
    tags: await prisma.tag.count(),
    articles: await prisma.article.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
