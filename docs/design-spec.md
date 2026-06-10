# UX / Design Direction Spec — Simplified Knowledge Base App (v1)

**Status:** Approved for implementation
**Date:** 2026-06-10
**Sources of truth:** `docs/product-brief.md`, `docs/architecture.md`

This spec is written so a developer can implement every screen and state without making design decisions. It covers only v1 scope (features 1–3: browsing, search, editing). Where the brief was silent, decisions are stated here and justified in §10.

**Design language (from the brief):** calm, readable, information-dense without clutter. Strong hierarchy, search-first navigation, low-friction movement between list and detail. No marketing visuals, no decorative motion, no multi-step admin flows.

---

## 1. Information architecture and page flows

### 1.1 Screen inventory

| # | Screen | Route | Render type (per architecture) |
|---|---|---|---|
| S1 | Article list (home) | `/` | RSC |
| S2 | Article detail | `/articles/[id]` | RSC |
| S3 | Search results | `/search?q=…` | RSC |
| S4 | New article | `/articles/new` | RSC shell + client editor |
| S5 | Edit article | `/articles/[id]/edit` | RSC shell + client editor |
| S6 | Not found (404) | `not-found.tsx` | RSC |

There is no settings screen, no login, no dashboard. The header search box (a client component) appears on every screen.

### 1.2 Navigation map

```
                    ┌────────────────────────────────────────────┐
                    │  Global header (every screen)              │
                    │  [Logo/app name] [Search box] [+ New]      │
                    └────────────────────────────────────────────┘
                         │            │              │
              logo click │   Enter or │ "See all"    │ "+ New article"
                         ▼            ▼              ▼
   ┌─────────┐  card   ┌─────────────────┐      ┌──────────────┐
   │ S1 Home │────────►│ S2 Article      │      │ S4 New       │
   │ (list)  │  click  │    detail       │      │    article   │
   └─────────┘         └─────────────────┘      └──────────────┘
        ▲  ▲                │   │    │               │      │
        │  │        "Edit"  │   │    │ "Delete"      │ Save │ Cancel
        │  │                ▼   │    ▼               ▼      ▼
        │  │        ┌──────────┐│  [Confirm     S2 (new id) S1
        │  │        │ S5 Edit  ││   dialog]──► S1 (home)
        │  │        └──────────┘│
        │  │          │      │  │ "← All articles"
        │  │     Save │ Canc.│  └──────────► S1
        │  │          ▼      ▼
        │  │       S2 (same id)
        │  │
        │  └── search dropdown: result click ──► S2
        └───── 404 page "Back to all articles" ─► S1

   S3 Search results: result row click ──► S2; "Clear search" ──► S1
```

**Entry/exit summary per flow:**

- **Browse flow:** enter at S1 (home). Exit into S2 via card click. S2 exits back via the "← All articles" link or the header logo. Browser back works everywhere (all navigation is real routes, no modal routing).
- **Search flow:** starts in the header search box from *any* screen. Two surfaces: (a) inline dropdown — top 5 results, click goes straight to S2; (b) Enter (or "See all N results") goes to S3, a shareable URL. S3 rows go to S2.
- **Create flow:** "+ New article" (header, and the home empty-state CTA) → S4. Save → S2 for the new article. Cancel → S1.
- **Edit flow:** "Edit" button on S2 → S5 (same article). Save → back to S2 (refreshed). Cancel → back to S2.
- **Delete flow:** "Delete" on S2 → confirm dialog (in place, no route change). Confirm → S1. Cancel → stay on S2.
- **404:** any bad `/articles/[id]` → S6 with a single recovery action back to S1.

No flow is ever more than two clicks from the home list. Transitions are instant page navigations — **no animated route transitions** (brief: avoid excessive motion). The only animation in the app is a 150 ms ease-out fade/translate on the search dropdown and dialog open, and it must respect `prefers-reduced-motion` (§7.6).

### 1.3 Screen layouts (wireframes)

All screens share the global header and a `main` content container: `max-width: 1100px`, centered, horizontal padding `var(--space-6)` (24px) on ≥768px, `var(--space-4)` (16px) below.

#### Global header (every screen)

Height 56px, background `--color-surface`, bottom border 1px `--color-border`, sticky (`position: sticky; top: 0`) so search is always reachable while scrolling long articles.

```
┌──────────────────────────────────────────────────────────────────┐
│  ▦ Team KB        [ 🔍 Search articles…              /  ]   [+ New article] │
└──────────────────────────────────────────────────────────────────┘
   logo+name link      SearchBox, flex-grow, max-width 480px,        primary
   to "/"              centered in remaining space                   button
```

- "Team KB" is plain text (16px, semibold) next to a 20px book/box glyph; the whole group is one link to `/`.
- The search box shows a kbd hint `/` at its right edge (12px, `--color-text-muted`, 1px border, radius 4px); pressing `/` anywhere (when not in an input/textarea) focuses it.
- "+ New article" is the primary button (the only filled-accent element in the header).

#### S1 — Article list (home)

