// The 12 sample knowledge-base articles inserted by `npm run db:seed`.
// Kept separate from the seed script so the E2E fixtures (e2e/fixtures.ts)
// can reuse the same data without triggering the script's side effects.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SeedArticle {
  title: string;
  content: string;
  createdDaysAgo: number;
  updatedDaysAgo: number;
}

export interface SeedRow {
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/** Materialize the seed articles as insertable rows, timestamped relative to `now`. */
export function seedRows(now: number): SeedRow[] {
  return SEED_ARTICLES.map((article) => ({
    title: article.title,
    content: article.content,
    createdAt: now - article.createdDaysAgo * DAY_MS,
    updatedAt: now - article.updatedDaysAgo * DAY_MS,
  }));
}

export const SEED_ARTICLES: SeedArticle[] = [
  {
    title: "Deploy checklist",
    createdDaysAgo: 58,
    updatedDaysAgo: 2,
    content: `Every production deploy follows this checklist, no exceptions. It exists because most of our past incidents trace back to a skipped step, not to bad code.

## Before you deploy

- Confirm CI is green on \`main\` — do not deploy a red or yellow build.
- Check #deploys in Slack for an ongoing deploy or a freeze announcement.
- Skim the diff since the last release tag: \`git log --oneline v-last..main\`.
- If the release includes a migration, read the rollback section below first.

## Deploying

1. Tag the release: \`git tag -a vX.Y.Z -m "release notes"\`.
2. Push the tag — the pipeline picks it up automatically.
3. Watch the canary stage for ten minutes. Error rate above 0.5% aborts automatically.
4. Promote to the full fleet from the pipeline UI.

## After the deploy

Watch the dashboards for fifteen minutes. The golden signals live on the *Service Overview* board. If latency p95 climbs more than 20% over baseline, roll back first and investigate second.

## Rolling back

\`\`\`bash
./scripts/release.sh rollback --to v-previous
\`\`\`

Rollbacks are cheap and carry no shame. A rolled-back deploy is a Tuesday; a five-hour outage is a postmortem.`,
  },
  {
    title: "Onboarding guide for new engineers",
    createdDaysAgo: 60,
    updatedDaysAgo: 5,
    content: `Welcome aboard! This guide covers your first two weeks. Your onboarding buddy (assigned in your welcome email) is your first stop for anything unclear.

## Day one

- Pick up your laptop from IT (3rd floor) and set a firmware password.
- Join the team channels: #eng-general, #deploys, #incidents, #random.
- Ask your buddy to add you to the team calendar and standup rotation.

## Your first week

Set up your [local development environment](/articles/3) and get the test suite passing. Then pick a ticket labeled \`good-first-issue\` from the board. The goal of the first PR is not impact — it is walking the full path from clone to merged.

## Access you will need

| System | How to get it | Approver |
| --- | --- | --- |
| GitHub org | Automatic with your @company email | — |
| AWS console | Request in #it-helpdesk | Your manager |
| Production logs | Request the \`log-reader\` role | On-call lead |
| VPN | See the VPN setup article | IT |

## Expectations for the first month

Nobody expects you to ship features in week one. Ask questions in public channels rather than DMs — the answer usually helps the next person too, and most of those threads end up as articles in this knowledge base.`,
  },
  {
    title: "Local development environment setup",
    createdDaysAgo: 55,
    updatedDaysAgo: 9,
    content: `This article walks you from a fresh laptop to a running local stack. Budget about an hour, most of it waiting for downloads.

## Prerequisites

- Node.js 24 via \`nvm\` — the repo has an \`.nvmrc\`, so \`nvm use\` inside the checkout does the right thing.
- Docker Desktop (for the services the app depends on).
- The \`gh\` CLI, authenticated against the company org.

## Getting the stack up

\`\`\`bash
git clone git@github.com:company/app.git
cd app
nvm use
npm install
npm run db:seed
npm run dev
\`\`\`

The app comes up on \`http://localhost:3000\`. If port 3000 is taken, set \`PORT\` in your \`.env\` file.

## Common problems

**\`better-sqlite3\` fails to build.** You are probably on the wrong Node major. Run \`node --version\` and compare with \`.nvmrc\`.

**The dev server starts but pages are blank.** Usually a stale \`.next\` cache after switching branches. Delete the \`.next\` directory and restart.

**Database in a weird state.** Delete the SQLite file under \`data/\` and reseed. Local data is disposable by design.`,
  },
  {
    title: "Incident response runbook",
    createdDaysAgo: 52,
    updatedDaysAgo: 12,
    content: `When something is on fire, this is the order of operations. Print it, bookmark it, internalize it. During an incident nobody should be reading documentation for the first time.

## Severity levels

| Level | Meaning | Response |
| --- | --- | --- |
| SEV1 | Customer-facing outage | Page on-call immediately, incident channel, exec update within 30 min |
| SEV2 | Degraded service, workaround exists | Page on-call, incident channel |
| SEV3 | Internal-only impact | Ticket + next business day |

## First fifteen minutes

1. Declare the incident in #incidents with the \`/incident\` command — this creates the channel and timeline automatically.
2. Assign an incident commander. The IC coordinates; the IC does **not** debug.
3. Stop the bleeding before finding the cause: roll back the last deploy, flip the feature flag, shed load.

## Communication

Post a status update every 30 minutes even if the update is "still investigating." Silence reads as abandonment to everyone outside the channel.

## Afterwards

Every SEV1 and SEV2 gets a blameless postmortem within five working days. The template lives in the postmortem repo. Action items get owners and due dates, or they did not happen.`,
  },
  {
    title: "VPN setup",
    createdDaysAgo: 50,
    updatedDaysAgo: 50,
    content: `Access to internal services (staging, dashboards, the admin panel) requires the company VPN. Setup takes about ten minutes.

## Installing the client

1. Download WireGuard from the official site — not from a package mirror.
2. Request your config in #it-helpdesk; IT generates a per-device profile.
3. Import the \`.conf\` file into the WireGuard client.
4. Activate the tunnel and visit \`https://vpn-check.internal\` — it should greet you by username.

## Rules of the road

- One config per device. Do not share or copy configs between machines.
- Lost or stolen device? Tell IT the same day so the peer key is revoked.
- The VPN routes only internal subnets (split tunnel); your normal traffic is unaffected.

## Troubleshooting

If the tunnel connects but internal hosts do not resolve, your DNS settings are being overridden — toggle the *Block untunneled traffic* option off and reconnect. Still stuck? Post the output of \`wg show\` in #it-helpdesk (it contains no secrets).`,
  },
  {
    title: "Code review guidelines",
    createdDaysAgo: 45,
    updatedDaysAgo: 7,
    content: `Code review is how we share context and catch problems early — it is not a gate to be cleared or a stage for pedantry. These guidelines keep reviews fast and humane.

## For authors

- Keep PRs under ~400 changed lines where possible; split bigger work into stacked PRs.
- Write a description that explains *why*, not just *what*. Link the ticket.
- Review your own diff before requesting review. You will catch half the issues yourself.
- A red CI build means the PR is not ready for eyes. Fix it first.

## For reviewers

- First response within one business day; small PRs deserve same-day review.
- Distinguish blocking comments from preferences. Prefix non-blocking ones with \`nit:\`.
- Review the design and correctness first, style last. The linter owns formatting arguments.
- Approve with comments when the remaining issues are trivial — do not hold a PR hostage for a rename.

## Disagreements

If a thread goes past three back-and-forths, stop typing and talk — a five-minute call resolves what a day of comments cannot. Escalate genuinely stuck disagreements to the tech lead, and record the outcome in the PR so the context is not lost.`,
  },
  {
    title: "On-call rotation handbook",
    createdDaysAgo: 40,
    updatedDaysAgo: 15,
    content: `Every product engineer joins the on-call rotation after their third month. The rotation is weekly, Monday 10:00 to Monday 10:00, with a primary and a secondary.

## What on-call means

- You are the first responder for pages, not the sole fixer. Escalate freely.
- During business hours, you triage incoming alerts and own #support-eng questions.
- Out of hours, only SEV1/SEV2 alerts page; everything else waits for morning.

## Before your first shift

1. Install the paging app and **test that it bypasses Do Not Disturb**.
2. Read the incident response runbook.
3. Shadow one shift as secondary — schedule it with the rotation coordinator.

## Handoff

Each Monday the outgoing primary posts a handoff note in #on-call: open alerts, ongoing weirdness, anything that smells. An empty handoff note still gets posted — "all quiet" is information too.

## Compensation and sanity

On-call weeks come with a stipend and a recovery day if you were paged out of hours. Do not tough it out silently: if a noisy alert pages you twice for the same non-issue, silence it and file a ticket to fix the alert. Alert fatigue is a system failure, not a personal one.`,
  },
  {
    title: "Database backup and restore",
    createdDaysAgo: 35,
    updatedDaysAgo: 20,
    content: `Backups exist so restores can happen. We therefore test restores monthly — an untested backup is a hope, not a plan.

## What gets backed up

- Production database: continuous WAL archiving plus a full nightly snapshot at 03:00 UTC.
- Snapshots are retained 30 days; monthly snapshots are retained one year.
- Staging is **not** backed up. Anything important on staging is in the wrong place.

## Restoring to a point in time

\`\`\`bash
./scripts/db-restore.sh \\
  --target-time "2026-05-30T14:00:00Z" \\
  --into restore-validation
\`\`\`

The script provisions a fresh instance, replays WAL to the requested timestamp, and prints connection details. It never touches the production instance.

## The monthly restore drill

On the first Wednesday of each month, the on-call secondary restores the latest snapshot into \`restore-validation\` and runs the verification suite against it. Record the result (duration, row counts, any surprises) in the drill log. The drill is done when the suite is green, not when the restore command exits.

## If you actually need a production restore

Stop. Declare an incident first — a restore that overwrites production is a SEV1 action and needs an incident commander, a second pair of eyes, and a timeline.`,
  },
  {
    title: "Security best practices",
    createdDaysAgo: 30,
    updatedDaysAgo: 10,
    content: `Security here is everyone's job, and most of it is unglamorous hygiene. The rules below are the floor, not the ceiling.

## Credentials

- Secrets live in the secret manager, never in code, config files, or Slack. The pre-commit hook catches the obvious patterns, but it is a seatbelt, not a guarantee.
- Personal access tokens get an expiry date. "No expiration" is not an option we use.
- If a secret leaks — even maybe — rotate it first and ask questions after. Rotation is cheap.

## Your machine

- Full-disk encryption on, automatic updates on, screen lock under five minutes.
- Company code stays on company machines. No personal laptops, no personal cloud drives.

## Handling data

- Production data does not get copied to laptops or staging. Use the anonymized fixtures instead; if they are missing a case you need, extend the fixture generator.
- Customer data in logs is a bug. Report it like one.

## Reporting

Found something off — an over-broad permission, a sketchy dependency, a door that should not open? Post in #security or email security@company. Reports are always welcome, including false alarms. The embarrassing question is the one nobody asked.`,
  },
  {
    title: "Release versioning policy",
    createdDaysAgo: 25,
    updatedDaysAgo: 25,
    content: `We version releases with a pragmatic flavor of semantic versioning. The version number is a communication tool: it tells consumers how scared to be.

## The rules

| Bump | When | Example |
| --- | --- | --- |
| Major | Breaking API or schema change | \`3.2.1 → 4.0.0\` |
| Minor | New features, backwards compatible | \`3.2.1 → 3.3.0\` |
| Patch | Bug fixes only | \`3.2.1 → 3.2.2\` |

## What counts as breaking

Removing or renaming an API field, changing a response type, tightening validation on existing input, or any database migration that cannot roll back cleanly. When in doubt, it is breaking — major bumps are cheap, surprised consumers are not.

## Mechanics

- The version lives in \`package.json\` and is bumped in the release PR, not on \`main\` directly.
- Tags are annotated: \`git tag -a v3.3.0 -m "…"\`. The changelog is generated from PR titles, so write PR titles for the changelog reader.
- Pre-releases use a suffix: \`4.0.0-rc.1\`. Anything with a suffix never goes to the full fleet.

## Deprecations

Deprecate in a minor release with a log warning, remove in the next major. A deprecation without a removal date is decoration.`,
  },
  {
    title: "Meeting notes — how and where",
    createdDaysAgo: 18,
    updatedDaysAgo: 18,
    content: `Decisions made in meetings are only real once they are written down where others can find them. This article is the standard for capturing them.

## The format

Every recurring meeting has a running notes document. Each entry starts with the date and attendee list, then three sections:

- **Decisions** — what was decided, in one sentence each, with the deciding owner.
- **Action items** — checkbox list, each with an owner and a due date.
- **Context** — anything a future reader needs to make sense of the above.

## An example entry

### 2026-06-02 — Platform sync

**Decisions**

- Adopt the new queue library for the export pipeline (owner: Dana).

**Action items**

- [ ] Dana: spike the migration plan by Friday.
- [x] Alex: archive the old consumer dashboards.

**Context**

The old library is unmaintained and the export pipeline doubled in volume last quarter; we chose the smaller of the two candidate libraries because operational simplicity beats feature count at our scale.

## Where notes live

Team meeting notes belong in this knowledge base, one article per recurring meeting. Ad-hoc meeting outcomes go into the relevant project article. If a decision affects more than your team, it also gets a line in #eng-announcements.`,
  },
  {
    title: "Expense reporting how-to",
    createdDaysAgo: 10,
    updatedDaysAgo: 1,
    content: `Expenses are reimbursed within two payroll cycles when filed correctly the first time. This article is how you file them correctly the first time.

## What you can expense

- Work travel: flights, hotels, ground transport, and meals up to the daily cap.
- Conference tickets that your manager approved in writing beforehand.
- Books and online courses related to your role, up to the annual learning budget.
- Home-office equipment from the approved catalog, once per item category per two years.

## Filing the report

1. Photograph the receipt the day you get it — crumpled receipts are the top cause of rejected reports.
2. In the expense tool, create one report per trip or per month, not per receipt.
3. Pick the correct cost category; \`Miscellaneous\` is reviewed manually and slowly.
4. Submit before the 25th to make the current payroll run.

## Common rejections

A missing receipt over $25, alcohol on a meal receipt, and per-receipt reports are the big three. Fix-and-resubmit takes a full extra cycle, so it is worth thirty seconds of care up front.

Questions about whether something is expensable go to #finance *before* you buy. Finance answering "yes" in writing is the best receipt of all.`,
  },
];
