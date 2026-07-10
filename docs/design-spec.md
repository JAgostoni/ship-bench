# UX / Design Direction Spec — Simplified Knowledge Base App

**Version:** 1.0  
**Date:** 2026-07-10  
**Sources of truth:** [`docs/product-brief.md`](./product-brief.md), [`docs/architecture.md`](./architecture.md)

---

## 0. Purpose and design principles

This document is the **implementation-ready UX and visual design direction** for the Simplified Knowledge Base App. A developer should be able to build the UI from this spec **without inventing layout structure, interaction patterns, tokens, or empty/error states**.

### 0.1 Product goals → design implications

| Goal | Design implication |
|------|-------------------|
| Find answers quickly | Search-first header; dense list rows; one-click path list → detail |
| Keep knowledge current | Low-friction edit entry from detail; explicit Save; clear draft/published |
| Calm, readable, information-dense | Neutral palette, tight spacing scale, strong type hierarchy, no marketing chrome |
| Desktop + tablet primary | Two-column filters|list from `md`; stacked single column below |
| Finishable in 1–2 sessions | No separate admin shell; no multi-step wizards; reuse one form for create/edit |

### 0.2 Design language (tone)

- **Calm:** Quiet surfaces, minimal borders, no gradients, no illustrations on empty states beyond a single lucide icon.
- **Readable:** Body text ≥ 16px, article prose max ~65–75ch, generous line-height on detail only.
- **Information-dense:** List rows show title, excerpt (2 lines), category, status, relative date — no large hero cards.
- **Low friction:** Primary actions always visible (New article, Search, Edit, Save). Prefer URL-driven filters over modals.
- **Not:** Marketing landing aesthetics, glassmorphism, heavy shadows, animated page transitions, decorative sidebars.

### 0.3 Explicit design assumptions

Aligned with architecture assumptions A1–A8 unless noted:

| ID | Assumption |
|----|------------|
| D1 | **No auth UI in v1.** No login, avatar, or role badges. |
| D2 | **Categories + tags + draft/published are in v1 UI** (architecture includes them). |
| D3 | **WYSIWYG (TipTap), not Markdown dual-pane.** Toolbar above editor; live preview is the editor itself. |
| D4 | **Primary nav is minimal:** Knowledge Base (home), optional “Drafts” filter via URL — not a multi-section app nav. |
| D5 | **Delete is secondary:** Confirm via native `window.confirm` or a minimal inline confirm; no full modal system library. |
| D6 | **Relative dates** on list (`Updated 3d ago`); absolute on detail meta (`Updated Jul 10, 2026, 2:14 PM`). |
| D7 | **English UI copy only.** |
| D8 | **Icon set:** `lucide-react` only. Stroke icons, 16–20px default, 1.5–2px stroke. |

---

## 1. Information architecture and routes

### 1.1 Site map

```
App shell (header + main)
├── /                          Article list (default: published)
│   └── ?status= &category= &tag= &page=
├── /search?q=                 Full search results
├── /articles/new              Create article
├── /articles/[slug]           Article detail
├── /articles/[slug]/edit      Edit article
├── not-found                  404
└── error                      Unexpected error boundary
```

No separate settings, profile, or category-admin pages in v1.

### 1.2 Global navigation model

| Element | Location | Behavior |
|---------|----------|----------|
| Wordmark / app name | Header left | Link to `/`. Text: **Knowledge Base** |
| Search | Header center/right (flex-1 max width) | Typeahead; Enter or “View all” → `/search?q=` |
| New article | Header right | Primary button → `/articles/new` |
| Skip link | First focusable in `body` | “Skip to content” → `#main-content` |

There is **no** left app rail on mobile. Optional filter rail appears **only on list home** from `md` breakpoint.

### 1.3 Screen inventory (required)

| Screen ID | Route | Purpose |
|-----------|-------|---------|
| S1 Home list | `/` | Browse articles; filter; paginate |
| S2 Search results | `/search` | Full results for a query |
| S3 Article detail | `/articles/[slug]` | Read article |
| S4 Create | `/articles/new` | Create draft or published article |
| S5 Edit | `/articles/[slug]/edit` | Edit existing article |
| S6 Not found | `not-found` | Missing slug or unknown path |
| S7 Error | `error` | Uncaught render/runtime failure |

---

## 2. Layout and page flows

### 2.1 App shell layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [Skip]                                                           │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Logo          [======== Search box ========]    [New article]│ │
│ └──────────────────────────────────────────────────────────────┘ │
│ max-w-5xl mx-auto px-4 md:px-6 py-6                              │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ <main id="main-content">  page content                       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Tokens / classes (conceptual):**

- Shell background: `var(--color-bg)` (`#fafafa`)
- Header: sticky top-0, `z-40`, `bg-white/95 backdrop-blur-sm`, bottom border `var(--color-border)`
- Header height: **56px** mobile, **64px** `md+`
- Content container: `max-w-5xl` (64rem) for list/detail/search; form/editor content column `max-w-3xl` (48rem) centered within main