```
┌ header ──────────────────────────────────────────────────────────┐
│                                                                  │
│  Articles                                    12 articles         │   PageHeader: h1 28px +
│  ──────────────────────────────────────────────────────────      │   count (14px muted, right)
│                                                                  │
│  ┌───────────────────────────┐  ┌───────────────────────────┐    │
│  │ Deploy checklist          │  │ Onboarding guide          │    │   Card grid:
│  │ Updated 2 days ago        │  │ Updated 5 days ago        │    │   2 cols ≥1024px
│  └───────────────────────────┘  └───────────────────────────┘    │   1 col  <1024px
│  ┌───────────────────────────┐  ┌───────────────────────────┐    │   gap 16px
│  │ Incident response runbook │  │ VPN setup                 │    │
│  │ Updated 1 week ago        │  │ Updated 3 weeks ago       │    │
│  └───────────────────────────┘  └───────────────────────────┘    │
│  …                                                               │
└──────────────────────────────────────────────────────────────────┘
```

- **Card content is exactly title + relative updated time** — the list API returns only `id`, `title`, `updatedAt` (no content, so no excerpts; do not fetch content for the list).
- Card: `--color-surface` background, 1px `--color-border`, radius `--radius-md` (8px), padding 16px. Title 18px/semibold/`--color-text`, max 2 lines with `-webkit-line-clamp: 2` + ellipsis. Meta line 13px `--color-text-secondary`, e.g. "Updated 2 days ago" (`<time datetime="…" title="Jun 8, 2026, 14:02">`). Relative format: `just now` (<1 min), `N minutes/hours ago` (<24 h), `N days ago` (<7 d), else absolute `Jun 8, 2026`.
- The **entire card is one link** (`<a>` wrapping the card, or card inside `<li>` with a single stretched link). Never nest a second interactive element in a card.
- Sort: `updatedAt` DESC (matches API). No pagination in v1 (small–medium corpus, per brief); render all.
- **Empty state** (no articles in DB): replaces the grid — see §5.1.

#### S2 — Article detail

```
┌ header ──────────────────────────────────────────────────────────┐
│  ← All articles                                                  │  13px link, top of main
│                                                                  │
│  Deploy checklist                        [ ✎ Edit ]  [ 🗑 Delete ]│  h1 28px; actions right
│  Updated Jun 8, 2026 · Created May 2, 2026                       │  13px muted meta line
│  ──────────────────────────────────────────────────────────      │
│                                                                  │
│  ┃ Rendered Markdown body (ArticleBody)                          │  reading column
│  ┃ max-width 72ch, 16px/1.65                                     │  left-aligned in main,
│  ┃ …                                                             │  not centered
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Action buttons: "Edit" = secondary button with pencil icon → `/articles/[id]/edit`. "Delete" = ghost-danger button with trash icon → opens confirm dialog (§4.4). On <768px the actions wrap below the title, full row.
- Body typography (the `ArticleBody` prose styles — used identically by the editor preview): see §6.3.
- Meta line uses absolute dates here (detail pages get linked/shared; absolute beats relative for reference).

#### S3 — Search results

```
┌ header (search box retains the query) ───────────────────────────┐
│  Search results for “deploy”                  3 results          │  h1 22px; count is
│  ──────────────────────────────────────────────────────────      │  aria-live (§7.4)
│                                                                  │
│  Deploy checklist                                                │  result row:
│  …run this before every <mark>deploy</mark>, starting with…      │  title 16px link,
│  Updated 2 days ago                                              │  snippet 14px with
│  ────────────────────────────────────────────                    │  <mark> highlight,
│  Service deployment FAQ                                          │  meta 13px;
│  …<mark>deploy</mark> windows are Tuesday and…                   │  rows divided by
│  Updated 3 weeks ago                                             │  1px --color-border
└──────────────────────────────────────────────────────────────────┘
```

- Result rows are full-width blocks (not cards — denser, scannable), entire row clickable to S2, padding 12px 0.
- `<mark>` styling: background `--color-mark`, text color inherit, no border-radius needed, padding 0 2px. Snippets come from the API pre-tokenized around the known `<mark>` markers (architecture §5.1) — render via the whitelist splitter, never `dangerouslySetInnerHTML`.
- The header search box is pre-filled with `q` so refining is zero-friction.
- **Empty state** (0 results): §5.2.

#### S4 / S5 — New & edit article (ArticleEditor)

Identical layout; only the heading, initial values, and cancel destination differ.

Desktop (≥1024px) — split pane:

```
┌ header ──────────────────────────────────────────────────────────┐
│  New article                                  [ Cancel ] [ Save article ] │ h1 22px; actions right,
│  ────────────────────────────────────────────────────────────────│  sticky with the heading row
│  Title                                                           │
│  [______________________________________________________]        │  full width, both panes
│                                                                  │
│  Content                              Preview                    │  pane labels 13px muted
│  ┌───────────────────────────┐  ┌───────────────────────────┐    │
│  │ # Steps                   │  │ Steps                     │    │  left: textarea,
│  │ 1. Run the checks         │  │ 1. Run the checks         │    │  monospace 14px
│  │ 2. ...                    │  │ 2. ...                    │    │  right: ArticleBody
│  │                           │  │                           │    │  render, scrolls
│  └───────────────────────────┘  └───────────────────────────┘    │  independently
│  Markdown supported — headings, lists, tables, code, links.      │  helper text 13px muted
└──────────────────────────────────────────────────────────────────┘
```

Below 1024px — tabbed (per architecture §5.2):

```
│  Title [________________________________]            │
│  ( Write )  ( Preview )        ← tabs, Write default │
│  ┌──────────────────────────────────────────────┐    │
│  │ textarea OR preview, full width              │    │
│  └──────────────────────────────────────────────┘    │
│  [ Cancel ]                    [ Save article ]       │  actions move below content,
                                                          Save right-aligned
