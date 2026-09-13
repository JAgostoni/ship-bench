// One-off dataset generator for the iteration-8 performance budgets
// (`architecture.md` §13.1). Deliberately NOT part of `npm run db:seed`: the
// application's canonical dataset is 4 categories / 9 articles, and a 2,000-row
// dataset must never leak into a developer's working database or the E2E fixture.
//
// Run: `DATABASE_FILE=./data/kb.perf.db npx tsx scripts/perf-seed.ts --scale=2000`
//
// Generates deterministic, realistic-shaped rows (a few hundred distinct body
// paragraphs reused across articles, so FTS5 sees a word distribution rather than
// 2,000 identical documents) and prints the resulting row counts.
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDatabase } from '../src/server/db/create';
import { articleRevisions, articles, categories } from '../src/server/db/schema';
import { FTS5_DDL } from '../src/server/db/search-index-ddl';

const SCALE = Number(
  (process.argv.find((arg) => arg.startsWith('--scale=')) ?? '--scale=2000').split('=')[1],
);
const file = process.env.DATABASE_FILE ?? './data/kb.perf.db';

if (file.includes('kb.db') && !file.includes('perf')) {
  console.error('Refusing to write a scaled dataset into a non-perf database:', file);
  process.exit(1);
}

mkdirSync(dirname(file), { recursive: true });

const { sqlite, db } = createDatabase(file);

// A fresh perf database each run, so the measurement is never polluted by a
// previous scale. The file itself is deleted after measurement (iteration 8.1).
sqlite.exec(`
  DROP TABLE IF EXISTS article_search;
  DROP TRIGGER IF EXISTS articles_search_ai;
  DROP TRIGGER IF EXISTS articles_search_ad;
  DROP TRIGGER IF EXISTS articles_search_au;
  DROP TABLE IF EXISTS article_revisions;
  DROP TABLE IF EXISTS articles;
  DROP TABLE IF EXISTS categories;
`);
migrate(db, { migrationsFolder: './drizzle' });
// `search-index.ts` imports `client.ts`, which needs a booted server; the raw DDL is
// the same multi-statement string and is all this script needs.
sqlite.exec(FTS5_DDL);

const TOPICS = [
  'deploy',
  'incident',
  'onboarding',
  'review',
  'roadmap',
  'architecture',
  'search',
  'index',
  'schema',
  'migration',
  'observability',
  'runbook',
  'testing',
  'accessibility',
  'performance',
  'caching',
  'editorial',
  'workflow',
  'security',
  'backup',
];

const SECTIONS = [
  'Overview',
  'Prerequisites',
  'Step by step',
  'Rollback',
  'Verification',
  'Common failure modes',
  'Open questions',
  'Notes',
];

/** A body in the same shape as the seed articles, with a fenced block and a table. */
function bodyFor(index: number): string {
  const topic = TOPICS[index % TOPICS.length];
  const second = TOPICS[(index * 7 + 3) % TOPICS.length];
  const seed = (index % 37) + 1;

  return `## Overview

This article documents the ${topic} process as the team currently understands it.
It is one of ${SCALE} generated articles used to measure the browse and search
budgets against a realistic corpus rather than the nine-article seed.

## Prerequisites

- A clean working tree on \`main\`.
- The ${second} checklist for the release has been opened by the on-call engineer.
- Baseline case ${seed} has been reproduced locally at least once.

## Step by step

\`\`\`bash
# Case ${seed}: run the ${topic} helper and inspect the ${second} output.
npm run db:check
npm run verify
\`\`\`

The ${topic} step is idempotent. Re-running it does not change the observed state.

## Verification

| Signal | Expected | Owner |
| --- | --- | --- |
| ${topic} health | ok | Platform |
| ${second} latency | under budget | Platform |
| Error rate | flat for ten minutes | On-call |

- [ ] Confirm ${topic} completed
- [ ] Confirm ${second} recovered
- [ ] Post the summary

## Open questions

Case ${seed} still has an unresolved question about how the ${second}
interacts with ${topic} when the corpus grows. Recorded here for the next review.
`;
}

const EDITORS = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Anonymous editor'];
const CATEGORY_NAMES = ['Engineering', 'Product', 'People', 'Operations', 'Reference'];

console.log(`Generating ${SCALE} articles into ${file}…`);

db.transaction((tx) => {
  tx.delete(articles).run();
  tx.delete(categories).run();

  const now = Date.now();
  const categoryIds: number[] = [];

  CATEGORY_NAMES.forEach((name, i) => {
    const [row] = tx
      .insert(categories)
      .values({
        name,
        slug: name.toLowerCase(),
        description: `${name} documentation.`,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning({ id: categories.id })
      .all();
    categoryIds.push(row.id);
  });

  for (let i = 0; i < SCALE; i++) {
    const topic = TOPICS[i % TOPICS.length];
    const published = i % 8 !== 0; // ~12.5% drafts
    const createdAt = new Date(now - (SCALE - i) * 60_000);
    const updatedAt = new Date(now - i * 1_000);

    const [row] = tx
      .insert(articles)
      .values({
        title: `${topic[0].toUpperCase()}${topic.slice(1)} guide ${i + 1}`,
        slug: `${topic}-guide-${i + 1}`,
        summary: `How to handle ${topic} case ${(i % 37) + 1} in production.`,
        bodyMd: bodyFor(i),
        status: published ? 'published' : 'draft',
        categoryId: categoryIds[i % categoryIds.length],
        version: 1,
        publishedAt: published ? createdAt : null,
        createdAt,
        updatedAt,
      })
      .returning({ id: articles.id, title: articles.title, summary: articles.summary })
      .all();

    tx.insert(articleRevisions)
      .values({
        articleId: row.id,
        revisionNumber: 1,
        title: row.title,
        summary: row.summary,
        bodyMd: bodyFor(i),
        editorName: EDITORS[i % EDITORS.length],
        changeNote: 'Initial version',
        createdAt,
      })
      .run();
  }
});

const counts = db.get<{ articles: number; categories: number; published: number }>(sql`
  SELECT
    (SELECT count(*) FROM articles) AS articles,
    (SELECT count(*) FROM categories) AS categories,
    (SELECT count(*) FROM articles WHERE status = 'published') AS published
`);

console.log('Rows:', counts);
console.log('Search index rebuilt…');
db.run(sql`INSERT INTO article_search(article_search) VALUES ('rebuild')`);

sqlite.close();
console.log('Perf database ready at', file);