### 2.2 Wireflow: find and read (primary)

```
[Enter app /]
      │
      ├─► See list of published articles
      │         │
      │         ├─► Click row ──► [S3 Detail]
      │         │                      │
      │         │                      ├─► Edit ──► [S5 Edit] ──save──► [S3 Detail]
      │         │                      └─► Back to list (browser back or “All articles”)
      │         │
      │         ├─► Filter category/tag/status (URL updates, list re-SSR)
      │         └─► Paginate (?page=n)
      │
      └─► Focus search, type query
                │
                ├─► Click typeahead row ──► [S3 Detail]
                ├─► Enter / “View all results” ──► [S2 Search]
                │                                      │
                │                                      └─► Click result ──► [S3 Detail]
                └─► Empty typeahead → stay; full page empty state if no matches
```

### 2.3 Wireflow: create and publish

```
[Header: New article] ──► [S4 Create]
                              │
                              ├─ fill title (slug auto)
                              ├─ body (required)
                              ├─ status Draft | Published
                              ├─ category, tags (optional)
                              │
                              ├─ Save ──success──► redirect [S3 Detail]
                              ├─ validation error ──► stay on form, field errors
                              └─ Cancel ──► / (discard unsaved; no dirty guard in v1)
```

### 2.4 Wireflow: edit and conflict

```
[S3 Detail] ── Edit ──► [S5 Edit]
                            │
                            ├─ Save ──ok──► [S3 Detail] + success banner (optional, one-shot)
                            ├─ Save ──CONFLICT──► stay; alert banner + “Reload latest”
                            ├─ Save ──VALIDATION──► field errors
                            └─ Delete ──confirm──► / + list without article
```

### 2.5 Screen layouts

#### S1 — Home list (`/`)

**Desktop / tablet (`md+`, ≥768px):**

```
┌─ main max-w-5xl ─────────────────────────────────────────────┐
│ Page header: "Articles"                    [optional count]  │
│                                                               │
│ ┌─ filters 220px ─┐  ┌─ list flex-1 ───────────────────────┐ │
│ │ Status           │  │ [Article row]                       │ │
│ │  ○ Published     │  │ [Article row]                       │ │
│ │  ○ Drafts        │  │ [Article row]                       │ │
│ │  ○ All           │  │ ...                                 │ │
│ │                  │  │                                     │ │
│ │ Categories       │  │ Pagination: ‹ Prev  Page 1  Next ›  │ │
│ │  [All]           │  └─────────────────────────────────────┘ │
│ │  Engineering     │                                          │
│ │  Product         │                                          │
│ │  HR              │                                          │
│ │                  │                                          │
│ │ Tags             │                                          │
│ │  onboarding      │                                          │
│ │  runbook …       │                                          │
│ └──────────────────┘                                          │
└───────────────────────────────────────────────────────────────┘
```

**Mobile (`< md`):**

```
┌─ main ──────────────────────────┐
│ Articles                         │
│ [Status select ▾]                │
│ [Category select ▾] [Tag select] │
│ ──────────────────────────────── │
│ [Article row]                    │
│ [Article row]                    │
│ Pagination                       │
└──────────────────────────────────┘
```

**Article list row (clickable entire row → detail):**

```
┌────────────────────────────────────────────────────────────┐
│ Title (semibol, 1 line truncate)              [Draft badge]│
│ Excerpt plain text, 2 lines clamp, muted                   │
│ Engineering · onboarding, runbook · Updated 3d ago         │
└────────────────────────────────────────────────────────────┘
```

- Row padding: `12px 16px` (`py-3 px-4`)
- Row separator: 1px `var(--color-border)` between items (not card shadows)
- Hover: background `var(--color-bg-subtle)`
- Focus-visible: ring on the row link
- Uncategorized: show meta label **Uncategorized** (muted) when `categoryId` is null

**Page header actions:** none beyond global New article (avoid duplicate CTAs).

**Default filters:** `status=PUBLISHED` (or omit param = published). Showing drafts requires explicit filter.

#### S2 — Search results (`/search?q=`)

```
┌─ main max-w-5xl ───────────────────────────────────────────┐
│ Results for “onboarding”                    N articles     │
│                                                             │
│ ┌ result row ─────────────────────────────────────────────┐ │
│ │ Title (link)                                 [category] │ │
│ │ …snippet with <mark>highlighted</mark> terms…           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ...                                                         │
│ Empty: see §5 empty states                                  │
└─────────────────────────────────────────────────────────────┘
```

- No filter sidebar on search (keeps query simple). Search **published only** (architecture).
- If `q` empty: show prompt state “Enter a search term” + focus search box (link/button “Focus search”).

#### S3 — Article detail (`/articles/[slug]`)

```
┌─ main max-w-3xl (prose column) ────────────────────────────┐
│ ← All articles                                             │
│                                                             │
│ Title (H1)                                                  │
│ [Draft badge if draft]                                      │
│ Category · tag, tag · Updated Jul 10, 2026                  │
│                                    [Edit]  [Delete secondary]│
│ ─────────────────────────────────────────────────────────── │
│ Prose body (sanitized HTML)                                 │
│  h2, h3, p, lists, links, code, blockquote                  │
└─────────────────────────────────────────────────────────────┘
```