```

Editor behavior details in §4.3.

#### S6 — Not found (404)

Centered `EmptyState` (§5 pattern) in `main`: 32px document-question icon, h1 22px "Article not found", body 14px "It may have been deleted, or the link is wrong.", primary button "Back to all articles" → `/`. Also used verbatim for any unknown route.

---

## 2. Feature UX decisions

### 2.1 Article browsing (brief feature 1)

- **Home = the list.** No dashboard, no hero. The first thing a user sees is the full article inventory plus search — this *is* the search-first, low-friction requirement.
- **Cards over table rows** at this data shape (title + time only): a two-column grid at ≥1024px shows ~10–12 articles above the fold at typical heights, which is dense enough, while giving titles room to wrap. A table earns its keep only with ≥3 columns of data, which v1 doesn't have.
- **List ↔ detail round-trip cost is the metric.** Card click → detail; "← All articles" (top-left, first focusable element in `main`) → list; browser back also works because everything is a real route. Header logo is a constant escape hatch.
- **No "views", filters, or sort controls in v1** — only one sort exists (recently updated), and the corpus is small. Don't build a control for a single option.

### 2.2 Search (brief feature 2) — the flagship interaction

Two surfaces, one backend (architecture §5.1):

**A. Header dropdown (search-as-you-type)**

- Input fires `GET /api/search?q=…&limit=5` debounced **200 ms**, only when the trimmed query is **≥ 2 characters**. Below 2 chars: dropdown closed, no request.
- Dropdown anchors under the input, same width (min 320px), `--color-surface`, 1px `--color-border`, radius 8px, shadow `--shadow-md`, max 5 result items + one footer action row:
  - **Result item:** title (14px, medium) + snippet line (13px, `--color-text-secondary`, single line, ellipsis, `<mark>` highlighted). Two-line item, padding 8px 12px.
  - **Footer row:** "See all {total} results →" → `/search?q=…`. Always present when results exist, even if total ≤ 5 (consistent muscle memory).
- **Keyboard model (combobox pattern, §7.3):** `↓`/`↑` move the active option (wraps); `Enter` opens the active option, or — when nothing is active — navigates to `/search?q=…`; `Esc` closes the dropdown first, then (second press) clears the input; `Tab` closes the dropdown and moves on. Mouse hover sets the active option; click navigates.
- **While loading:** keep the previous results rendered (no flicker); show a 16px spinner replacing the `/` kbd hint inside the input. Never show a skeleton in the dropdown.
- **No results (≥2 chars, response empty):** dropdown stays open with one non-interactive row: "No matches for “{q}” — press Enter to search everything" (13px, muted). Enter still goes to S3, which shows the full empty state.
- **Request error:** one non-interactive row "Search isn’t responding — press Enter to open full search" (13px, `--color-danger-text`). Don't toast; don't retry automatically.
- After navigation (any route change), close the dropdown and **clear the input** — except when navigating to `/search`, where the input keeps the query.
- Stale-response guard: ignore responses for queries that no longer match the input value (track a request sequence number).

**B. Full results page (`/search?q=…`)**

- Server-rendered, shareable, default limit 20 (API default). Count line "{n} result{s} for “{q}”" doubles as the `aria-live` announcement target.
- Row anatomy in §1.3/S3. Highlighting in both surfaces uses the same `<mark>` token renderer.
- If `q` is missing/blank, render the page with an instruction state: "Type in the search box above to search all articles." — never an error.

### 2.3 Editing (brief feature 3) — Markdown with live preview

Decided by the architecture spec: plain `<textarea>` + `react-markdown` preview, split-pane ≥1024px, Write/Preview tabs below. UX decisions on top of that:

- **Title field** sits above the panes, full width — it applies to both, and putting it inside the Write tab would hide it during preview.
- **Textarea:** monospace (`--font-mono`) 14px / line-height 1.6, padding 12px, min-height 360px, auto-grows with content (no inner scrollbar on desktop; the page scrolls). Spellcheck on. No toolbar, no formatting buttons — the helper line under the editor ("Markdown supported — headings, lists, tables, code, links.") is the entire affordance. This is deliberate: the audience is an internal team, and a toolbar invites WYSIWYG expectations the renderer won't meet.
- **Preview pane** renders through the shared `ArticleBody` component (identical to S2 — preview parity is a hard requirement). Re-render debounced **150 ms** after the last keystroke. The pane scrolls independently on desktop (`max-height: calc(100vh - header - chrome)`, `overflow-y: auto`). No scroll-syncing in v1 (complexity > value at typical article lengths).
- **Empty preview** (content blank): muted 14px placeholder "Nothing to preview yet." centered in the pane.
- **Validation** (Zod, same schema both sides — architecture §5.2):
  - Validate a field on **blur** and the whole form on **submit**. Never validate on first keystroke; once a field has shown an error, re-validate it on every change so the error clears the moment it's fixed.
  - Messages (exact copy): `Title is required` · `Title must be 200 characters or fewer` · `Content is required` · `Content must be 100,000 characters or fewer`.
  - Presentation: field border → `--color-danger`, message 13px `--color-danger-text` with a 14px alert icon directly below the field, wired via `aria-describedby` + `aria-invalid="true"`. On failed submit, focus the **first** invalid field.
  - **Character counters** appear only near the limit (≥180 chars for title, ≥90,000 for content): right-aligned 12px muted "187/200", turning `--color-danger-text` past the limit. Hidden otherwise — counters are noise at normal lengths.
- **Save:** primary button "Save article". On click: client-validate → disable button + inline 16px spinner + label "Saving…" → `POST`/`PUT` → on success `router.push` to the detail page (the arrival at the updated detail page *is* the success state — no toast layer in v1). On server validation error (400): map `fieldErrors` onto the fields exactly like client errors. On network/500: form-level error banner (§4.6) above the title field — "Couldn’t save. Your text is still here — try again." — keep all input intact, re-enable the button, focus the banner.
- **Cancel:** secondary button. New → `/`; Edit → `/articles/[id]`. If the form is **dirty**, intercept with the confirm dialog (§4.4 variant): title "Discard changes?", body "Your edits haven’t been saved.", buttons "Keep editing" (secondary, default-focused) / "Discard" (danger). Dirty = current title or content differs from initial values.
- **Unsaved-changes guard:** `beforeunload` listener registered only while dirty (covers tab close/refresh); the Cancel dialog covers in-app navigation. Don't attempt to intercept header navigation links beyond `beforeunload` — over-guarding is worse than the rare loss.
- **Tabs (<1024px):** "Write / Preview" use the tab pattern (§7.3); switching tabs never resets textarea content, scroll, or cursor (keep the textarea mounted, hide with CSS).

### 2.4 Delete

- Trigger only from S2 (no delete on list cards — destructive actions don't belong on browse surfaces).
- Confirm dialog (§4.4): title "Delete “{article title}”?", body "This permanently deletes the article. This can’t be undone.", buttons "Cancel" (secondary, **default-focused** — safest action gets focus) / "Delete" (danger). While deleting: danger button disabled + spinner + "Deleting…". On success: `router.push('/')`. On error: replace the dialog body with "Couldn’t delete. Try again." and re-enable.
- No undo/trash in v1 (single-entity schema; the confirm dialog is the safety net). Logged in §10.

---

## 3. Responsive design

### 3.1 Breakpoints (match Tailwind defaults used in the architecture)

| Token | Width | Target (per brief) |
|---|---|---|
| base | < 768px | Mobile — **not a v1 target, but must not break** (graceful, untested beyond smoke) |
| `md` | ≥ 768px | Tablet — supported |
| `lg` | ≥ 1024px | Desktop — primary |

### 3.2 What changes at each breakpoint

| Element | Desktop ≥1024 | Tablet 768–1023 | Mobile <768 (graceful) |
|---|---|---|---|
| Header | Logo + name · search (max 480px) · "+ New article" | Same | Name hidden (logo glyph only, still a labeled link); button becomes icon-only `+` with `aria-label="New article"`; search box flexes to fill |
| Home list | 2-column card grid, gap 16px | 1 column | 1 column |
| Detail actions | Right of the h1 | Right of the h1 | Wrap to a full row under the title |
| Editor | Split pane 1fr/1fr, gap 24px | Write/Preview tabs | Write/Preview tabs |
| Editor actions | Top right, sticky with heading | Below content, Save right | Below content, buttons full-width stacked (Save on top) |
| `main` padding | 24px | 24px | 16px |
| Search dropdown | Anchored, input width | Same | Full viewport width minus 16px margins |

### 3.3 Touch targets and touch patterns (tablet is a touch surface)

- **Minimum interactive target: 44×44px** on every pointer-coarse surface. Concretely: buttons are 40px tall but get `min-height: 44px` via padding at `<lg`; list cards and search-result rows already exceed it; the icon-only header `+` button is 44×44; dropdown items get `min-height: 44px` below `lg` (40px at desktop).
- At least **8px spacing** between adjacent targets (e.g., Edit/Delete on S2, Cancel/Save).
- Hover is never the only affordance: every hover treatment (card border, link underline) has a non-hover equivalent (cards have visible borders at rest; links in body text are always underlined).
- No swipe gestures, no long-press actions, no pull-to-refresh — nothing invisible. All actions are visible tap targets.
- The `/` keyboard hint inside the search input is hidden on pointer-coarse devices (`@media (pointer: coarse)`).
- Inputs use `font-size ≥ 16px` on small screens to prevent iOS zoom-on-focus (body inputs are 16px already; the 14px monospace textarea bumps to 16px below `md`).

---

## 4. Component specs and UI states

Six UI primitives (architecture §2: `Button`, `Input`, `Card`, `EmptyState`, `Badge`, `PageHeader`) plus the four feature components. State definitions below are exhaustive — if a state isn't listed for a component, it doesn't exist.

A normative note on shared states:

- **Focus (everything interactive):** 2px ring `--color-focus`, offset 2px (`outline: 2px solid var(--color-focus); outline-offset: 2px`), only on `:focus-visible`. Never remove outlines without this replacement.
- **Disabled (all controls):** `opacity: 0.5`, `cursor: not-allowed`, ignore pointer events, removed from tab order only when semantically gone (otherwise keep focusable with `aria-disabled` so SR users can discover them — use real `disabled` for the in-flight Save/Delete buttons).

### 4.1 Button

Variants: **primary** (filled accent), **secondary** (outlined neutral), **danger** (filled `--color-danger`), **ghost-danger** (text-only danger, used for Delete on S2). Height 40px (≥`lg`) / min 44px (<`lg`), padding 0 16px, radius `--radius-sm` (6px), font 14px medium, optional 16px leading icon with 8px gap.

| State | Primary | Secondary | Danger / ghost-danger |
|---|---|---|---|
| Default | bg `--color-accent`, text `#fff` | bg `--color-surface`, 1px `--color-border-strong`, text `--color-text` | bg `--color-danger`, text `#fff` / transparent, text `--color-danger-text` |
| Hover | bg `--color-accent-hover` | bg `--color-bg` | bg `--color-danger-hover` / bg `--color-danger-bg` |
| Active (pressed) | same as hover + `transform: translateY(1px)` | same pattern | same pattern |
| Focus | shared focus ring | shared | shared |
| Loading | `disabled` + 16px spinner replaces icon + verb label ("Saving…", "Deleting…"); width locked to pre-loading width to prevent layout shift | n/a (secondary never loads) | same as primary |
| Disabled | shared disabled treatment | shared | shared |

