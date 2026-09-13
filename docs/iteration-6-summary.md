# Iteration 6 Summary — Editing: Server Actions, editor, concurrency, history

**Status:** Complete. `npm run verify` exits 0, `npm run test:coverage` exits 0
(95.13% statements / 95.46% lines), and a production build (`next build` → `next start`)
serves the new routes locally with **78/78 iteration-6 acceptance checks passing** and
**no regressions** in the iteration-4 (68/68) and iteration-5 (42/42) suites.

**Goal (met).** A user can create and edit any article in Markdown with a live preview,
save it, and see the change persist across a full reload — with client and server
validation, optimistic-concurrency conflict handling, and view-only revision history.

---

## 1. What was built

### 1.1 Tasks and files

| Task | Files |
|---|---|
| 6.1 Article Server Actions | `app/actions/articles.ts` (`createArticle`, `updateArticle`, `archiveArticle`, `restoreArticle`) |
| 6.1 test | `app/actions/articles.test.ts` (17) |
| 6.2 Category action + display-name cookie | `app/actions/categories.ts`, `server/display-name.ts`, `lib/display-name-constants.ts`, `lib/validation/display-name.ts`, `server/logger.ts` |
| 6.2 test | `app/actions/categories.test.ts` (7) |
| 6.3 Editor + form | `articles/markdown-editor.tsx` (`ssr: false`, custom 10-button toolbar, Ctrl/⌘+Enter), `articles/article-form.tsx` |
| 6.3 test | `articles/article-form.test.tsx` (10), `lib/validation/article-form.test.ts` (6) |
| 6.4 Conflict banner | `ConflictBanner` in `article-form.tsx` |
| 6.4 test | `articles/conflict-banner.test.tsx` (7) |
| 6.5 Status/archive/history/toast | `articles/delete-article-button.tsx` (`ArchiveArticleButton`, `ArchiveUndoToast`), `articles/revision-list.tsx` (rewritten), `articles/revision-view-dialog.tsx`, `ui/toast.tsx`, `layout/toast-from-query.tsx` |
| 6.6 Create and edit routes | `app/(editor)/layout.tsx`, `app/(editor)/articles/new/`, `app/(editor)/articles/[slug]/edit/`, `layout/editor-shell.tsx`, `layout/editor-status-strip.tsx`, `layout/editor-bridge.tsx`, both `loading.tsx` files |
| 6.7 Display-name affordance | `layout/editing-as-chip.tsx`; mounted in `layout/sidebar.tsx` |
| 6.8 Write API | `server/http.ts` (`assertSameOrigin`, `assertJsonContentType`, `readJsonBody`), `POST /api/articles`, `PATCH`/`DELETE /api/articles/[idOrSlug]`, `POST /api/categories`, `POST /api/test/reset`, `e2e/fixtures/seed.json` |
| 6.8 tests | `api/articles/writes.test.ts` (10), `api/test/reset/route.test.ts` (5), `api/categories/post.test.ts` (5) |
| — | `scripts/smoke-iteration6.cjs` (78 checks), `scripts/export-fixture.ts` + `db:fixture` script |

**In-scope refactors, listed so the diff is explainable:**

- `server/db/search-index.ts` — gained `rebuildSearchIndex()`. `POST /api/test/reset` needed
  an index rebuild, and the `drizzle-orm` restricted-import rule (correctly) forbids a route
  handler from writing the `INSERT ... ('rebuild')` itself. The behaviour now lives beside the
  DDL that creates the index, so there is one place that knows how to recover it.
- `server/db/seed.ts` — `SEED_ARTICLES`/`SEED_CATEGORIES` are now exported (and the seed types
  with them) so `scripts/export-fixture.ts` can generate `e2e/fixtures/seed.json` from the same
  arrays. A second hand-maintained copy of the dataset would have been the first thing to drift.
- `ui/input.tsx`, `ui/textarea.tsx` — `ComponentPropsWithoutRef` → `ComponentPropsWithRef`.
  `architecture.md` §6.3 requires every primitive to forward `ref`; React 19 passes `ref` as an
  ordinary prop, so declaring it is the whole change. It was needed to focus the title input on
  a validation failure.
- `layout/new-category-dialog.tsx` — was inert in iteration 4 by design; now calls
  `createCategory`.
- `layout/app-layout.tsx`, `layout/sidebar.tsx` — read the display-name cookie and mount the
  toast bridge and the `Editing as` chip.
