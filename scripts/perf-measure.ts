// Iteration 8.1: measure `architecture.md` §13.1's server-side budgets against a
// 2,000-article dataset. This exercises the *same repository functions the routes
// call*, which is what the budgets describe — it is a query/render-cost probe, not
// an HTTP server, so it isolates the data layer from Next's dev/prod response
// timing and gives a stable p75.
//
// Run: `DATABASE_FILE=./data/kb.perf.db npx tsx scripts/perf-measure.ts`
import 'dotenv/config';
import { performance } from 'node:perf_hooks';
import { sql } from 'drizzle-orm';
import { listQuerySchema } from '../src/lib/validation/query';
import { createDatabase } from '../src/server/db/create';
import { createArticleRepository } from '../src/server/repositories/articles';
import { createCategoryRepository } from '../src/server/repositories/categories';
import { createSearchRepository } from '../src/server/repositories/search';

const file = process.env.DATABASE_FILE ?? './data/kb.perf.db';
const RUNS = Number(process.env.PERF_RUNS ?? 50);

const { sqlite, db } = createDatabase(file);

const articleRepo = createArticleRepository(db);
const searchRepo = createSearchRepository(db, { onFallback: () => {} });
const categoryRepo = createCategoryRepository(db);

function p75(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1);
  return sorted[index];
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Runs `fn` `RUNS` times, discarding one warm-up pass, and returns p75 in ms. */
function measure(label: string, fn: () => void): number {
  fn(); // warm-up
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  const value = p75(samples);
  console.log(
    `${label.padEnd(34)} p75 ${value.toFixed(2).padStart(8)} ms   median ${median(samples)
      .toFixed(2)
      .padStart(8)} ms   (n=${RUNS})`,
  );
  return value;
}

const counts = db.get<{ n: number }>(sql`SELECT count(*) AS n FROM articles`);
console.log(`Dataset: ${JSON.stringify(counts)}\n`);

const browseQuery = listQuerySchema.parse({});
const detailSlug = 'deploy-guide-1';
const searchTerm = 'deploy';

measure('browse listArticles page 1 (§9.1)', () => {
  articleRepo.listArticles(browseQuery);
});

measure('browse page 2 (count(*) path)', () => {
  articleRepo.listArticles(listQuerySchema.parse({ page: '2' }));
});

measure('detail getArticleBySlug', () => {
  articleRepo.getArticleBySlug(detailSlug);
});

measure('search searchArticles(deploy)', () => {
  const result = searchRepo.searchArticles(searchTerm);
  if (!result.ok) throw new Error('search failed');
});

measure('search countSearchResults(deploy)', () => {
  searchRepo.countSearchResults(searchTerm);
});

measure('categories listWithCounts', () => {
  categoryRepo.listWithCounts();
});

console.log('\nEXPLAIN QUERY PLAN — browse page 1:');
for (const row of db.all<{ detail: string }>(
  sql`EXPLAIN QUERY PLAN SELECT * FROM articles ORDER BY updated_at DESC LIMIT 21`,
)) {
  console.log('  ' + row.detail);
}

sqlite.close();