### 4.2 Input (text) & Textarea

Height 40px (input), padding 8px 12px, radius 6px, bg `--color-surface`, 1px `--color-border-strong`, text 16px / placeholder `--color-text-muted`. Textarea per §2.3.

| State | Treatment |
|---|---|
| Default | as above |
| Hover | border `--color-text-secondary` |
| Focus | shared focus ring; border unchanged |
| Error | border `--color-danger`, `aria-invalid="true"`, message + icon below (13px `--color-danger-text`), linked by `aria-describedby` |
| Disabled | shared disabled treatment (not used in v1 flows, exists in the primitive) |

Labels: always visible `<label>` above the field, 14px medium, 6px gap. No placeholder-as-label anywhere.

### 4.3 SearchBox (header)

Composite: Input (with 16px leading search icon and trailing `/` kbd hint) + dropdown (`role="listbox"`).

| State | Treatment |
|---|---|
| Default (empty) | placeholder "Search articles…", kbd hint visible |
| Focus | shared ring; if ≥2 chars and results cached, reopen dropdown |
| Typing <2 chars | dropdown closed, no request |
| Loading | spinner replaces kbd hint; previous results stay visible |
| Results | dropdown open: ≤5 items + "See all {n} results →" footer; active item bg `--color-bg`, 2px left border `--color-accent` |
| Empty results | single muted row: "No matches for “{q}” — press Enter to search everything" |
| Error | single row in `--color-danger-text`: "Search isn’t responding — press Enter to open full search" |
| Dismissed | `Esc` (1st press), outside click, `Tab`, or navigation closes it |