- `(shell)/articles/[slug]/page.tsx` — passes `actions` to `ArticleHeader` (real archive menu)
  and the article title to `RevisionList`.
- `vitest.config.ts`, `src/test/setup.ts` — `server-only` is now **aliased** to
  `src/test/server-only-stub.ts` instead of `vi.mock`-ed. See §4.1; this was a latent defect in
  the iteration-2 harness that only surfaced once a Client Component imported a server module.

### 1.2 The five details worth naming

**The editor's preview is the app's own renderer, so parity is structural.** `components.preview`
swaps in `ArticleBody`, which means the author previews through the *identical*
`react-markdown` + `remark-gfm` + `rehype-sanitize` pipeline and `prose` classes that render the
published article (E5). Beyond parity, this is a security property: `@uiw/react-markdown-preview`
would otherwise render the preview through `rehype-raw`, which parses embedded HTML — something
`architecture.md` §6.7 and design-spec.md §10.6 rule 3 forbid outright. The smoke suite proves
it in a browser: a body of `<script>window.__xss = true</script>` renders as text and never
executes.

**A confirm dialog that always writes a `null` change note.** The change-note field rendered,
the user could type in it, and the revision was still written with `changeNote: null`. The cause
is that `zodResolver` *replaces* the submitted values with the schema's output, so any field the
schema does not declare is dropped before the form ever sees it — and the form was resolved
against `articleCreateSchema`, which has no `changeNote`. The fix is a dedicated
`articleFormSchema` (create + `changeNote`, and deliberately *without* `version`, which is the
concurrency token rather than something a user edits). `lib/validation/article-form.test.ts`
now pins the distinction, including a drift check that the create and form schemas agree on
every shared field. §4.2 has the full story.

**Archive redirects, which is what makes `Undo` possible at all.** The first implementation had
`archiveArticle` return an `ActionState` and the button navigate afterwards. That works until you
notice the Undo window: the overflow menu is unmounted by the navigation, so nothing is left to
offer the reversal. Archive now redirects like every other mutation (§7.5) to
`/?toast=archived&archivedArticleId={id}` — the id travels in the URL, which is the only place it
can survive the unmount. `ArchiveToastFromQuery` reads it and renders `ArchiveUndoToast`;
`ToastFromQuery` deliberately skips the `archived` event so exactly one toast renders.

**`redirect()` outside `try`/`catch`, and a test that proves it.** The action's shape is
"repository first, redirect after" rather than one enclosing `try`, because `redirect()` works by
throwing a `NEXT_REDIRECT` control-flow signal and a `catch` would swallow it. `articles.test.ts`
stubs `redirect` as a spy that *also* throws, which means a swallow would leave the spy uncalled —
so the structural rule has an executable assertion rather than a comment.