- **Back link:** text button with `ArrowLeft` icon → `/` (not browser history, so reliable).
- **Edit:** primary outline or secondary button → `/articles/[slug]/edit`
- **Delete:** ghost/danger text button; confirm: `"Delete “{title}”? This cannot be undone."` → on confirm call `deleteArticle` → redirect `/`
- Drafts reachable by URL; always show **Draft** badge so status is obvious.

#### S4 / S5 — Create & Edit form

Shared `ArticleForm` layout (`max-w-3xl`):

```
┌────────────────────────────────────────────────────────────┐
│ Create article  |  Edit article                            │
│                                                             │
│ Title *          [________________________________]        │
│                  error text                                 │
│                                                             │
│ Slug *           [________________________________]        │
│                  helper: URL path /articles/{slug}          │
│                                                             │
│ Status *         ( ) Draft   (•) Published                  │
│                                                             │
│ Category         [ Select category ▾ ]  (None = Uncategorized)
│ Tags             [ multi-select chips / checkbox list ]     │
│                                                             │
│ Content *                                                   │
│ ┌ toolbar ───────────────────────────────────────────────┐ │
│ │ B I S | H2 H3 | • 1. | Link | Code | ↶ ↷              │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │                                                        │ │
│ │  TipTap editable area  min-height 280px                │ │
│ │                                                        │ │
│ └────────────────────────────────────────────────────────┘ │
│                  content error text                         │
│                                                             │
│ [Save]  [Cancel]              (edit only: Delete far right) │
│ form-level error / conflict banner                          │
└────────────────────────────────────────────────────────────┘
```

**Slug behavior (create):** Auto-generate from title via `slugify` on each title change **until** user focuses/edits the slug field (`slugTouched = true`). After touch, never overwrite.

**Slug behavior (edit):** Prefilled; editable; uniqueness errors map to field.

**Tags control (v1):** Multi-select of existing tags (checkbox list in a bordered panel, or multi `<select>` with `size` — prefer **checkbox list** for clarity). Max 20 tags per validation. No free-text create unless `createTag` action is implemented; if not, only seed tags.

**Category control:** Native `<select>` with first option “No category”.

**Cancel:** Link-styled button to `/` (create) or `/articles/[slug]` (edit). No unsaved-changes modal in v1 (document in decisions log).

#### S6 — Not found

Centered in main:

- Icon: `FileQuestion` (lucide), 40px, muted
- Title: “Article not found”
- Body: “This article may have been deleted or the link is wrong.”
- Primary: “Back to articles” → `/`

#### S7 — Error boundary

- Title: “Something went wrong”
- Body: generic message (no stack in production UI)
- Primary: “Try again” (`reset()`)
- Secondary: “Back to articles” → `/`

---

## 3. Feature UX decisions

### 3.1 Article browsing

| Decision | Spec |
|----------|------|
| List density | Compact rows, not cards with images |
| Default content | Published only |
| Draft visibility | Status filter: Published / Drafts / All |
| Pagination | `pageSize=20`; controls below list: Prev / “Page N” / Next; disable edges |
| Sort | `updatedAt` descending only in v1 (no sort UI) |
| Empty list (no articles at all) | Empty state + CTA “Create article” |
| Empty list (filters exclude all) | Empty state “No articles match these filters” + “Clear filters” |
| Loading | Prefer SSR full HTML; if client navigation pending, optional `opacity-60` on list region — no skeleton required for v1 |

### 3.2 Search

| Decision | Spec |
|----------|------|
| Placement | Always in header (search-first) |
| Typeahead debounce | **250ms** after last keystroke |
| Min query | 1 character after trim; empty clears dropdown |
| Dropdown max results | **8** (`limit=8` typeahead); full page uses server default 10–20 |
| Dropdown UI | Absolute panel under search, `max-h-80 overflow-y-auto`, shadow-sm, border |
| Result row | Title + category badge + single-line excerpt |
| Keyboard | ↓/↑ move highlight; Enter opens highlighted or submits full search if none; Esc closes |
| Highlight | Server `<mark>` in snippets on full results; strip or style marks: `bg-amber-100 text-inherit rounded-sm px-0.5` |
| No results (dropdown) | “No published articles match” |
| Scope | Published only in typeahead and `/search` |

**SearchBox anatomy:**

```
[ 🔍  placeholder="Search articles…"                    ⌘K? ]
```

- Do **not** implement global ⌘K in v1 unless free; placeholder alone is fine.
- `role="combobox"`, `aria-expanded`, `aria-controls` listbox, `aria-activedescendant` on highlight.
- Width: `w-full max-w-md` in header flex.

### 3.3 Editing (create / update)