### 4.4 ConfirmDialog (delete + discard-changes)

Modal, centered, max-width 400px, `--color-surface`, radius 8px, shadow `--shadow-lg`, backdrop `rgb(0 0 0 / 0.4)`. `role="alertdialog"`, `aria-labelledby` (title) + `aria-describedby` (body). Focus trapped; initial focus on the **safe** button (Cancel / Keep editing); `Esc` and backdrop click cancel; on close, focus returns to the trigger. Title 18px semibold, body 14px `--color-text-secondary`, buttons right-aligned with 8px gap (safe action left, destructive right).

States: **open**, **acting** (destructive button loading-disabled, Cancel and Esc also disabled during flight), **error** (body swaps to error copy, buttons re-enabled).

### 4.5 Card / search-result row / links

| Element | Default | Hover | Focus | Active |
|---|---|---|---|---|
| Card (S1) | surface, 1px `--color-border` | border `--color-border-strong`, title color `--color-accent` | shared ring on the card | translateY(1px) |
| Result row (S3) | transparent, divider below | bg `--color-bg` | shared ring (inset) | — |
| Inline/body links | `--color-accent`, underlined | `--color-accent-hover` | shared ring | — |
| Nav links (← All articles, logo) | `--color-text-secondary`, no underline | `--color-text` + underline | shared ring | — |

No elevation/shadow changes on hover (calm > springy); border + color shifts carry the affordance.

### 4.6 Form-level error banner

Full-width of the form, bg `--color-danger-bg`, 1px `--color-danger`, radius 6px, padding 12px, 14px `--color-danger-text` with 16px alert icon. `role="alert"` (announces immediately), `tabindex="-1"` and programmatically focused when shown. Only appears for non-field errors (network/500).

### 4.7 Badge & PageHeader (primitives without v1 feature use)

`Badge` (13px, pill, bg `--color-bg`, 1px border, used in v1 only for the article-count chip on S1/S3 headers; reserved for status/tags in v2). `PageHeader` = h1 + optional right-slot (count or action buttons) + 1px bottom border, margin-bottom 24px.

### 4.8 Loading states for pages

RSC pages render complete on the server — **no skeleton screens** for full navigations (the navigation itself is the wait, and Next streams HTML). The only in-page loading indicators in the app: search spinner (§4.3), Save/Delete button spinners (§4.1). Do not add a global progress bar or page spinners in v1.

---

## 5. Empty states (brief-mandated, first-class)

All use the `EmptyState` primitive: centered in the content area, max-width 380px, 32px icon in `--color-text-muted`, title 18px semibold, body 14px `--color-text-secondary`, optional action button, vertical rhythm 12px, top margin 64px.

