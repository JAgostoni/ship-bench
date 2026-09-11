// No `server-only`: this module is imported by scripts/seed.ts and by tests.
import { eq } from 'drizzle-orm';
import type { Database } from './create';
import { articleRevisions, articles, categories } from './schema';

type SeedCategory = {
  name: string;
  slug: string;
  description: string;
};

type SeedArticle = {
  slug: string;
  title: string;
  summary: string | null;
  bodyMd: string;
  status: 'draft' | 'published';
  categorySlug: string | null;
  /** Number of revision rows to write; revision 1 is always the initial state. */
  revisions?: number;
};

const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Engineering',
    slug: 'engineering',
    description: 'Architecture, tooling, and how we build and ship software.',
  },
  {
    name: 'Product',
    slug: 'product',
    description: 'Roadmaps, discovery notes, and product decisions.',
  },
  {
    name: 'People',
    slug: 'people',
    description: 'Onboarding, team practices, and working agreements.',
  },
  {
    name: 'Operations',
    slug: 'operations',
    description: 'Runbooks, incident response, and day-to-day service operations.',
  },
];

const SEED_ARTICLES: SeedArticle[] = [
  {
    slug: 'deploying-the-api-to-production',
    title: 'Deploying the API to Production',
    summary:
      'The end-to-end production release checklist, including the deploy command, rollback steps, and verification gates.',
    status: 'published',
    categorySlug: 'engineering',
    revisions: 3,
    bodyMd: `## Overview

This runbook covers a standard production deploy of the API service. A deploy
takes roughly six minutes end to end when CI is green.

## Prerequisites

- A clean working tree on \`main\`.
- The release branch has passed CI (typecheck, lint, tests, build).
- The on-call engineer has acknowledged the change window in \`#releases\`.

## The deploy command

\`\`\`bash
# Build the release artifact, then roll it out to the primary region.
npm run build
fly deploy --strategy rolling --wait-timeout 300
\`\`\`

If the deploy stalls, check the health endpoint before retrying. Do **not** run
the deploy command twice in a row.

## Environment matrix

| Environment | Region | Database            | Auto-deploy |
| ----------- | ------ | ------------------- | ----------- |
| Development | local  | SQLite (file)       | n/a         |
| Staging     | us-east-1 | Postgres 16      | On merge    |
| Production  | us-east-1 | Postgres 16      | Manual      |

## Release checklist

- [ ] Confirm CI is green on the release commit
- [ ] Announce the change window in \`#releases\`
- [ ] Run the deploy command
- [ ] Verify \`/api/health\` returns \`ok\`
- [ ] Watch error rates for ten minutes
- [ ] Post the release summary

## Rolling back

A rollback re-deploys the previous artifact. The database migrations are
forward-only, so confirm the schema change is backward compatible before
rolling back.

\`\`\`bash
fly releases list
fly deploy --image <previous-image>
\`\`\`

## Notes

Deploying on Friday afternoon is allowed but discouraged. If you deploy late,
stay available until the error rate returns to baseline.`,
  },
  {
    slug: 'incident-response-runbook',
    title: 'Incident Response Runbook',
    summary: 'How we detect, triage, communicate about, and learn from production incidents.',
    status: 'published',
    categorySlug: 'operations',
    bodyMd: `## Severity levels

We classify incidents by user impact, not by how exotic the cause is.

| Severity | Definition                          | Response time |
| -------- | ----------------------------------- | ------------- |
| SEV-1    | Total outage or data loss           | 5 minutes     |
| SEV-2    | Major feature unavailable           | 30 minutes    |
| SEV-3    | Degraded performance or minor bug   | Next business day |

## Roles

Every incident has exactly one **incident commander**. The commander does not
debug; they coordinate, communicate, and decide.

## First five minutes

- [ ] Declare the incident in \`#incidents\`
- [ ] Assign an incident commander
- [ ] Start a shared notes document
- [ ] Post an initial status update

## Communication cadence

For a SEV-1, post a status update every fifteen minutes even when there is
nothing new. Silence is worse than an unhelpful update.

## After the incident

The commander writes a blameless postmortem within three business days. The
postmortem lists contributing factors, not a single root cause, and produces
action items with owners and dates.

If the incident began with a deploy, freeze further deploys until the incident
is fully resolved and the postmortem action items are filed.

## Notes

Our current staging environment mirrors the production database schema but not
its data volume, so capacity problems frequently surface first in production.`,
  },
  {
    slug: 'setting-up-your-local-environment',
    title: 'Setting Up Your Local Environment',
    summary: null,
    status: 'published',
    categorySlug: 'engineering',
    bodyMd: `## Install the toolchain

We use Node.js 24 LTS. Version managers vary by platform; \`.nvmrc\` pins the
exact version the project targets.

\`\`\`bash
nvm use
npm install
cp .env.example .env.local
\`\`\`

## Prepare the database

The application ships with a seed script so a fresh clone is immediately
usable.

\`\`\`bash
npm run db:setup
npm run dev
\`\`\`

## Daily commands

| Goal                | Command            |
| ------------------- | ------------------ |
| Start the dev server | \`npm run dev\`     |
| Run all checks       | \`npm run verify\`  |
| Reset local data     | \`npm run db:reset\` |

## Before your first pull request

- [ ] \`npm run verify\` passes locally
- [ ] Any new environment variable is added to \`.env.example\`
- [ ] Any schema change includes a generated migration

## Notes

When you ship a change that touches the schema, remember that the search index
is rebuilt separately from the relational tables.

The first time you deploy a change, ask your onboarding buddy to walk through
the production runbook with you before you start.`,
  },
  {
    slug: 'product-roadmap-q4',
    title: 'Product Roadmap: Q4',
    summary: 'The commitments, the deliberately deferred work, and the reasoning behind both.',
    status: 'published',
    categorySlug: 'product',
    bodyMd: `## Themes

Q4 has three themes: **reliability**, **search quality**, and **editorial
workflow**.

## Committed work

| Theme          | Deliverable                        | Owner    |
| -------------- | ---------------------------------- | -------- |
| Reliability    | Automated index consistency checks | Platform |
| Search quality | Ranked results with snippets       | Platform |
| Workflow       | Markdown editor with live preview  | Product  |

## Explicitly deferred

- Tags and nested categories. The data model supports them but the interface
  does not need them yet.
- Revision diffing. History stays view-only this quarter.

## How we will know it worked

Search is the only feature with a measurable target: internal users should find
a known article in under ten seconds without using the sidebar.

## Notes

We are deliberately not building a mobile-native client this quarter.`,
  },
  {
    slug: 'writing-effective-design-docs',
    title: 'Writing Effective Design Docs',
    summary: 'A short template and the review habits that make design docs worth reading.',
    status: 'published',
    categorySlug: 'product',
    bodyMd: `## Why we write them

A design doc is a decision record, not a tutorial. Write it so a reader six
months from now can understand *why* the system works the way it does.

## Template

1. **Context** — what problem exists today.
2. **Goals and non-goals** — the boundary of the change.
3. **Proposal** — the design, with a diagram.
4. **Alternatives considered** — what you rejected and why.
5. **Open questions** — what you are still unsure about.

## Review habits

- Reviewers read the doc before the meeting.
- Disagreement is recorded in the doc, not only in the thread.
- The author, not the reviewer, decides when the doc is ready.

## Common failure modes

| Failure              | Fix                                     |
| -------------------- | --------------------------------------- |
| Buried the lede      | Put the proposal in the first paragraph |
| No alternatives      | List at least two rejected options      |
| Undefined terms      | Define them at first use                |

## Notes

A design doc that is never revisited is a sign the alternatives section was
too thin to matter.`,
  },
  {
    slug: 'onboarding-checklist-for-new-engineers',
    title: 'Onboarding Checklist for New Engineers',
    summary: 'The first-week plan, the first-month goals, and who to ask for what.',
    status: 'published',
    categorySlug: 'people',
    bodyMd: `## Day one

- [ ] Collect your laptop and accounts
- [ ] Join the team channels
- [ ] Pair with your onboarding buddy for the afternoon

## Week one

Your goal is to ship one small change to production. It does not matter how
small; the point is to exercise the whole path from branch to release.

- [ ] Set up the local environment
- [ ] Read the architecture document
- [ ] Ship one small change
- [ ] Review someone else's pull request

## Month one

- [ ] Own a small feature end to end
- [ ] Join the on-call rotation as an observer
- [ ] Write one design doc

## Who to ask

| Question                     | Ask                      |
| ---------------------------- | ------------------------ |
| Access and accounts          | Onboarding buddy         |
| Architecture and design      | Any engineer on the team |
| Roadmap and priorities       | Your manager             |

## Notes

The first change should be intentionally trivial. A typo fix still proves you
can build, test, and merge.`,
  },
  {
    slug: 'code-review-guidelines',
    title: 'Code Review Guidelines',
    summary: null,
    status: 'published',
    categorySlug: null,
    bodyMd: `## What reviewers look for

Review for correctness first, then clarity, then style. Style disagreements are
resolved by the formatter, not by the review thread.

## Author expectations

- Keep pull requests under roughly 400 changed lines.
- Describe the *why* in the description; the *what* is visible in the diff.
- Respond to every comment, even if only to say "fixed" or "disagree, because…".

## Reviewing

| Signal                    | Response                                  |
| ------------------------- | ----------------------------------------- |
| Missing test              | Request one, or offer to add it           |
| Unclear name              | Suggest a better one, do not demand it    |
| Structural concern        | Raise it before the line-by-line comments |

## Turnaround

We aim to leave a first review within one business day. If you cannot, say so
in the thread so the author can find another reviewer.

## Notes

Approval is not a guarantee of correctness. It means the change is a reasonable
improvement and you are willing to be accountable for it.`,
  },
  {
    slug: 'draft-q1-planning-notes',
    title: 'Draft: Q1 Planning Notes',
    summary: 'Working notes for the Q1 planning session. Not yet reviewed.',
    status: 'draft',
    categorySlug: 'product',
    bodyMd: `## Scratch notes

These are unedited notes from the planning session. They are a draft and should
not be circulated outside the team until reviewed.

## Candidate themes

- Search relevance and snippet quality
- Editorial workflow improvements
- Reducing time-to-first-contribution for new engineers

## Questions to resolve

- How much of the quarter goes to reliability work?
- Do we revisit the taxonomy question, or defer it again?
- What is the measurable outcome for the search work?`,
  },
  {
    slug: 'draft-migrating-to-postgres',
    title: 'Draft: Migrating to Postgres',
    summary: 'An early sketch of a future database migration. Placeholder only.',
    status: 'draft',
    categorySlug: 'engineering',
    bodyMd: `## Status

Draft. This is a placeholder for a migration we have not scheduled.

## Why consider it

The current embedded database is a single file, which caps us at a single
application instance. When we need more than one instance, the storage layer
becomes the constraint.

## Sketch

- Move the schema to a server-backed database.
- Replace the full-text search table with a native inverted index.
- Keep the repository boundary intact so the change stays contained.

## Open questions

- What is the acceptable amount of downtime?
- Do we need a dual-write period, or is a maintenance window enough?
- Who owns the migration?`,
  },
];