| Decision | Spec |
|----------|------|
| Editor | TipTap WYSIWYG + toolbar (architecture §7.3) |
| Autosave | **None** — explicit Save only |
| Required fields | Title, slug, content, status |
| Save button label | Create: **Save article**; Edit: **Save changes** |
| Success | Redirect to detail (no toast required); optional one-line success on detail via `?saved=1` then strip |
| Validation | Inline under fields; on submit scroll to first error |
| Conflict | Banner: “This article changed since you opened it. Reload to get the latest version.” + button Reload (hard navigate to edit URL) |
| Content empty | TipTap empty doc should serialize to empty / insufficient → field error “Content is required” |
| Toolbar sticky | Sticky under form header within editor card while scrolling long content (`sticky top-[header]`) optional; v1 can be static at top of editor |

**Toolbar buttons (order left → right):**

1. Bold, Italic, Strike  
2. Divider  
3. Heading 2, Heading 3  
4. Divider  
5. Bullet list, Ordered list  
6. Divider  
7. Link (prompt for URL via `window.prompt` in v1, or small popover if already available)  
8. Code block  
9. Divider  
10. Undo, Redo  

Each toolbar control: icon button 36×36, `aria-label`, pressed state when active mark/node (`aria-pressed`).

### 3.4 Categories and tags

| Decision | Spec |
|----------|------|
| Category model | Single optional category per article |
| Tag model | Many tags; display up to 3 on list row then “+N” |
| Filter interaction (desktop) | Clickable text/chip list; selected = filled chip `bg-accent-muted text-accent` |
| Filter interaction (mobile) | Native selects to save space |
| Missing categories in DB | Filter section shows empty state: “No categories yet. Seed data or add via form when available.” |
| Uncategorized articles | List/detail meta shows **Uncategorized** |
| No admin CRUD pages | Manage only via seed / optional create actions |

### 3.5 Draft / published status

| Decision | Spec |
|----------|------|
| Control | Radio group (not hidden toggle) for explicitness |
| Badge | Pill with text always: “Draft” or “Published” on edit form preview optional; list/detail: Draft only if draft (published has no badge to reduce noise) **or** show both — **decision: show Draft badge only; published is the default unspoken state** |
| List default | Published |
| Search | Drafts excluded |
| Detail draft | Visible badge under title |

**StatusBadge component:**

- Draft: `bg-amber-50 text-amber-900 border border-amber-200`
- Published (when shown): `bg-emerald-50 text-emerald-900 border border-emerald-200`
- Text always present; never color-only

### 3.6 Delete

- Only on detail and edit
- Confirm before action
- No soft-delete UI
- After delete → `/` with no success toast required

---

## 4. Responsive design

### 4.1 Breakpoints

Use Tailwind defaults:

| Name | Width | Layout behavior |
|------|-------|-----------------|
| default | 0–767px | Single column; stacked filters; header search full width wrap |
| `md` | ≥768px | Filter rail + list; header single row |
| `lg` | ≥1024px | Comfortable padding; same structure as `md` |

**Primary targets:** desktop and tablet (brief). Phone should remain usable but is not the design focus.

### 4.2 Header responsive behavior

**`< md`:**

```
Row 1: [Logo]              [New]
Row 2: [======== Search ========]
```

- Header becomes auto-height; `py-2` gaps  
- New article button: icon+text if space, or “New” short label

**`≥ md`:**

```
[Logo]  [==== Search max-w-md ====]  [New article]
```

### 4.3 Touch targets

| Control | Min size |
|---------|----------|
| Primary / secondary buttons | Height **40px**, horizontal padding ≥16px |
| Icon-only buttons (toolbar, close) | **36×36px** minimum hit area |
| List row | Full width; min height ~**64px** (title+excerpt+meta) |
| Filter chips / radio | Min height **36px** |
| Pagination controls | **40px** height |

Spacing between adjacent touch targets ≥ **8px**.

### 4.4 Mobile-specific patterns

- Filters: collapsible optional — **v1 default is always-visible stacked selects** (simpler than disclosure).
- Typeahead dropdown: full width of search input; on small screens max height `50vh`.
- Editor toolbar: horizontal scroll (`overflow-x-auto`) if tools wrap poorly; do not hide tools behind menus in v1.
- No bottom tab bar.

### 4.5 Content measure

| Surface | Max width | Reason |
|---------|-----------|--------|
| Shell / list / search | `max-w-5xl` (64rem) | Dense lists need horizontal room for meta |
| Detail prose + forms | `max-w-3xl` (48rem) | Readable line length ~65–75ch |
| Article body | prose ~`text-base` / `leading-7` | Long-form reading |

---

## 5. Visual style system

### 5.1 Design tokens (CSS variables)

Define in `src/app/globals.css` under `:root` (and map to Tailwind v4 `@theme` if preferred).