| # | Where | Icon | Title | Body | Action |
|---|---|---|---|---|---|
| 5.1 | S1, zero articles | document-plus | "No articles yet" | "Create the first article and start your team’s knowledge base." | Primary "Create your first article" → `/articles/new` |
| 5.2 | S3, zero results | search-x | "No results for “{q}”" | "Check the spelling or try a broader term." | Secondary "Clear search" → `/` |
| 5.3 | S6, missing article / bad route | document-question | "Article not found" | "It may have been deleted, or the link is wrong." | Primary "Back to all articles" → `/` |

The brief's third named case ("missing categories") has no v1 surface — categories are feature 4, out of scope per the architecture. The 404/missing-article state stands in as the third mandated empty state; when categories ship, reuse this primitive (decision §10-7).

---

## 6. Visual style system

Implemented as Tailwind 4 `@theme` tokens in `src/app/globals.css`. Light theme only in v1 (no dark mode — logged in §10-6).

### 6.1 Color tokens

Neutral = Tailwind "stone" ramp (slightly warm gray — calm and readable, less clinical than blue-grays). One accent. All pairs meet WCAG AA (§7.1).

```css
@theme {
  /* surfaces */
  --color-bg:            #FAFAF9;  /* page background */
  --color-surface:       #FFFFFF;  /* cards, header, inputs, dialogs */
  --color-border:        #E7E5E4;  /* hairlines, dividers, card borders */
  --color-border-strong: #78716C;  /* form-control borders (≥3:1 non-text contrast) */

  /* text */
  --color-text:           #1C1917; /* headings, body          — 16.1:1 on surface */
  --color-text-secondary: #57534E; /* meta, snippets, labels  —  7.1:1 on surface */
  --color-text-muted:     #78716C; /* placeholders, hints     —  4.8:1 on surface */

  /* accent (single hue: calm blue) */
  --color-accent:        #1D4ED8;  /* links, primary buttons  — 6.4:1 on white */
  --color-accent-hover:  #1E40AF;
  --color-focus:         #1D4ED8;  /* focus rings */

  /* semantic */
  --color-danger:        #B91C1C;  /* danger fills/borders — white text = 5.9:1 */
  --color-danger-hover:  #991B1B;
  --color-danger-text:   #B91C1C;  /* danger text on white/danger-bg */
  --color-danger-bg:     #FEF2F2;
  --color-success-text:  #15803D;  /* reserved; v1 has no success banners */
  --color-mark:          #FDE68A;  /* search highlight bg; text stays --color-text */

  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.08);
  --shadow-lg: 0 8px 24px rgb(0 0 0 / 0.16);
  --radius-sm: 6px;   /* buttons, inputs */
  --radius-md: 8px;   /* cards, dialogs, dropdown */
}
```

Usage rules: the accent appears only on interactive elements (links, primary button, focus, active dropdown item). Headings and chrome stay neutral — this is what keeps the interface calm while hierarchy comes from type, not color.

### 6.2 Typography

**System font stacks — no webfont.** Zero load cost, native rendering, fits "easy to run locally" and the calm/utilitarian tone.

```css
@theme {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "Cascadia Code", "SF Mono", Menlo, Consolas, monospace;
}
```

Type scale (rem values at 16px root; use these names as the only sizes in the app):

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `--text-xs` | 12px / 1.4 | 400 | char counters, kbd hint |
| `--text-sm` | 13px / 1.5 | 400 | meta lines, helper text, error messages, badges |
| `--text-base` | 14px / 1.5 | 400/500 | UI controls, snippets, dialog body, labels (500) |
| `--text-md` | 16px / 1.65 | 400 | article body, inputs, dropdown titles |
| `--text-lg` | 18px / 1.4 | 600 | card titles, dialog titles, empty-state titles |
| `--text-xl` | 22px / 1.3 | 600 | section h1 (search results, editor pages) |
| `--text-2xl` | 28px / 1.25 | 700 | page h1 (home "Articles", article titles) |

### 6.3 ArticleBody prose styles (rendered Markdown — detail page and preview)

