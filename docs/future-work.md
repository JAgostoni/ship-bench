# Future work

**Status:** post-MVP work, organised by the phases in
[`backlog.md` §4.2](./backlog.md#42-post-mvp-phases).
**Date:** 2026-09-13

Every item below is a **non-goal for v1**, traced to the document that declares it
and paired with the trigger that would make it worth doing. Nothing here is a bug
or a gap in the shipped MVP; `docs/decisions-log.md` §5 covers the two accepted
gaps, both of which appear here with a trigger as well.

The list covers every non-goal in `architecture.md` §16.2 that has a plausible
future, plus the deferred items from §15.4, §8.9, and `design-spec.md` §4.4.

---

## Phase 2 — Harden the current design

| Item | Description | Source | Trigger |
|---|---|---|---|
| **Nonce-based CSP** | Replace `script-src 'unsafe-inline'` with a per-request nonce generated in `src/proxy.ts` (Next 16's `middleware.ts` replacement), so the policy's inline-script hole closes. | `architecture.md` §12.6, §15.4 item 8, D-spec; `decisions-log` §5.1 mentions the current value | The internal deployment becomes reachable by anyone outside the immediate team, or a security review requires a policy without `unsafe-inline`. |
| **`cacheComponents` + `'use cache'`** | Enable Next 16's component-level cache on `getCategories()` and `getArticleBySlug()`, with `revalidateTag('articles')` on every write. | `architecture.md` §8.9 step 1, D14 | Read traffic grows enough that the sub-millisecond SQLite reads are a measurable share of response time, *and* the team is ready to own cache invalidation. |
| **Full WCAG 2.1 AA audit + screen-reader testing** | A manual audit with a screen reader (NVDA/JAWS/VoiceOver) across the shipped flows, beyond the automated axe smoke run. | `architecture.md` §15.4 item 10; `product-brief.md` "Not MVP"; `decisions-log` §5.2 boundary | The app is used by someone who relies on a screen reader, or an accessibility certification is required. The axe smoke is deliberately *not* this. |
| **Authentication and authorization** | `better-auth` or Auth.js with `users`/`sessions` tables, `created_by`/`updated_by` FKs, a `src/proxy.ts` redirect, and authorization enforced in the repository layer. | `architecture.md` §15.2, §16.1 A1, D19; `decisions-log` §5.2 | The app must be exposed beyond a trusted internal network. This is the trigger the deployment bound exists to detect. |

## Phase 3 — Content-owner depth

| Item | Description | Source | Trigger |
|---|---|---|---|
| **Category rename / delete** | An edit and delete affordance for categories, including reassigning or orphaning the articles in them. | `design-spec.md` §4.4 `[DEFERRED]`; `backlog.md` §1.4 | Content owners ask to reorganise the taxonomy — the moment a category name is wrong rather than merely missing. |
| **Revision diff view and one-click restore** | A side-by-side Markdown diff between two revisions, and a restore that writes the chosen revision forward as a new version. | `architecture.md` §15.4 item 5 | Someone needs to recover from a bad save by comparing rather than by copying text out of History. The data model already supports it — history is view-only, not lossy. |
| **Tags as a many-to-many relation** | `tags` and `article_tags` tables alongside categories, with a multi-select and `/tags/[slug]`. | `architecture.md` §15.4 item 2, §16.2 | Articles need to belong to more than one grouping. Additive; needs no schema rewrite of `articles`. |
| **Image uploads** | A `media` table plus local `public/uploads/` storage, with an upload control in the editor and an `<img>` render path. | `architecture.md` §15.4 item 3, §16.2 | Authors need screenshots or diagrams inline. Note the CSP would need `img-src` to cover the upload origin. |
| **Comments / inline review notes** | Threaded comments or inline review notes attached to an article or a text range. | `architecture.md` §15.4 item 4, §16.2 | The team reviews drafts before publishing and needs the discussion to live beside the text. Depends on auth (Phase 2) for attribution. |

## Phase 4 — Access control

*(The authentication item in Phase 2 is the entry point; Phase 4 is where it
becomes load-bearing.)*

| Item | Description | Source | Trigger |
|---|---|---|---|
| **Per-article ownership and roles** | `editor`/`reader` roles with ownership checks, and a UI that reflects what the current user may do. | `architecture.md` §15.2 steps 4–5 | Any article must be editable by some people but not others. |
| **Attribution from the session** | Replace the `kb_display_name` cookie with the session user for revision attribution. | `architecture.md` §15.2 step 5 | Immediately follows authentication; the cookie exists only because there is no session. |

## Phase 5 — Scale out

| Item | Description | Source | Trigger |
|---|---|---|---|
| **Postgres migration** | Move the schema to `drizzle-orm/node-postgres` and replace the FTS5 repository with `tsvector`/`tsquery`. The repository boundary keeps the change contained. | `architecture.md` §8.9 step 2, §15.1 | The corpus passes ~50,000 articles (the offset-pagination limit) or a managed database is required. |
| **Multi-node deployment** | Multiple stateless replicas behind a load balancer, once storage is no longer a single file. | `architecture.md` §8.9 step 3, §16.2 | A second app instance is needed for availability or throughput. Requires Postgres first. |
| **Keyset pagination** | Replace offset pagination with keyset pagination. | `architecture.md` §15.1 | The corpus passes ~50,000 articles and `OFFSET` scans become visible. |

## Phase 6 — Search quality

| Item | Description | Source | Trigger |
|---|---|---|---|
| **Porter stemming** | Add FTS5's `porter` tokenizer (or a combining tokenizer) so "deploying" matches "deploy". | `architecture.md` §15.4 item 6, §9.2 | Users report missed matches that prefix matching does not cover. Prefix matching covers most of this already. |
| **`trigram` tokenizer for typo tolerance** | Substring and fuzzy matching for misspellings. | `architecture.md` §15.4 item 6, §9.2 | Users report that a typo produces zero results. Costs index size. |
| **Multi-language support** | Tokenizers and content conventions for non-Latin scripts. | `architecture.md` §16.1 A5 | Content stops being English-only. FTS5's `unicode61` handles Latin scripts; CJK needs a different tokenizer. |

## Phase 7 — Distribution

| Item | Description | Source | Trigger |
|---|---|---|---|
| **Static HTML/PDF export** | Export an article or a whole category as offline-readable HTML or PDF. | `architecture.md` §15.4 item 9, §16.2 | A distribution or offline-reading requirement appears. |
| **i18n / l10n** | UI string externalisation and locale routing. | `architecture.md` §16.2 | The user base stops being single-locale. |
| **PWA / offline support** | A service worker and installable manifest for offline reading. | `architecture.md` §16.2 | Readers need articles without a network connection — typically field or travel use. |
| **Analytics / telemetry / APM** | Request tracing and usage metrics. | `architecture.md` §16.2 | Response times or usage need to be observed in production rather than measured ad hoc. Note the CSP would need `connect-src` widened. |

---

## Explicitly *not* planned

These are named in `architecture.md` §16.2 as non-goals with no plausible near-term
future, listed here so their absence is a decision rather than an omission:

- **Real-time collaborative editing, presence, or live cursors** (CRDT/OT). The
  optimistic-concurrency model (§9.4) covers the team's actual collision rate; a
  merge UI was rejected as a large build for a near-zero problem (UX14).
- **Mobile-phone-optimised layout.** Tablet (768–1023px) is the stated floor; the
  layout degrades gracefully below 768px and is verified to have no horizontal
  overflow at 360px, but phone is not a design target (`design-spec.md` U2).
- **Nested categories and a taxonomy admin screen.** Flat categories are deliberate.
- **Docker, Kubernetes, Terraform, message queues, microservices.** One Node process
  and one SQLite file is the intended deployment shape.

---

## How to use this list

Each item is additive unless its source column says otherwise. The two that change
the architecture rather than extend it are **authentication** (adds a predicate to
existing queries) and the **Postgres migration** (replaces the search repository
behind an unchanged boundary). Everything else fits inside the current layering,
which is the point of the repository-per-entity structure in
`architecture.md` §7.2.

Phasing here matches `backlog.md` §4.2 exactly. An item moves out of this file when
it has a trigger, an owner, and its own iteration; until then it is recorded so the
decision not to build it is visible.