```css
:root {
  /* Surfaces */
  --color-bg: #fafafa;
  --color-bg-elevated: #ffffff;
  --color-bg-subtle: #f4f4f5;      /* zinc-100 */
  --color-bg-muted: #e4e4e7;       /* zinc-200 */

  /* Text */
  --color-text: #18181b;           /* zinc-900 — primary */
  --color-text-secondary: #52525b; /* zinc-600 */
  --color-text-muted: #71717a;     /* zinc-500 */
  --color-text-inverse: #ffffff;

  /* Borders */
  --color-border: #e4e4e7;         /* zinc-200 */
  --color-border-strong: #d4d4d8;  /* zinc-300 */

  /* Accent — sky (calm, not loud) */
  --color-accent: #0284c7;         /* sky-600 */
  --color-accent-hover: #0369a1;   /* sky-700 */
  --color-accent-muted: #e0f2fe;   /* sky-100 */
  --color-accent-foreground: #ffffff;

  /* Semantic */
  --color-danger: #dc2626;         /* red-600 */
  --color-danger-hover: #b91c1c;
  --color-danger-muted: #fef2f2;
  --color-success: #059669;        /* emerald-600 */
  --color-success-muted: #ecfdf5;
  --color-warning: #d97706;        /* amber-600 */
  --color-warning-muted: #fffbeb;
  --color-focus-ring: #0ea5e9;     /* sky-500 */

  /* Mark / search highlight */
  --color-highlight: #fef3c7;      /* amber-100 */

  /* Elevation */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 12px rgb(0 0 0 / 0.08);

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 9999px;

  /* Spacing scale (4px base) */
  --space-0: 0;
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */

  /* Typography */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
    "Liberation Mono", monospace;

  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */

  --leading-tight: 1.25;
  --leading-snug: 1.375;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Motion */
  --duration-fast: 120ms;
  --ease-default: ease;
}
```

**Tailwind mapping suggestion (v4 `@theme`):** map `--color-*` to `--color-bg`, `--color-accent`, etc., so utilities like `bg-bg`, `text-text`, `border-border`, `bg-accent` work. If naming collides, use prefixes: `--color-kb-bg`, utility `bg-kb-bg`.

### 5.2 Typography scale (usage)

| Role | Size | Weight | Line height | Color |
|------|------|--------|-------------|-------|
| Page title (H1 list/search) | `text-2xl` | semibold | tight | text |
| Article title (detail H1) | `text-3xl` | bold | tight | text |
| Section (form legend) | `text-lg` | semibold | snug | text |
| List title | `text-base` | semibold | snug | text |
| Body / prose | `text-base` | normal | relaxed | text |
| Excerpt / secondary | `text-sm` | normal | normal | text-secondary |
| Meta / captions | `text-xs` or `text-sm` | normal | normal | text-muted |
| Labels | `text-sm` | medium | normal | text |
| Button | `text-sm` | medium | — | per variant |
| Code (inline) | `text-sm` mono | normal | — | text |
| Code block | `text-sm` mono | normal | relaxed | text |

**Prose rules** (`.prose-article` in `globals.css`):

- `p` margin-bottom `1em`
- `h2` `text-xl font-semibold mt-8 mb-3`
- `h3` `text-lg font-semibold mt-6 mb-2`
- `ul, ol` padding-left `1.25rem`, margin-bottom `1em`
- `a` color accent, underline on hover
- `pre` bg-subtle, padding `1rem`, radius md, overflow-x auto
- `code` (inline) bg-subtle px-1 rounded-sm
- `blockquote` border-l-4 border-border-strong pl-4 text-secondary
- `mark` background `var(--color-highlight)`

Do **not** use display/marketing fonts. System stack only.

### 5.3 Spacing system

- Base unit **4px**
- Vertical page section gaps: `space-6` (24px)
- Form field stack gap: `space-4` (16px)
- Label → control: `space-1` / `space-2`
- Inline meta separators: middle dot `·` with `space-2` padding

### 5.4 Color usage rules

| Use | Token |
|-----|-------|
| Page background | `--color-bg` |
| Cards / header / editor chrome | `--color-bg-elevated` |
| Primary button | bg accent, text inverse |
| Links in chrome | accent |
| Destructive | danger text/button |
| Borders | `--color-border` default |
| Disabled text | `--color-text-muted` + 50% opacity on control |

**Contrast targets (WCAG AA):**

- Body text on bg/elevated: ≥ **4.5:1** (zinc-900 on white/zinc-50 ✓)
- Secondary text: zinc-600 on white ≥ 4.5:1 ✓
- Muted text (meta): zinc-500 — use only for non-essential meta; ensure ≥ 4.5:1 on white or bump to zinc-600 for critical info
- Primary button: white on sky-600 ≥ 4.5:1 ✓
- Focus ring: 2px solid accent + 2px offset; visible on white and subtle bg

### 5.5 Iconography

- Library: **lucide-react**
- Default size: **16px** inline with text; **20px** standalone header actions
- Color: `currentColor`
- Common icons:

| Action | Icon name |
|--------|-----------|
| Search | `Search` |
| New article | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Back | `ArrowLeft` |
| Empty articles | `FileText` |
| Empty search | `SearchX` |
| Empty categories | `FolderOpen` |
| External/link toolbar | `Link` |
| Bold etc. | `Bold`, `Italic`, `Strikethrough`, `Heading2`, `Heading3`, `List`, `ListOrdered`, `Code`, `Undo`, `Redo` |