Reading column `max-width: 72ch`. Body `--text-md` (16/1.65), paragraphs spaced 16px. Content headings step *below* the page h1: content `h1` → 24px/700 (semantically fine as-is; don't remap levels), `h2` → 20px/600 with 32px top margin, `h3` → 17px/600. Lists: 24px indent, 6px item gap. Inline code: `--font-mono` 14px, bg `#F5F5F4`, padding 1px 5px, radius 4px. Code blocks: same bg, 16px padding, radius 6px, horizontal scroll (no syntax highlighting in v1). Tables (GFM): 1px `--color-border` collapsed, header row bg `--color-bg`, cell padding 8px 12px, wrapped in `overflow-x: auto`. Blockquote: 3px left border `--color-border-strong`, text `--color-text-secondary`, padding-left 16px. Links: accent + underline. Images: `max-width: 100%`, radius 6px. `hr`: 1px `--color-border`.

### 6.4 Spacing

4px base unit. Allowed steps only: **4, 8, 12, 16, 24, 32, 48, 64** (`--space-1/2/3/4/6/8/12/16`, matching Tailwind's default scale so utilities map directly). Standard applications: control padding 8/12, card padding 16, grid/pane gaps 16/24, section gaps 24, page-header bottom margin 24, empty-state top offset 64.

### 6.5 Iconography

**Lucide icons, copied as local inline-SVG components** (`src/components/ui/icons.tsx`) — no icon package dependency, no icon font. Stroke 1.75, `currentColor`, default 16px (20px in header, 32px in empty states). The full v1 set (exactly these, nothing else): `search`, `plus`, `pencil`, `trash-2`, `x`, `arrow-left`, `file-text` (logo), `file-plus-2`, `search-x`, `file-question`, `alert-circle`, `loader-circle` (spinner, `animation: spin 0.8s linear infinite`). Decorative icons get `aria-hidden="true"`; icon-only buttons get `aria-label`.

---

## 7. Accessibility

V1 implements the items below (brief scope: accessible interactions + readable contrast). Full audit is design-only/deferred — but these are *not optional*:

### 7.1 Contrast (all AA-verified for the §6.1 palette)

| Pair | Ratio | Requirement |
|---|---|---|
| `--color-text` on surface/bg | 16.1:1 / 15.4:1 | ≥4.5 ✓ |
| `--color-text-secondary` on surface | 7.1:1 | ≥4.5 ✓ |
| `--color-text-muted` on surface | 4.8:1 | ≥4.5 ✓ |
| `--color-accent` text on white | 6.4:1 | ≥4.5 ✓ |
| White on `--color-accent` / `--color-danger` | 6.4:1 / 5.9:1 | ≥4.5 ✓ |
| `--color-danger-text` on `--color-danger-bg` | 5.5:1 | ≥4.5 ✓ |
| `--color-text` on `--color-mark` | 12.9:1 | ≥4.5 ✓ |
| `--color-border-strong` control borders on surface | 4.8:1 | ≥3 (non-text) ✓ |
| `--color-focus` ring on bg/surface | ≥3:1 | ≥3 (non-text) ✓ |

Hairline `--color-border` is decorative only — never the sole boundary of a control.

### 7.2 Landmarks & structure

`<header>` (banner) → skip link → `<main id="main">` per page; search box wrapped in `role="search"`. **Skip link** "Skip to content" is the first tab stop: visually hidden until focused, then pinned top-left as a small primary-styled link. Exactly one `h1` per page chrome (article-content h1s inside `ArticleBody` are content, acceptable). Lists are `<ul>/<li>` (card grid, results). Relative times use `<time datetime>` with absolute `title`.

### 7.3 Keyboard

- Everything operable by keyboard; tab order = DOM order = visual order. Per-page first-stop after skip link: header logo → search → New article → `main` content top.
- `/` focuses search (suppressed while focus is in any input/textarea/contenteditable).
- **SearchBox combobox:** input has `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant` tracking the active `role="option"`; full key model in §2.2A. Active option is *visually* indicated and never relies on DOM focus leaving the input.
- **Editor tabs (<1024px):** `role="tablist"/"tab"/"tabpanel"`, arrow keys move + activate, `aria-selected`, panel labeled by its tab.
- **Dialog:** focus trap, `Esc` cancels, focus restored to trigger (§4.4).
- Forms submit with `Enter` from the title input; `Ctrl/Cmd+Enter` submits from the textarea (plain Enter must insert newlines).

### 7.4 Screen readers

- Search result count on S3 and in the dropdown: wrap in `aria-live="polite"` (e.g., "3 results for deploy"). Announce dropdown state changes through the count node, not by re-rendering the listbox with `aria-live`.
- Icon-only controls: `aria-label` ("New article", "Clear search"). Spinners: `role="status"` + visually-hidden "Saving…"/"Searching…" text.
- Error messages tied with `aria-describedby` + `aria-invalid`; form banner `role="alert"`.
- Card links: the link's accessible name is the article title (the time element is inside the link and read after — acceptable; do not `aria-label` over it).
- `<mark>` is announced inconsistently by SRs — acceptable; the snippet text carries the meaning without the highlight.
- `<html lang="en">`.

### 7.5 Focus order specifics

- After failed submit → first invalid field. After dialog close → trigger button. After "Clear search" → home, default order. Route changes rely on Next.js's built-in route announcer; additionally give the page `h1` `tabindex="-1"` and focus it after client-side `router.push` (post-save lands the user on the new article title — both announced and visible).

### 7.6 Motion

All animation (dropdown/dialog open: 150 ms ease-out fade + 4px translate; spinner) wrapped in `@media (prefers-reduced-motion: no-preference)`. With reduced motion: instant open/close; the spinner may persist as a static icon with the `role="status"` text carrying state.

---

## 8. Handoff notes

### 8.1 Component → file map (matches architecture §7.1)

| Component | File | Notes |
|---|---|---|
| `Button` | `src/components/ui/Button.tsx` | `variant: 'primary'│'secondary'│'danger'│'ghost-danger'`, `loading?: boolean` (locks width, swaps icon for spinner, sets `disabled`), `icon?` |
| `Input` | `src/components/ui/Input.tsx` | label, `error?: string` (renders message + `aria-*` wiring), leading icon slot |
| `Card` | `src/components/ui/Card.tsx` | link-wrapped article card: `title`, `updatedAt` |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | `icon`, `title`, `body`, `action?` (§5 table is the only content source) |
| `Badge` | `src/components/ui/Badge.tsx` | count chip; v2-ready for status/tags |
| `PageHeader` | `src/components/ui/PageHeader.tsx` | `title`, `rightSlot?` |
| Icons | `src/components/ui/icons.tsx` | the 12 Lucide SVGs from §6.5, no package |
| `SearchBox` | `src/components/SearchBox.tsx` | client; §2.2A + §4.3 are normative; include stale-response guard |
| `ArticleEditor` | `src/components/ArticleEditor.tsx` | client; §2.3 normative; `mode: 'new'│'edit'` |
| `ArticleBody` | `src/components/ArticleBody.tsx` | react-markdown + remark-gfm + §6.3 prose styles; used by S2 *and* preview |
| `DeleteArticleButton` | `src/components/DeleteArticleButton.tsx` | ghost-danger trigger + ConfirmDialog (§4.4) |
| `ConfirmDialog` | inside `DeleteArticleButton.tsx` or `ui/` if reused by the editor's discard guard — extract to `ui/ConfirmDialog.tsx` since both need it | `title`, `body`, `confirmLabel`, `danger`, `busy` |

### 8.2 Token implementation

All §6 tokens go in `src/app/globals.css` under Tailwind 4 `@theme` exactly as written (they become `bg-surface`, `text-text-secondary`, `rounded-sm`, etc. utilities automatically). Do not hardcode any hex, px-size, or shadow outside `globals.css`. Spacing uses Tailwind's default 4px scale (§6.4 lists the allowed steps — lint by convention, not tooling).

### 8.3 Copy reference (use verbatim — no placeholder text anywhere)

- App name: **Team KB** · header button: **New article** · search placeholder: **Search articles…**
- Buttons: **Save article / Saving… / Cancel / Edit / Delete / Deleting… / Keep editing / Discard / Clear search / Back to all articles / Create your first article / See all {n} results →**
- Validation + error copy: §2.3 and §4 tables. Empty-state copy: §5 table. Dialog copy: §2.4 / §2.3.
- Meta lines: list "Updated {relative}", detail "Updated {Mon D, YYYY} · Created {Mon D, YYYY}".

### 8.4 Things that look like decisions but are already decided

- No toasts, no skeletons, no page spinners, no pagination, no dark mode, no sort/filter controls, no editor toolbar, no scroll-sync, no avatars/authors (no auth → no identity).
- Search dropdown limit is 5; full page limit 20 (API defaults). Debounces: search 200 ms, preview 150 ms. Min query length 2.
- Buttons never stretch full-width except editor actions <768px and empty-state CTAs ≤380px container width.
- The `<mark>` renderer is the whitelist splitter from architecture §5.1 — never `dangerouslySetInnerHTML`.

---

## 9. State coverage checklist (QA aid)

| Flow (brief-required) | States that must demo |
|---|---|
| Browse | populated grid (1-col and 2-col), zero-articles empty state, card hover/focus, 404 |
| Search | idle, <2 chars, loading (spinner, results retained), results+footer, zero-results row, error row, keyboard navigation, full page with count + highlights, full-page empty state, blank-`q` instruction state |
| Edit/Create | pristine, dirty, field errors (all 4 messages), counters near limits, preview empty/live, tabs <1024, Save loading, server 400 mapped to fields, network-error banner, discard-changes dialog, `beforeunload` |
| Delete | dialog open, acting, error, post-delete redirect |

---

## 10. Decisions log

| # | Decision | Alternatives considered | Why |
|---|---|---|---|
| 1 | Cards show **title + updated time only**, 2-col grid | Excerpt-rich cards; table rows | List API deliberately omits `content` (architecture §6.2); fetching bodies for excerpts would defeat that. With two data points, a dense card grid out-scans a 2-column table. |
| 2 | Search dropdown = lightweight top-5 + "see all", full page owns completeness | Command-palette overlay (⌘K); results-only-on-page | Search-first per brief, but a palette is heavier to build and duplicates the header input. The `/` shortcut gives power users the same speed at near-zero cost. |
| 3 | **No toast system** — success = arriving at the updated page; errors are inline | Toast on save/delete | One less subsystem; navigation already confirms success unambiguously. Errors stay next to what failed, which beats a corner toast for forms. |
| 4 | No editor toolbar; helper line + live preview only | Markdown toolbar buttons (B/I/link) | Brief: simple and reliable. A toolbar implies WYSIWYG; the preview pane is the honest affordance for "what will this render as." |
| 5 | System font stack, light theme only | Inter webfont; dark mode | Calm/utilitarian tone doesn't need a brand face; zero font loading aligns with local-first. Dark mode doubles the contrast-verification surface for an internal v1 — deferred. |
| 6 | Delete only from detail, confirm dialog, no undo | Row-level delete; soft-delete/trash | Destructive action lives where the user can see what they're destroying. Trash needs schema + UI that v1 scope (features 1–3) doesn't grant. |
| 7 | Third mandated empty state mapped to **article-not-found** | Building a category-missing state | Categories are feature 4, explicitly out of v1 (architecture §12.2). The `EmptyState` primitive is reusable when they ship. |
| 8 | Mobile (<768px) gets a defined graceful layer despite not being a target | Ignore <768 entirely; full mobile support | Brief: must not break. Defining icon-only header, stacked actions, and 44px targets costs ~zero and prevents accidental breakage; full mobile QA stays out of scope. |
| 9 | Focus h1 after client-side navigation + Next route announcer | Rely on announcer alone | Post-save context change is the app's most important confirmation; making it both announced and visually anchored costs one `tabindex="-1"`. |
| 10 | Sticky header (and editor action row on desktop) | Static header | Long articles + search-first: search must stay reachable mid-read; Save must stay reachable mid-edit. 56px is cheap on ≥768px viewports. |