**The browser caught three bugs the unit tests could not.** `extraCommands` was leaving four
unlisted toolbar buttons on screen (the library's preview/fullscreen toggles) because overriding
`commands` does not clear its sibling list; two duplicate `Article archived.` toasts stacked
because both toast components matched `?toast=archived`; and the `Editing as` chip never showed
its warning dot because `readDisplayName()` resolves the fallback to the literal string
`Anonymous editor`, so "unset" was indistinguishable from "set to that name" (now split into
`readDisplayNameCookie()` → `null` and `readDisplayName()` → the resolved label). None of the
three is visible from a jsdom render, and all three are now asserted in the smoke suite.

---

## 2. Verification evidence

Every result below was produced by running the command in this environment.

| Criterion | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 ✅ |
| Lint | `npm run lint` | exit 0 (1 pre-existing warning in `postcss.config.mjs`) ✅ |
| Formatting | `npm run format:check` | "All matched files use Prettier code style!" ✅ |
| Tests | `npm run test:run` | 47 files, **488 tests passed** ✅ |
| Coverage | `npm run test:coverage` | 95.13% stmts / 95.46% lines, exit 0 — `≥90%` lib, `≥85%` server ✅ |
| Build | `npm run build` | compiled; all 13 routes registered ✅ |
| **Full gate** | **`npm run verify`** | **exit 0** ✅ |
| **Iter 6 acceptance** | `node scripts/smoke-iteration6.cjs` | **78/78 PASS** ✅ |
| **Iter 4 regression** | `node scripts/smoke-iteration4.cjs` | **68/68 PASS** ✅ |
| **Iter 5 regression** | `node scripts/smoke-iteration5.cjs` | **42/42 PASS** ✅ |

**Coverage held while the suite grew:** 481 → 488 tests, 417 at iteration 5 → 488 now, and the
`src/lib/**` / `src/server/**` thresholds (90% / 85%) are unchanged and still met.

### 2.1 Definition of done, line by line

| DoD item | Evidence |
|---|---|
| Creating an article redirects to its detail page and persists across a full reload | Smoke: save → `?toast=created` → reload → `h1` is the new title; `GET /api/articles/:slug` confirms `version: 1` |
| Editing increments `version`, writes exactly one revision, and persists | Smoke: version 1 → 2 after one save; `History (2 revisions)`; unit test asserts exactly one new revision row |
| Client and server validation reject the same payloads with the same messages | `article-form.test.tsx` (client) and `articles.test.ts` (server) both assert the literal `Title must be at least 3 characters.`; the form's `fieldErrors` effect renders the server's message through the same `Field` |
| A stale-version save renders the conflict banner with focus applied, and `Copy my text` copies | Smoke: competing `PATCH` moves the version, then the form's save renders `role="alert"` with focus, `Copy my text` → label `Copied`; `conflict-banner.test.tsx` asserts the clipboard string is `title + "\n\n" + summary + "\n\n" + bodyMd` |
| The status select offers only `Draft` and `Published` | Smoke asserts the exact ten-button toolbar and that no `Archived` option exists; `article-form.test.tsx` asserts it directly |
| Archiving is a soft status change with a 5-second Undo; "delete" appears nowhere | Smoke: `DELETE` → `204` and `status: 'archived'` with revisions retained; archived is excluded from browse **and** search and still resolves at its URL; `Undo` restores within the window; `!/delete/i` over the rendered body on two routes |
| History shows the 5 most recent revisions, collapsed by default, view-only | Smoke: `<details>` collapsed, expanding lists revisions with a working `View` dialog rendering the revision body; no restore control exists anywhere |
| The editor renders in the focused shell with no sidebar, TOC, or search input | Smoke asserts zero `<aside>` elements, no header `input[type=search]`, and no wordmark button on both editor routes |
| The editor bundle is not in the browse route's first-load JS | Smoke asserts the served `/` HTML contains no `w-md-editor` chrome and no `script[src]` matching the editor chunk |
| The display-name cookie changes the `editorName` recorded on new revisions | Smoke: set `Grace Hopper` → save → the newest revision reads `Grace Hopper`; unit test asserts the cookie options (`httpOnly: false`, `sameSite: 'lax'`, 1 year, `path: '/'`) |
| `POST /api/test/reset` returns 404 without `E2E_TEST_MODE=1` | `route.test.ts` asserts `404` with `await response.text() === ''` for both unset and `'0'` |
| `npm run verify` exits 0 | see table above |

### 2.2 Human flow rehearsal (create → edit → conflict → archive → undo)

Driven in a real Chromium against `next start`:

1. `/articles/new` → the focused shell: `← Cancel`, `New article`, `Saved`, `[Save article]`. No
   sidebar, no search, no wordmark.
2. Title and body empty; `Draft`; `Uncategorized`. The toolbar has exactly the ten spec buttons.
3. Typing `## A heading\n\nSome **bold** text.` renders an `<h2>` and a `<strong>` in the
   preview, live.
4. `Save article` → `/articles/smoke-test-article?toast=created` → `Article created.`; reload
   shows the persisted article and `History (1 revision)`.
5. `Edit` → the change-note field is present; title seeded; `Slug: smoke-test-article` as
   read-only text. Save → `?toast=saved`, version 2, `History (2 revisions)`.
6. Switch `Status` to `Published`, save → `?toast=published`, `publishedAt` stamped.
7. Open the editor, let a second writer save, then save → the conflict banner appears **with
   focus**, `Copy my text` → `Copied`, `Reload latest version` opens `Discard your unsaved
   edits?`, `Keep editing` returns to the form intact.
8. `⋯` → `Archive article` → confirm dialog states the consequence and the recoverability, and
   contains no form of the word "delete" → `/?toast=archived&…` → `Article archived.` with
   `Undo`. The article is gone from browse and from search, still live at its URL with an
   `Archived` badge.
9. `Undo` → the article is published again within the 5-second window.
10. Sidebar `Editing as [ Anonymous editor • ]` → dialog with the "It is not a login." body
    copy → save `Grace Hopper` → `Display name saved.`, the dot disappears, and the next revision
    records that name.

---

## 3. Assumptions made

1. **`POST /api/test/reset` calls `seed()` rather than re-inserting the fixture JSON.** The
   route needs the fixture dataset, and `e2e/fixtures/seed.json` is generated *from* `seed()`
   by `npm run db:fixture`. Having the endpoint re-insert from the JSON as well would have
   meant three copies of the same insert loop (seed, fixture, route). It now reuses the
   already-tested `seed()` and adds only the explicit index rebuild the spec asks for; the
   fixture file remains the artifact iteration 7 consumes, and both derive from one source.
   Recorded as I6-1.

2. **`assertJsonContentType` returns `415`, not `400`.** §7.3 requires a JSON content type on
   mutations and does not name the rejection status. `415 Unsupported Media Type` is the
   correct HTTP semantics for "the body's media type is not supported", and it is the response
   the CSRF reasoning actually rests on: a cross-site HTML form can only send form-encoded,
   multipart, or plain text, so it cannot reach the handler. Recorded as I6-2.

3. **A missing `Origin` header is accepted by `assertSameOrigin`.** The check compares
   `Origin` to `Host` *when present*. Non-browser clients (Playwright, `curl`, a future
   service) legitimately omit it, and the header is not forgeable from a browser — which is the
   threat being addressed. The `403` path is asserted for a cross-origin `Origin` on both the
   route and the action tests.

4. **The toolbar's height is measured rather than hard-coded to 29px.** `MDEditor` gives the
   textarea/preview row whatever height remains after its toolbar, and its toolbar wraps. A
   `ResizeObserver` on the toolbar feeds the measurement into `height`, which keeps the content
   row on the spec's 300px minimum with both panes side by side at every width. Recorded as I6-3.

5. **`→ Cancel` in the editor header and the form's own `Cancel` are wired to one handler.**
   The focused shell owns the strip, but the dirty flag lives in the form, so the form registers
   its dirty-guarded cancel with the shell (`editor-bridge.tsx`). Without this the header would
   need a second copy of `isDirty` and could discard work silently — exactly what E6 exists to
   prevent.

6. **The slug preview is derived during render, not stored by an effect.** `slug` is
   `slugPinned ?? slugify(title)`, and "Regenerate from title" is a one-way latch that sets
   `slugPinned`. There is no state to synchronise, so there is no cascading render — and the
   latch is what makes the confirm dialog a real decision rather than a no-op.

---

## 4. Issues encountered

### 4.1 `server-only` could not be stubbed with `vi.mock` — **fixed in the harness, and it was a latent iteration-2 defect**

`architecture.md` §11.2 says to alias `server-only` to an empty module, and the iteration-2
harness instead used `vi.mock('server-only', () => ({}))` in `src/test/setup.ts`. That worked
for two iterations because only the *node* project reached server modules, and its import chain
started at a path Vite could resolve.

Iteration 6 broke it: `ui/toast.tsx` (a Client Component) imports `src/lib/toast-messages.ts`,
and once a jsdom component test loaded a module graph that reached `src/server/logger.ts`, Vite
failed at **transform** time — `Failed to resolve import "server-only"` — before any mock could
apply. Two component-test suites failed to even collect.

The fix is the one the spec named all along: `resolve.alias` in `vitest.config.ts` pointing at
`src/test/server-only-stub.ts`. An alias replaces the specifier at every depth in every project,
which a `vi.mock` cannot do. The `server/**` boundary is unaffected — it is enforced by the
production build (Next.js applies the real `react-server` condition) and by ESLint's
restricted-import rule, and the build passes.

### 4.2 The change-note field rendered, accepted input, and wrote `null` — **found by the browser suite**

The most serious finding of the iteration, and the one no unit test was positioned to catch.

`article-form.tsx` resolved the form against `articleCreateSchema`. `zodResolver` replaces the
submitted values with the schema's **output**, so any field the schema does not declare is
dropped before the submit handler runs. `articleCreateSchema` has no `changeNote`, so the note
the author typed was discarded, `articleUpdateSchema` never saw it, and the revision was written
with `changeNote: null`.

Every existing test passed, because they all asserted what the *form* contained rather than what
the *revision* recorded. The smoke suite caught it by creating an article, setting a display
name, editing with a note, and then reading the rendered History — which is the only assertion
positioned to see the whole path.

Fixed with `articleFormSchema` (create + `changeNote`, without `version`), plus
`src/lib/validation/article-form.test.ts` which pins the distinction directly and adds a drift
check that the create and form schemas agree on every shared field. A component test now asserts
the note reaches `FormData`, so the failure mode cannot return silently.

### 4.3 Five `react-hooks/set-state-in-effect` errors — **product code changed, not the lint rule**

The five dialog/toast components all closed or confirmed themselves from a `useEffect` watching
an action's result. Under this project's React Compiler lint config that is an error, and the
rule is right: it is a cascading render on every submission.

Rather than suppress the rule, each site was restructured:

- **`toast-from-query.tsx`** now *derives* the message from `searchParams` during render and
  keeps one `dismissed` latch that can only go false → true. That also fixed a real behaviour
  bug: copying the parameter into state by effect let a later search-param update resurrect a
  dismissed toast.
- **`new-category-dialog.tsx` and `editing-as-chip.tsx`** bind their action to a small wrapper
  that closes the dialog inside the *async continuation* — the event path, where a submit-time
  effect belongs.
- **`article-form.tsx`** derives the slug during render (see assumption 6) and switched `watch`
  to `useWatch`: `watch` is not analysable by the React Compiler, so the lint config skipped
  compiling the entire component, silently disabling memoization for it.

The only remaining warning in the repository is the pre-existing
`import/no-anonymous-default-export` in `postcss.config.mjs`, which iteration 1 shipped and
which is outside this iteration's scope.

### 4.4 The smoke suite's own bugs — three of them, all fixed rather than loosened

Three of the initial smoke failures were defects in the *checks*, and it is worth recording
which, because a test that is quietly wrong is worse than no test:

- `GET /api/articles?status=all` was asserted to *exclude* the archived article. The request
  that proves exclusion is the default (no `status`), so both the default and `status=all` are
  now asserted, and the archived-state checks run **before** `Undo` restores the article.
- The display-name chip was matched with `getByText('Editing as')`, which resolves a `<span>`
  inside the button rather than the Radix trigger; the click did nothing and the dialog never
  opened. Now scoped through the trigger element.
- History rows live inside a collapsed `<details>` (UX18 requires that default), so they are not
  in `innerText` until the summary is clicked. The check now expands it first — and that is
  precisely what surfaced §4.2.

### 4.5 `next start` needed `E2E_TEST_MODE=1` to exercise the reset endpoint

Not a defect, but worth recording for iteration 7: `POST /api/test/reset` is inert by design
without that variable, so any process that calls it — including `playwright.config.ts`'s
`webServer` — must set it, and must point `DATABASE_FILE` at a separate file. The smoke script
documents both in its header comment.

---

## 5. Decisions log

| ID | Decision | Alternatives | Rationale |
|---|---|---|---|
| **I6-1** | `POST /api/test/reset` reuses `seed()` and adds only an explicit index rebuild | Re-insert the rows from `e2e/fixtures/seed.json` in the route | `seed()` is idempotent, transaction-wrapped, and already tested, and the fixture JSON is *generated from the same arrays*. Re-implementing the insert in the route would put the same loop in three places for no benefit. The explicit rebuild stays because a bulk re-seed is exactly where a stale index is hardest to attribute. |
| **I6-2** | A non-JSON mutation body is `415`, not `400` | `400 Bad request` | The status describes the media type, which is what is actually wrong, and it is the response the CSRF argument rests on: a cross-site form cannot send `application/json`. |
| **I6-3** | The editor's toolbar height is measured with a `ResizeObserver` | Hard-code the library's 29px default; fix the pane height | The toolbar wraps, and `MDEditor` hands the content row the remaining height with its textarea at `height: 100%`. Measuring keeps the 300px pane at every width without a magic constant that silently rots. |
| **I6-4** | `articleFormSchema` is a third schema, separate from create and update | Reuse `articleCreateSchema`; reuse `articleUpdateSchema` | The form needs `changeNote` (create-only schema lacks it, and the resolver would strip it — §4.2) but *not* `version` (which is the concurrency token, not a user-editable value that could legitimately fail validation). One schema cannot satisfy both, and a unit test pins the shared-field agreement. |
| **I6-5** | `archiveArticle` redirects instead of returning an `ActionState` | Return the state and navigate from the button | The Undo window is the reason: the overflow menu is unmounted by the navigation, so nothing survives to offer the reversal. The article id travels in the redirect URL, which is the only place it can. |
| **I6-6** | `ToastFromQuery` skips the `archived` event entirely | Let both components render and dedupe | Two components matching the same parameter stacked two identical toasts — caught by the browser suite. Ownership is now exclusive and stated in both files, rather than depending on render timing. |
| **I6-7** | `readDisplayNameCookie()` returns `null`; `readDisplayName()` resolves the fallback | One function returning the resolved name | The chip must distinguish "unset" from "set to `Anonymous editor`" to render the warning dot (design-spec.md §4.6). Collapsing them made the nudge unreachable. Two functions with distinct contracts beat one with an ambiguous return. |
| **I6-8** | `assertSameOrigin` allows a missing `Origin`, rejects a mismatched one | Require `Origin` always | The header is not forgeable from a browser (the actual threat), and non-browser clients legitimately omit it. Requiring it would break `curl` and the Playwright API fixture for no security gain. |
| **I6-9** | `rebuildSearchIndex()` lives in `server/db/search-index.ts` | Write the `INSERT ... ('rebuild')` in the route | All SQL stays behind the `server/**` boundary, which is the rule iteration 1 set up and ESLint enforces. The DDL module is already the one place that knows how to create and recover the index. |
| **I6-10** | `server-only` is aliased in `vitest.config.ts` instead of `vi.mock`-ed | Keep the mock and alias per test file | A mock only applies once Vite has resolved the specifier, so a Client Component importing a server module fails at transform time. The alias is what `architecture.md` §11.2 prescribed, and it covers every project and depth. |
| **I6-11** | The form's `onSubmit` runs RHF and hands the resolved `FormData` to `formAction`, with `action={formAction}` still on the `<form>` | `action={formAction}` alone; RHF alone | Both halves are needed and both are verified: RHF alone loses the no-JS fallback §6.4 requires, and `action` alone cannot give instant client feedback. Building the `FormData` from the resolver's output means a valid client submit and the Server Action agree on the payload rather than on the DOM's raw strings. |

---

## 6. Handoff to iteration 7

1. **`POST /api/test/reset` is ready and its guard is tested.** `e2e/global-setup.ts` should
   wait on `/api/health`, then call reset once; per-spec resets use `test.beforeEach`. The
   endpoint is `404` without `E2E_TEST_MODE=1`, and `playwright.config.ts`'s `webServer` must set
   both that variable and a separate `DATABASE_FILE` (§4.5).
2. **`e2e/fixtures/seed.json` exists** — 4 categories, 9 articles (7 published, 2 draft), with
   the fixed titles and slugs §9.7 requires. Regenerate it with `npm run db:fixture` if the seed
   changes; it is generated, not hand-maintained.
3. **Stable strings for the specs.** `Smoke Test Article` does not exist in the fixture; the
   specs should assert on the seeded set (`Deploying the API to Production`,
   `Draft: Q1 Planning Notes`, …). The editor routes are `/articles/new` and
   `/articles/[slug]/edit`; both carry `#title`, `#bodyMd`, `#changeNote`, `#article-save`, and
   `[data-testid="markdown-editor"]`, and the toolbar buttons have the ten `aria-label`s listed
   in `TOOLBAR_COMMANDS`.
4. **`?toast=` is consumed on arrival.** A spec that asserts a toast must assert it *before* the
   parameter is stripped, and a spec that navigates twice must not expect the notice to replay.
   The archive flow additionally carries `archivedArticleId`, which is what makes the Undo
   clickable.
5. **The conflict path needs two writers.** Produce a stale version by saving through the form,
   then `PATCH`ing the same article via the API with the version the form still holds. §2.2's
   step 7 is the working recipe, and `smoke-iteration6.cjs` is a working implementation of it.
6. **`ui/toast.tsx` is built but has no global provider.** Every toast is rendered by the
   component that knows the outcome (`ToastFromQuery`, `ArchiveToastFromQuery`,
   `NewCategoryDialog`, `EditingAsChip`). If iteration 7 or 8 wants a single mounted region,
   that is a refactor, not a gap.
7. **The `LIKE` fallback still cannot rank or snippet** (unchanged from iterations 3 and 5), and
   **`postcss.config.mjs` still carries the one pre-existing lint warning.** Both are outside
   this iteration's scope and are noted for iteration 8.