### 5.6 Elevation and borders

- Prefer **1px borders** over shadows for list structure
- Dropdowns and elevated panels: `border + shadow-sm`
- No drop shadows on list rows
- Motion: `transition-colors` only (`var(--duration-fast)`); **no** page transition animations

---

## 6. Component specifications and UI states

### 6.1 Button

**Variants:** `primary` | `secondary` | `ghost` | `danger` | `danger-ghost`

| State | Primary | Secondary | Ghost | Danger |
|-------|---------|-----------|-------|--------|
| Default | bg accent, text white, border transparent | bg elevated, text text, border border | bg transparent, text secondary | bg danger, text white |
| Hover | bg accent-hover | bg subtle | bg subtle | bg danger-hover |
| Focus-visible | ring 2px focus-ring offset 2 | same | same | same |
| Active | slightly darker than hover | same | same | same |
| Disabled | opacity 50%, `cursor-not-allowed`, no hover | same | same | same |
| Loading | disabled + spinner icon left, label “Saving…” when save | — | — | — |

- Height: 40px (`h-10`), padding `px-4`, radius `md`, text-sm medium
- Icon+label gap: `space-2`

### 6.2 Input / Select / Textarea

| State | Appearance |
|-------|------------|
| Default | bg elevated, border border, text text, h-10, px-3, radius md |
| Hover | border border-strong |
| Focus | border accent, ring 2px focus-ring/30 |
| Error | border danger, ring danger/20; message `text-sm text-danger` below |
| Disabled | bg subtle, text muted, cursor-not-allowed |
| Placeholder | text-muted |

Labels: always visible above control; `htmlFor` / `id` pairing. Required fields: label text + optional `*` with `aria-hidden` and `aria-required` on control.

### 6.3 SearchBox

| State | Behavior / UI |
|-------|----------------|
| Default | Empty input, no dropdown |
| Focus | Ring; if query ≥1 and results loaded, show dropdown |
| Loading | Small spinner right inside input; `aria-busy="true"` |
| Results | Listbox with options; mouse + keyboard |
| Empty results | Single non-interactive row: “No results” |
| Error (network) | “Search failed. Try again.” in dropdown |
| Disabled | Not used in v1 |

### 6.4 Article list row

| State | UI |
|-------|-----|
| Default | Transparent bg, border-b |
| Hover | bg subtle |
| Focus-visible | ring inset or outline on link |
| Current (optional) | Not needed (no master-detail split view) |

### 6.5 StatusBadge

| State | UI |
|-------|-----|
| Draft | Amber pill, text “Draft” |
| Published | Only if explicitly rendered; emerald pill “Published” |
| No hover states required |

### 6.6 Filter chip / nav item

| State | UI |
|-------|-----|
| Default | text secondary, transparent bg |
| Hover | bg subtle |
| Selected | bg accent-muted, text accent (or accent-hover), font medium |
| Focus-visible | ring |

### 6.7 Editor toolbar button

| State | UI |
|-------|-----|
| Default | ghost icon button |
| Hover | bg subtle |
| Active / pressed | bg accent-muted, text accent |
| Disabled | opacity 40% (e.g. undo with empty history) |
| Focus-visible | ring |

### 6.8 Editor content area

| State | UI |
|-------|-----|
| Default | min-h-[280px], border, padding 16px, focus-within ring on container |
| Empty | Show placeholder text via TipTap Placeholder extension **if available**; else muted “Start writing…” absolutely positioned when doc empty |
| Error (validation) | Container border danger |
| Disabled | Not applicable during edit |

### 6.9 Pagination

| State | UI |
|-------|-----|
| Default | Ghost buttons Prev/Next + “Page N” text |
| Disabled edge | Disabled Prev on page 1; disabled Next on last page |
| Hidden | Hide entire control if `totalPages <= 1` |

### 6.10 Empty states (`EmptyState`)

Structure:

```
[Icon 40px muted]
Title (text-lg semibold)
Description (text-sm secondary, max-w-md center)
[Optional primary CTA]
```

| Context | Title | Description | CTA |
|---------|-------|-------------|-----|
| No articles | “No articles yet” | “Create the first article to start the team knowledge base.” | Create article |
| No filter matches | “No matching articles” | “Try another category, tag, or status.” | Clear filters |
| No search results | “No results for “{q}”” | “Try different keywords. Only published articles are searched.” | Clear search → `/` |
| Empty search query page | “Search the knowledge base” | “Enter a term to find articles by title or content.” | — |
| No categories | “No categories yet” | “Categories appear here once defined (seed or create).” | — |
| No tags on form | “No tags available” | “Tags will appear when configured.” | — |

### 6.11 Banners (form-level)