const EDITORS = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Anonymous editor'];

export function seed(db: Database): void {
  db.transaction((tx) => {
    // Idempotent: wipe the fixed dataset, then re-insert it. Deleting articles
    // cascades to article_revisions and fires the FTS5 delete trigger.
    tx.delete(articles).run();
    tx.delete(categories).run();

    const now = Date.now();

    const categoryIds = new Map<string, number>();
    for (const category of SEED_CATEGORIES) {
      const [row] = tx
        .insert(categories)
        .values({
          name: category.name,
          slug: category.slug,
          description: category.description,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        })
        .returning({ id: categories.id })
        .all();
      categoryIds.set(category.slug, row.id);
    }

    SEED_ARTICLES.forEach((article, index) => {
      const publishedAt = article.status === 'published' ? new Date(now - index * 3_600_000) : null;
      const createdAt = new Date(now - (SEED_ARTICLES.length - index) * 86_400_000);

      const [row] = tx
        .insert(articles)
        .values({
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          bodyMd: article.bodyMd,
          status: article.status,
          categoryId: article.categorySlug ? (categoryIds.get(article.categorySlug) ?? null) : null,
          version: article.revisions ?? 1,
          publishedAt,
          createdAt,
          updatedAt: new Date(now - index * 3_600_000),
        })
        .returning({ id: articles.id })
        .all();

      const revisionCount = article.revisions ?? 1;
      for (let n = 1; n <= revisionCount; n++) {
        const isLatest = n === revisionCount;
        tx.insert(articleRevisions)
          .values({
            articleId: row.id,
            revisionNumber: n,
            title: article.title,
            summary: article.summary,
            bodyMd: isLatest ? article.bodyMd : `<!-- revision ${n} -->\n${article.bodyMd}`,
            editorName: EDITORS[(index + n) % EDITORS.length],
            changeNote: n === 1 ? 'Initial version' : `Revision ${n}`,
            createdAt: new Date(createdAt.getTime() + n * 60_000),
          })
          .run();
      }
    });
  });
}