| Type | Style | Example |
|------|-------|---------|
| Error | bg danger-muted, border danger/30, text danger | Validation summary / conflict |
| Success | bg success-muted, border success/30, text success | Optional saved |
| Info | bg accent-muted, border accent/20, text secondary | Draft visibility note |

Include `role="alert"` for error banners.

### 6.12 Links

| State | UI |
|-------|-----|
| Default | accent, no underline in nav; underline in prose |
| Hover | accent-hover, underline |
| Focus-visible | ring |
| Visited | no special style (internal app) |

---

## 7. Accessibility

### 7.1 Landmarks and structure

```html
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header>...</header>
  <main id="main-content" tabindex="-1">...</main>
</body>
```

- Skip link: visually hidden until focus; solid elevated bg, accent text, padding.
- One `h1` per page.
- List filters in `<nav aria-label="Filters">`.
- Header search in `<form role="search">` or container `role="search"`.

### 7.2 Keyboard

| Surface | Keys |
|---------|------|
| Global | Tab order: skip → logo → search → new → main content |
| Search typeahead | Esc close; ArrowUp/Down; Enter select/submit |
| Form | Tab through fields; Save is type=submit; Enter in title submits only if browser default on form — acceptable |
| Editor | TipTap standard; Tab may enter/exit editor — ensure toolbar buttons are tabbable before editor |
| List | Rows are links — single tab stop per row |
| Delete confirm | Native confirm is keyboard accessible |

### 7.3 Focus order (create form)

1. Title  
2. theSlug  
3. Status radios  
4. Category  
5. Tag checkboxes (each)  
6. Toolbar controls  
7. Editor surface  
8. Save  
9. Cancel  
10. Delete (edit only, last)

### 7.4 Screen reader labeling

| Component | Guidance |
|-----------|----------|
| Search input | `aria-label="Search articles"` (visible label optional if placeholder alone — prefer visually hidden label) |
| Typeahead list | `role="listbox"`, options `role="option"`, `aria-selected` |
| Status badge | Text content sufficient; no extra live region |
| Status radios | `<fieldset><legend>Status</legend>` |
| Save loading | `aria-busy` on form or button; button text changes to “Saving…” |
| Conflict banner | `role="alert"` |
| Category/tag filters | Selected announced via `aria-current="page"` or `aria-pressed` on chips |
| Article body | Rendered as HTML in article; headings in content should not skip levels from TipTap constraints (h2/h3 only) |
| Delete | Button `aria-label="Delete article"` if icon-only; prefer visible text “Delete” |

### 7.5 Contrast and non-color cues

- Errors: red border **and** text message (not color alone)
- Required: text label, not only red asterisk color
- Draft badge: text label + color
- Links: color + underline on hover; in body underline optional always — use underline on hover at minimum; for AA, ensure link color differs from body by contrast and is underlined in prose

### 7.6 Reduced motion

- Respect `prefers-reduced-motion: reduce`: set transitions to `none`
- No parallax or animated skeletons

---

## 8. Copy deck (UI strings)

Use these exact strings unless localization is introduced later.

| Key | String |
|-----|--------|
| app.name | Knowledge Base |
| nav.new | New article |
| list.title | Articles |
| list.empty.title | No articles yet |
| list.empty.filters | No matching articles |
| search.placeholder | Search articles… |
| search.results | Results for “{q}” |
| search.empty | No results for “{q}” |
| search.failed | Search failed. Try again. |
| detail.back | All articles |
| detail.edit | Edit |
| detail.delete | Delete |
| detail.deleteConfirm | Delete “{title}”? This cannot be undone. |
| form.createTitle | Create article |
| form.editTitle | Edit article |
| form.title | Title |
| form.slug | Slug |
| form.slugHelp | URL: /articles/{slug} |
| form.status | Status |
| form.status.draft | Draft |
| form.status.published | Published |
| form.category | Category |
| form.category.none | No category |
| form.tags | Tags |
| form.content | Content |
| form.saveCreate | Save article |
| form.saveEdit | Save changes |
| form.saving | Saving… |
| form.cancel | Cancel |
| form.conflict | This article changed since you opened it. Reload to get the latest version. |
| form.reload | Reload |
| uncategorized | Uncategorized |
| filter.status | Status |
| filter.published | Published |
| filter.drafts | Drafts |
| filter.all | All |
| filter.categories | Categories |
| filter.tags | Tags |
| filter.clear | Clear filters |
| pagination.prev | Previous |
| pagination.next | Next |
| pagination.page | Page {n} |
| notFound.title | Article not found |
| error.title | Something went wrong |

Validation messages come from Zod (architecture); surface them as returned.

---

## 9. Handoff notes for developers

### 9.1 Component map → files

Align with architecture §4.3:

| Component | Notes |
|-----------|-------|
| `AppHeader` | Sticky; contains logo, `SearchBox`, New button |
| `AppShell` | Max-width + padding wrapper |
| `ArticleList` | Renders rows + empty + pagination |
| `ArticleListItem` | Single link row |
| `ArticleDetail` | Meta + prose + actions |
| `ArticleForm` | Shared create/edit; client component |
| `EmptyState` | Props: `icon`, `title`, `description`, `action?` |
| `StatusBadge` | `status: 'DRAFT' \| 'PUBLISHED'` |
| `SearchBox` | Client; debounce 250ms |
| `SearchResults` | Server-friendly result list |
| `RichTextEditor` + `EditorToolbar` | Dynamic import |
| `ui/*` | Button, Input, Label, Select, Badge, Textarea |

### 9.2 Suggested CSS variable / token names

Prefer:

```
--color-bg, --color-bg-elevated, --color-bg-subtle
--color-text, --color-text-secondary, --color-text-muted
--color-border, --color-accent, --color-accent-hover, --color-accent-muted
--color-danger, --color-success, --color-focus-ring
--radius-md, --space-*, --font-sans, --text-*
```

Utility examples: `bg-[var(--color-bg)]` or Tailwind theme keys `bg-background`, `text-foreground`, `bg-primary` if you alias:

| Semantic Tailwind-like name | Token |
|-----------------------------|-------|
| `background` | `--color-bg` |
| `foreground` | `--color-text` |
| `card` | `--color-bg-elevated` |
| `primary` | `--color-accent` |
| `muted` | `--color-text-muted` |
| `border` | `--color-border` |
| `destructive` | `--color-danger` |

### 9.3 Implementation constraints (do not invent)

1. **No auth chrome.**  
2. **No toast library required** — inline banners suffice.  
3. **No modal library** — `window.confirm` for delete; banners for errors.  
4. **URL is source of truth** for filters and search query.  
5. **Do not add infinite scroll** — pagination only.  
6. **Do not add dark mode** in v1.  
7. **Do not add command palette** in v1.  
8. Sanitize HTML before `dangerouslySetInnerHTML`.  
9. Typeahead searches **published only**.  
10. List default **published only**.

### 9.4 Annotations by flow (acceptance-style)

**Browse:** Home shows published articles; each row navigates to detail; filters update URL and results; empty states match §6.10.

**Search:** Typing shows dropdown ≤250ms after pause; Enter goes to `/search?q=`; marks highlight on full page; empty and error states defined.

**Edit:** Detail → Edit → change title → Save → detail shows new title; validation errors under fields; conflict shows alert + reload.

**Create:** New article → fill required → Save → lands on detail; slug auto from title until manual edit.

### 9.5 Visual QA checklist

- [ ] Header sticky; content not hidden under header  
- [ ] Focus rings visible on all interactive elements  
- [ ] Draft badge visible on draft detail  
- [ ] Mobile: filters stacked, targets ≥40px for primary actions  
- [ ] No horizontal scroll on `md` list view at 768px  
- [ ] Prose measure comfortable (~max-w-3xl)  
- [ ] Typeahead does not overflow viewport  
- [ ] Disabled pagination at ends  

---

## 10. Decisions log

| # | Tradeoff | Choice | Why |
|---|----------|--------|-----|
| 1 | Card grid vs compact list | **Compact list rows** | Information density + calm internal-tool aesthetic; faster scanning for answers |
| 2 | Markdown dual-pane vs WYSIWYG | **TipTap WYSIWYG** | Matches architecture; single surface; lower UI complexity than split preview |
| 3 | Show Published badge always vs Draft-only | **Draft badge only** | Reduces noise; published is the default mental model for readers |
| 4 | Separate admin app vs in-place edit | **In-place edit from detail** | Low friction for content owners; no second IA |
| 5 | Modal filters vs URL sidebar/selects | **URL-driven filters** | Shareable, back-button friendly, SSR-simple |
| 6 | Toast system vs inline banners | **Inline banners + redirects** | Fewer dependencies; enough feedback for v1 |
| 7 | Soft delete vs hard delete + confirm | **Hard delete + confirm** | Simpler data model; internal tool scale |
| 8 | Autosave vs explicit save | **Explicit save** | Avoids surprise drafts and concurrency complexity |
| 9 | Accent indigo vs sky | **Sky** | Calm, high-contrast on white, distinct from error red and draft amber |
| 10 | Dark mode | **None in v1** | Scope control; system light palette is sufficient |
| 11 | Unsaved changes guard | **None in v1** | Faster ship; Cancel explicitly abandons |
| 12 | Categories admin UI | **None; seed + select** | Brief prioritization; architecture alignment |
| 13 | Typeahead includes drafts | **No** | Search is for finding answers; drafts would pollute |
| 14 | Motion / illustrations | **Minimal / none** | Brief: avoid excessive motion and marketing visuals |
| 15 | Phone-first nav (tab bar) | **No; responsive stack only** | Brief targets desktop/tablet |

---

## 11. Out of scope (design)

- Authentication / user menu  
- Real-time collaborative cursors  
- Comments, reactions, version history UI  
- Image upload / media library  
- Dark mode  
- Internationalization  
- Full accessibility audit tooling (baseline in §7 only)  
- Marketing landing page  
- Drag-and-drop category management  

---

*End of UX / Design Direction Spec.*
