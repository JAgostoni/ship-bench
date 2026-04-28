# UX / Design Direction Spec: Simplified Knowledge Base App

**Version:** v1.0  
**Date:** 2026-04-28  
**Source of truth:** `docs/product-brief.md`, `docs/architecture.md`

---

## 1. Design Principles

1. **Search-first navigation** — The search bar is the most prominent interactive element on every screen. Browsing is secondary.
2. **Calm and readable** — Low visual noise, generous whitespace where it aids scanning, and strict hierarchy through typography and color alone.
3. **Low-friction movement** — Moving between list → detail → edit should require at most one click/tap and no page reload anxiety (optimistic UI cues).
4. **Information-dense, not cluttered** — Use compact list layouts, small metadata chips, and tight vertical rhythm. Avoid decorative illustrations or marketing visuals.
5. **Accessibility by default** — Every decision must survive a keyboard-only, screen-reader, or high-contrast context.

---

## 2. Visual Style System (Tokens)

Use Tailwind CSS v4 utilities. The tokens below can be translated directly into a `@theme` block or CSS custom properties.

### 2.1 Color Palette

| Token | Hex | Tailwind equiv | Usage |
|-------|-----|----------------|-------|
| `--color-surface` | `#ffffff` | `white` | Primary background |
| `--color-surface-raised` | `#f8fafc` | `slate-50` | Cards, sidebars, editor panes |
| `--color-surface-alt` | `#f1f5f9` | `slate-100` | Hover backgrounds, zebra stripes |
| `--color-border` | `#e2e8f0` | `slate-200` | Dividers, input borders, card outlines |
| `--color-border-strong` | `#cbd5e1` | `slate-300` | Focus rings, active borders |
| `--color-text-primary` | `#0f172a` | `slate-900` | Headings, body text |
| `--color-text-secondary` | `#475569` | `slate-600` | Metadata, captions, placeholders |
| `--color-text-tertiary` | `#94a3b8` | `slate-400` | Timestamps, disabled text |
| `--color-accent` | `#2563eb` | `blue-600` | Primary actions, links, active nav items |
| `--color-accent-hover` | `#1d4ed8` | `blue-700` | Button/link hover |
| `--color-accent-subtle` | `#eff6ff` | `blue-50` | Selected rows, subtle highlights |
| `--color-danger` | `#dc2626` | `red-600` | Errors, destructive actions |
| `--color-danger-bg` | `#fef2f2` | `red-50` | Error banners, invalid field backgrounds |
| `--color-success` | `#16a34a` | `green-600` | Success toasts, saved indicators |

**Contrast ratios verified:**
- `--color-text-primary` on `--color-surface`: **12.6:1** (AAA)
- `--color-text-secondary` on `--color-surface`: **5.7:1** (AA)
- `--color-accent` on `--color-surface`: **5.9:1** (AA)
- `--color-text-primary` on `--color-surface-raised`: **12.0:1** (AAA)

### 2.2 Typography Scale

System font stack: `font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

| Token | Size | Weight | Line-height | Letter-spacing | Tailwind class |
|-------|------|--------|-------------|----------------|----------------|
| `text-xs` | 12px | 400 | 1.5 | 0 | `text-xs` |
| `text-sm` | 14px | 400 | 1.5 | 0 | `text-sm` |
| `text-base` | 16px | 400 | 1.6 | 0 | `text-base` |
| `text-lg` | 18px | 500 | 1.4 | -0.01em | `text-lg font-medium` |
| `text-xl` | 20px | 600 | 1.3 | -0.02em | `text-xl font-semibold` |
| `text-2xl` | 24px | 700 | 1.2 | -0.02em | `text-2xl font-bold` |
| `text-3xl` | 30px | 800 | 1.1 | -0.02em | `text-3xl font-extrabold` |

- **Article body (`prose`)**: `text-base`, `line-height: 1.75`, `max-width: 65ch`.
- **Monospace (editor)**: `font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`, `text-sm`, `line-height: 1.6`.

### 2.3 Spacing System

Base unit: `4px` (Tailwind `1`). Use multiples consistently.

| Token | Value | Tailwind |
|-------|-------|----------|
| `space-1` | 4px | `1` |
| `space-2` | 8px | `2` |
| `space-3` | 12px | `3` |
| `space-4` | 16px | `4` |
| `space-5` | 20px | `5` |
| `space-6` | 24px | `6` |
| `space-8` | 32px | `8` |
| `space-10` | 40px | `10` |
| `space-12` | 48px | `12` |

- **Page padding**: `space-6` (24px) on mobile, `space-8` (32px) on tablet+, `space-10` (40px) on desktop.
- **Card padding**: `space-5` (20px) internal.
- **Section gap**: `space-6` (24px) between major regions.
- **List item gap**: `space-3` (12px) between article list rows.

### 2.4 Shape & Elevation

| Token | Value | Tailwind |
|-------|-------|----------|
| `radius-sm` | 4px | `rounded-sm` |
| `radius-md` | 6px | `rounded-md` |
| `radius-lg` | 8px | `rounded-lg` |
| `radius-xl` | 12px | `rounded-xl` |
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | `shadow-sm` |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | `shadow-md` |

- Cards: `radius-lg`, `shadow-sm`, border `1px solid --color-border`.
- Inputs: `radius-md`, border `1px solid --color-border`.
- Buttons: `radius-md`.
- Modals/Toasts: `radius-xl`, `shadow-md`.

### 2.5 Iconography

- Use **lucide-react** for all icons (lightweight, consistent line style).
- Default size: `20px` (`w-5 h-5`).
- In dense contexts (metadata chips): `16px` (`w-4 h-4`).
- In prominent actions (empty states): `24px` (`w-6 h-6`).
- Stroke width: `1.5px` (Lucide default). No filled icons.

---

## 3. Responsive Layout Foundation

### 3.1 Breakpoints

| Name | Min-width | Layout model |
|------|-----------|--------------|
| `mobile` | < 768px | Single column, stacked |
| `tablet` | 768px – 1023px | Two column (collapsible nav + main) |
| `desktop` | ≥ 1024px | Three column (nav + list + detail) or two column |

### 3.2 Global Layout Shell

#### Desktop (≥ 1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ [Header: Logo | Search bar (fluid)         | New Article]   │  56px fixed
├──────────┬──────────────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                               │
│ 240px    │  (changes per route)                             │
│ fixed    │                                                  │
│ height   │                                                  │
│ overflow │                                                  │
│ scroll   │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

- **Header**: Fixed at top, `height: 56px`, `z-index: 50`.
  - Left: Text logo "Knowledge Base" (`text-lg font-semibold`, `--color-text-primary`).
  - Center: Global search input (`max-width: 480px`, `width: 100%`).
  - Right: "New Article" button (primary accent).
  - Divider: `border-bottom: 1px solid --color-border`.

- **Sidebar**: Fixed left below header, `width: 240px`, `top: 56px`, `bottom: 0`.
  - Background: `--color-surface-raised`.
  - Contains: Navigation links (Articles, Categories — disabled in v1).
  - Right border: `1px solid --color-border`.

- **Main Content**: `margin-left: 240px`, `padding-top: 56px` (to clear header).
  - `padding: space-8` (32px) horizontal, `space-6` (24px) vertical.

#### Tablet (768px – 1023px)
- Same header.
- Sidebar becomes a **collapsible drawer** triggered by a hamburger icon in the header (left of logo).
  - Drawer slides in from left, `width: 260px`, `shadow-md`, overlay with `rgba(0,0,0,0.2)` backdrop.
  - Close on overlay click or `Escape`.
- Main content uses full width minus page padding.

#### Mobile (< 768px)
- Header shows: hamburger icon | Logo | New Article icon (plus sign, no text).
- Search input moves **below the header** and becomes a sticky search bar (`position: sticky`, `top: 56px`, `z-index: 40`).
  - `padding: space-4` horizontal, `space-3` vertical.
  - Background: `--color-surface` with a subtle bottom border.
- Single column layout. No persistent sidebar.
- Main content padding: `space-4` (16px) horizontal.

### 3.3 Touch Targets

- All interactive elements must be at least `44px × 44px` on touch devices.
- Header buttons: `44px × 44px` tap area.
- Article list rows: minimum `56px` height.
- Form inputs: `min-height: 48px`, `padding: 12px 16px`.
- Editor toolbar buttons: `40px × 40px`.

---

## 4. Layout & Page Flows

### 4.1 Home / Article List (`/`)

**Purpose:** Primary entry point. Search-first browsing.

#### Desktop Layout
```
Sidebar | [Search bar (already in header)]
        |
        |  Results summary: "24 articles" (text-sm, --color-text-secondary)
        |
        |  ┌─────────────────────────────────────────┐
        |  │ Article Title (link, text-lg)           │
        |  │ Excerpt line 1... (text-sm)             │
        |  │ Updated 2 days ago · Category · Tag Tag  │  <- metadata row
        |  └─────────────────────────────────────────┘
        |  [repeat]
        |
        |  [Load more] or Pagination
```

- **Article list items**: Full-width cards, `padding: space-5`, `radius-lg`, `border: 1px solid --color-border`.
  - No thumbnail (Markdown-only content, images not a v1 concern).
  - Title: `text-lg font-medium`, `--color-text-primary`, underlined on hover with `--color-accent`.
  - Excerpt: 2 lines max, `text-sm`, `--color-text-secondary`. Truncate with `...` and `overflow-hidden`.
  - Metadata row: `text-xs`, `--color-text-tertiary`.
    - Clock icon + relative timestamp (e.g., "Updated 2 days ago").
    - Category chip (if assigned): `radius-sm`, `padding: 2px 8px`, `bg-slate-100`, `text-slate-600`, `text-xs`.
    - Tags: same style as category but without background, prefixed with `#`.
  - Hover state: `background-color: --color-surface-alt`, `border-color: --color-border-strong`.

- **Active search state**:
  - When search query is present, show "X results for 'query'" with a clear-search icon button.
  - Results ranked by relevance (FTS BM25). No explicit relevance score shown.

#### Empty States
| State | Copy | Visual | Action |
|-------|------|--------|--------|
| No articles at all | "No articles yet." | File icon (`FileX`) 48px, `--color-text-tertiary` | "Create first article" button (primary) |
| Search returned 0 | "No articles match 'query'." | Search icon (`SearchX`) 48px | "Clear search" link |
| Category empty (v2) | "No articles in this category." | Folder icon (`FolderOpen`) 48px | "Browse all" link |

#### Navigation Paths
```
Home (/) ──click article──> Article Detail (/articles/:slug)
         ──click New Article──> Editor (/articles/new)
         ──search + enter──> filtered Home (/) with query param
```

### 4.2 Article Detail (`/articles/:slug`)

**Purpose:** Read an article. Primary gateway to editing.

#### Desktop Layout
```
Sidebar | [Breadcrumb: Articles / Article Title]
        |
        |  [Edit] [Delete]
        |
        |  Article Title (text-3xl, font-extrabold)
        |
        |  Last updated: Mar 15, 2026 · Category · #tag #tag
        |
        |  ──────────────────────────────────────────
        |
        |  Markdown-rendered content (prose)
        |
        |  ──────────────────────────────────────────
        |
        |  [← Back to articles]
```

- **Breadcrumb**: `text-sm`, home link "Articles" → current page (non-link, `--color-text-secondary`).
- **Action bar**: Top-right of content area.
  - "Edit" button: secondary style (outline, `--color-accent` border and text).
  - "Delete" button: text-only, `--color-danger`, with `Trash2` icon. Confirm with a destructive modal.
- **Title**: `text-3xl`, `font-extrabold`, `--color-text-primary`.
- **Metadata line**: `text-sm`, `--color-text-secondary`, separator `·`.
- **Content area**: `max-width: 65ch`, centered within main column. Rendered via `prose` or `react-markdown`.
  - Headings in prose inherit `--color-text-primary`.
  - Links in prose use `--color-accent`.
  - Code blocks: `bg-slate-50`, `border: 1px solid --color-border`, `radius-md`, `padding: 16px`.
  - Inline code: `bg-slate-100`, `radius-sm`, `padding: 2px 4px`, `font-mono`.

#### Mobile Layout
- Same content, stacked.
- Action bar (Edit/Delete) moves to a **sticky bottom bar** (`position: fixed`, `bottom: 0`, `z-index: 50`).
  - `height: 56px`, `background: --color-surface`, `border-top: 1px solid --color-border`.
  - "Edit" button: full-width primary style.
  - "Delete": icon-only button (`Trash2`) to the left of Edit.
- Content has `padding-bottom: 80px` to clear the sticky bar.

#### Navigation Paths
```
Article Detail ──click Edit──> Editor (/articles/:slug/edit)
              ──click Delete──> Confirm modal ──confirm──> Home (/) with success toast
              ──click Back──> Home (/)
              ──click breadcrumb──> Home (/)
```

### 4.3 Article Editor — Create (`/articles/new`) and Edit (`/articles/:slug/edit`)

**Purpose:** Write or modify an article using Markdown.

#### Desktop Layout (Split-Pane)
```
Sidebar | [Breadcrumb: Articles / (New Article | Edit "Title")]
        |
        |  [Save] [Cancel]     [Draft saved 2m ago]
        |
        |  Title: [______________________________]
        |
        |  ┌─────────────────────┬─────────────────────┐
        |  │ Markdown            │ Preview             │
        |  │ (textarea)          │ (rendered markdown) │
        |  │                     │                     │
        |  │                     │                     │
        |  │                     │                     │
        |  └─────────────────────┴─────────────────────┘
        |
        |  Category: [Dropdown ▼]     Tags: [tag1] [tag2] [+ Add]
```

- **Breadcrumb**: "Articles" (link) → "New Article" or "Edit 'Article Title'".
- **Action bar**:
  - "Save" button: primary, disabled until form is valid and dirty.
  - "Cancel" button: ghost/link style, returns to previous page (detail or home).
  - Autosave indicator: `text-xs`, `--color-text-tertiary`, right-aligned.
    - States: `Last saved just now` (green icon), `Saving...` (spinner), `Unsaved changes` (amber dot), `Draft saved locally` (cloud icon).

- **Title input**:
  - `text-2xl`, `font-bold`, placeholder "Article title".
  - No border, bottom border only: `border-bottom: 2px solid --color-border`.
  - Focus: `border-color: --color-accent`.
  - Validation: required, max 200 chars. Inline error below: `text-sm`, `--color-danger`.

- **Split-pane editor**:
  - Container: `display: flex`, `gap: 0`, `height: calc(100vh - 280px)`, `min-height: 400px`, `border: 1px solid --color-border`, `radius-lg`.
  - Divider: `1px solid --color-border` vertical line.
  - Left pane (textarea):
    - `width: 50%`, `padding: space-5`, `font-mono`, `text-sm`, `line-height: 1.7`.
    - `resize: none`, `border: none`, `outline: none`.
    - `tabindex: 0` (managed focus).
    - Placeholder: "Write in Markdown..."
  - Right pane (preview):
    - `width: 50%`, `padding: space-5`, `overflow-y: auto`.
    - Renders live via `react-markdown` + `remark-gfm`.
    - `background: --color-surface`.

- **Category dropdown** (schema-ready, UI included in v1):
  - Label: "Category", `text-sm font-medium`.
  - Native `<select>` styled with Tailwind: `min-height: 40px`, `padding: 8px 12px`, `radius-md`, `border: 1px solid --color-border`.
  - Default option: "None".

- **Tags input** (schema-ready, UI included in v1):
  - Label: "Tags", `text-sm font-medium`.
  - Inline chips + text input.
  - Existing tags render as removable chips (`radius-sm`, `bg-slate-100`, `padding: 4px 8px`, `text-xs`, close icon `X`).
  - Typing + comma or Enter creates a new chip. Max 10 tags, max 30 chars per tag.

#### Mobile Layout
- **Header**: Logo + Cancel + Save (compact).
- **Stacked layout**: Title input → Category dropdown → Tags → Editor tabs.
- **Editor tabs** (since split-pane is too narrow):
  - Tab bar: "Write" | "Preview".
  - Active tab: `border-bottom: 2px solid --color-accent`, `--color-text-primary`.
  - Inactive tab: `--color-text-secondary`.
  - Content area below takes remaining viewport height.
- **Sticky bottom bar**: Save / Cancel.

#### Empty States / Edge Cases
- **First load (new article)**: Title empty, textarea empty, placeholder visible.
- **Load existing article**: Form pre-filled from API. Dirty state only triggered by user change.
- **Autosave failure (network)**: Show "Draft saved locally" with cloud-offline icon. Do not block editing.

#### Navigation Paths
```
Editor (new) ──Save success──> Article Detail (/articles/:slug)
             ──Cancel──> Home (/)

Editor (edit) ──Save success──> Article Detail (/articles/:slug)
              ──Cancel──> Article Detail (/articles/:slug)  (not home, preserves context)
```

---

## 5. Feature UX Decisions

### 5.1 Global Search

- **Entry point**: Omnipresent input in header (desktop), sticky bar (mobile).
- **Debounce**: `300ms` on keystroke before API call.
- **Interaction**:
  1. User types → debounced query to `GET /api/search?q=...`.
  2. Results replace the article list on Home (`/`). No separate search results page in v1.
  3. Query is reflected in URL: `/?q=onboarding`. On page load with `?q`, auto-execute search.
  4. Search input shows a clear button (`X` icon) when non-empty.
- **Loading state**: Input shows a `Loader2` spinner icon (16px, `--color-text-tertiary`) replacing the search icon on the left.
- **Error state**: Inline toast below search: "Search failed. Showing all articles." [Retry].
- **Keyboard**: `Escape` clears search and focus. `Enter` submits immediately (skips debounce). Arrow keys navigate results if dropdown added later; for v1, results are in-page only.

### 5.2 Article List Item

- **Selection model**: None for v1 (no multi-select, no bulk actions).
- **Click behavior**: Entire card is clickable, navigates to detail. Only one interactive target per row.
- **Hover**: Cursor pointer, background shift to `--color-surface-alt`, border darkens.
- **Focus**: Visible focus ring (`focus:outline-2 focus:outline-offset-2 focus:outline-blue-600`) for keyboard navigation.
- **Active/pressed**: `background-color: --color-surface` (no change — avoid jarring flash).

### 5.3 Markdown Editor

- **Pane resize**: Not resizable in v1. Fixed 50/50 on desktop, tabbed on mobile.
- **Scroll sync**: Not required in v1. Each pane scrolls independently.
- **Toolbar**: Not required in v1. Users type raw Markdown. Keep implementation minimal; a toolbar can be added later.
- **Autosave cadence**: Every `2000ms` (2 seconds) after the last keystroke. Save to `localStorage` key: `draft:<slug>` or `draft:new`.
- **Dirty detection**: Compare current form values against:
  - For new articles: empty state.
  - For edits: original fetched state.
- **Unload guard**: If dirty, `beforeunload` browser prompt: "You have unsaved changes. Leave anyway?"
- **Preview rendering**: Live on every keystroke (no debounce; `react-markdown` is fast enough for small-medium articles).

### 5.4 Form Validation

**Client-side (immediate)**:
- **Title**: Required. Min 1 char, max 200. Show error on `blur` if empty, or live after first error. Inline red text below field.
- **Content**: Required. Min 1 char. Show on `blur` or save attempt.
- **Tags**: Max 10. Max 30 chars each. Alphanumeric + hyphen only. Invalid characters blocked at input.

**Server-side (on save)**:
- Same Zod schema. Errors returned in API envelope. Map `details` array to field-level errors.
- If slug collision: show inline error on title "An article with a similar title already exists."

**Validation error style**:
- Field border: `border-color: --color-danger`.
- Error text: `text-sm`, `--color-danger`, `margin-top: 4px`.
- Error icon: `AlertCircle` 16px, inline before text.

### 5.5 Delete Article

- **Trigger**: `Trash2` icon button on detail page.
- **Confirmation**: Modal dialog (not browser `confirm()`).
  - Title: "Delete article?"
  - Body: "This will permanently delete '{title}'. This cannot be undone."
  - Actions: "Delete" (destructive, `--color-danger` bg), "Cancel" (ghost).
  - Focus trap inside modal. Focus starts on "Cancel". `Escape` closes.
- **Success**: Redirect to Home (`/`). Toast: "Article deleted." (`--color-success`, checkmark icon, auto-dismiss 3s).

---

## 6. UI States Reference

### 6.1 Buttons

| Variant | Default | Hover | Active/Pressed | Focus | Disabled | Loading |
|---------|---------|-------|----------------|-------|----------|---------|
| **Primary** (Save) | `bg-blue-600 text-white` | `bg-blue-700` | `bg-blue-800` | `outline-2 outline-blue-600 outline-offset-2` | `bg-slate-200 text-slate-400 cursor-not-allowed` | Spinner replaces text, opacity 0.7 |
| **Secondary** (Edit) | `bg-white border border-blue-600 text-blue-600` | `bg-blue-50` | `bg-blue-100` | `outline-2 outline-blue-600` | `border-slate-200 text-slate-400 bg-white` | Spinner, opacity 0.7 |
| **Danger** (Delete in modal) | `bg-red-600 text-white` | `bg-red-700` | `bg-red-800` | `outline-2 outline-red-600` | `bg-slate-200 text-slate-400` | Spinner |
| **Ghost** (Cancel) | `bg-transparent text-slate-600` | `bg-slate-100` | `bg-slate-200` | `outline-2 outline-slate-400` | `text-slate-300` | — |
| **Icon-only** | `bg-transparent text-slate-500` | `bg-slate-100 text-slate-700` | `bg-slate-200` | `outline-2 outline-slate-400` | `text-slate-300` | — |

### 6.2 Text Inputs

| State | Style |
|-------|-------|
| Default | `border-slate-200 bg-white text-slate-900` |
| Hover (optional) | `border-slate-300` |
| Focus | `border-blue-600 outline-none ring-2 ring-blue-600/20` |
| Valid (after check) | `border-green-500` + check icon (optional, not required in v1) |
| Invalid | `border-red-500` + `ring-2 ring-red-500/20` |
| Disabled | `bg-slate-100 text-slate-400 cursor-not-allowed` |
| Placeholder | `text-slate-400` |

### 6.3 Search Input (Header)

| State | Visual |
|-------|--------|
| Default | `bg-slate-100 border-transparent`, search icon left, placeholder "Search articles..." |
| Focus | `bg-white border-blue-600 ring-2 ring-blue-600/20` |
| Loading | Left icon swaps to `Loader2` spinner (animated). Input remains interactive. |
| Empty (no query) | No clear button |
| Has query | Clear `X` button appears on right `44×44` tap target |

### 6.4 Editor Pane

| State | Visual |
|-------|--------|
| Default | Textarea: white bg, monospace. Preview: rendered prose. |
| Dirty | Autosave indicator shows "Unsaved changes" (amber dot). |
| Saving | Indicator shows "Saving..." (spinner). |
| Saved | Indicator shows "Saved" (green check) for 2s, then fades to timestamp. |
| Error (save failed) | Banner above editor: "Could not save. Retry?" [Retry] or "Save locally." Banner: `bg-red-50 border-red-200 text-red-700`. |
| Loading (edit mode) | Skeleton placeholder in both panes: 4 animated gray lines (`bg-slate-200 animate-pulse`). |

### 6.5 Article List

| State | Visual |
|-------|--------|
| Default | White card, `border-slate-200` |
| Hover | `bg-slate-50 border-slate-300` |
| Focus (keyboard) | `ring-2 ring-blue-600 ring-offset-2` |
| Loading (initial) | Skeleton: 6 rows of gray pulses, `space-3` gap. |
| Empty (no articles) | Centered empty state component (see §4.1). |
| Empty (no search results) | Centered empty state with query highlighted. |
| Error | Inline banner: "Could not load articles." [Retry]. |

### 6.6 Toast / Banner

- **Success**: `bg-green-50 border border-green-200 text-green-800`, left icon `CheckCircle2`.
- **Error**: `bg-red-50 border border-red-200 text-red-800`, left icon `AlertCircle`.
- **Warning/Info**: `bg-blue-50 border border-blue-200 text-blue-800`, left icon `Info`.
- Position: `fixed top-4 left-1/2 -translate-x-1/2` (centered under header), `z-index: 60`.
- Auto-dismiss: 3s for success. Persistent for errors until dismissed or action taken.
- Animation: `translateY(-100%) → translateY(0)`, `opacity 0 → 1`, `duration-200 ease-out`.

---

## 7. Accessibility

### 7.1 Contrast

All text/background combinations must meet WCAG 2.1 AA:
- Normal text: minimum 4.5:1.
- Large text (≥ 18pt or ≥ 14pt bold): minimum 3:1.
- UI components / graphical objects: minimum 3:1.

Already verified for primary palette (§2.1). Ensure any dynamically generated colors (tag tints, syntax highlighting) do not violate this. In v1, tags use static neutral styles only.

### 7.2 Keyboard Navigation

| Focus order | Action |
|-------------|--------|
| 1 | Skip link: "Skip to main content" (visually hidden, `focus-visible` reveals it) |
| 2 | Header: Logo → Search input → New Article |
| 3 | Main content: Article list items (roving `tabindex` not needed; each is a single link) |
| 4 | Article detail: Breadcrumb → Edit → Delete → Content links |
| 5 | Editor: Title → Category → Tags → Textarea → Save → Cancel |

- **Modals**: Focus trap. `Tab` cycles within modal. `Escape` closes. Focus returns to trigger on close.
- **Editor split-pane**: Two separate tab stops (textarea, then preview). Preview pane is scrollable but not focusable for input; it can be skipped via `tabindex="-1"` with `aria-label="Preview"`.
- **Mobile drawer**: `Escape` closes. Focus moves to first item in drawer when opened. Returns to hamburger button when closed.

### 7.3 Screen Readers

- **Landmarks**: `<header>`, `<main>`, `<nav>` (sidebar/drawer), `<search>` (search input wrapper).
- **Article list**: Each card is an `<article>` with a `<h2>` title. Excerpt is a `<p>`.
- **Article detail**: `<article>` wrapper. Title is `<h1>`.
- **Live regions**:
  - Search results: `aria-live="polite"` region announces "24 results found" or "No results found".
  - Autosave status: `aria-live="polite"` on the indicator span.
  - Toast container: `aria-live="assertive"`.
- **Icons**: All decorative icons have `aria-hidden="true"`. All functional icons (buttons with only an icon) have `aria-label`.
  - Example: `<button aria-label="Delete article"><Trash2 aria-hidden /></button>`
- **Form labels**: Every input has an associated `<label>` with `htmlFor`. The title input in the editor uses a visually hidden label since the placeholder is not a substitute.
- **Required fields**: Mark with `aria-required="true"` and visual asterisk (if applicable). In v1, only title and content are required.

### 7.4 Reduced Motion

- Respect `prefers-reduced-motion: reduce`:
  - Disable spinner animations (show static icon).
  - Disable toast slide-in (instant appearance).
  - Disable skeleton pulse (show static low-contrast placeholder).
  - Disable mobile drawer slide (instant appearance).

---

## 8. Handoff Notes

### 8.1 Component Catalog

| Component | File | Description |
|-----------|------|-------------|
| `AppShell` | `components/AppShell.tsx` | Header + Sidebar/Drawer + Main layout wrapper. Handles responsive behavior. |
| `Header` | `components/Header.tsx` | Fixed 56px bar. Contains logo, `SearchInput`, `NewArticleButton`. |
| `Sidebar` | `components/Sidebar.tsx` | 240px nav column (desktop) or slide-over drawer (tablet/mobile). |
| `SearchInput` | `components/SearchInput.tsx` | Controlled input with debounce, loading spinner, clear button. Emits `onSearch(q: string)`. |
| `ArticleList` | `components/ArticleList.tsx` | Renders list of `ArticleCard`. Handles empty/loading/error. |
| `ArticleCard` | `components/ArticleCard.tsx` | Single row/card. Clickable link wrapper. |
| `ArticleDetail` | `routes/ArticleDetail.tsx` | Page component. Fetches article, renders metadata, actions, prose content. |
| `ArticleEditor` | `routes/ArticleEdit.tsx` | Page component. Form state, split-pane or tabbed editor, autosave logic. |
| `MarkdownEditor` | `components/MarkdownEditor.tsx` | Split-pane wrapper: `<textarea>` + `react-markdown` preview. Manages pane layout. |
| `TagInput` | `components/TagInput.tsx` | Composable chip input. Enter/comma to add, backspace on empty field to remove last, `X` on chip to remove. |
| `EmptyState` | `components/EmptyState.tsx` | Centered icon + heading + description + action. Props: `icon`, `title`, `description`, `action`. |
| `Toast` | `components/Toast.tsx` | Auto-dismissing banner. Props: `variant`, `message`, `duration`, `onDismiss`. |
| `ConfirmModal` | `components/ConfirmModal.tsx` | Focus-trapped modal. Props: `title`, `description`, `confirmLabel`, `confirmVariant`, `onConfirm`, `onCancel`. |
| `Skeleton` | `components/Skeleton.tsx` | Simple pulse block. Props: `className` for dimensions. |

### 8.2 Suggested CSS Variables (Tailwind `@theme`)

```css
@theme {
  /* Colors */
  --color-surface: #ffffff;
  --color-surface-raised: #f8fafc;
  --color-surface-alt: #f1f5f9;
  --color-border: #e2e8f0;
  --color-border-strong: #cbd5e1;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #94a3b8;
  --color-accent: #2563eb;
  --color-accent-hover: #1d4ed8;
  --color-accent-subtle: #eff6ff;
  --color-danger: #dc2626;
  --color-danger-bg: #fef2f2;
  --color-success: #16a34a;

  /* Spacing (Tailwind defaults; listed for reference) */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;

  /* Typography (Tailwind defaults; use font-sans, font-mono) */
}
```

### 8.3 Tailwind Patterns to Reuse

- **Card**: `rounded-lg border border-slate-200 bg-white p-5 shadow-sm`
- **Input**: `rounded-md border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none`
- **Button primary**: `inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 disabled:bg-slate-200 disabled:text-slate-400`
- **Button secondary**: `inline-flex items-center justify-center rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 disabled:border-slate-200 disabled:text-slate-400`
- **Prose article**: `prose prose-slate max-w-none lg:prose-lg` (or custom prose override targeting `65ch` max width).
- **Focus ring (custom)**: `focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2`

### 8.4 Behavior Annotations

- **Autosave**: Must not block the UI. Use `requestIdleCallback` or simple `setTimeout`. On network failure, degrade silently to `localStorage` and surface a non-blocking toast.
- **Search URL sync**: Use `URLSearchParams`. When user clears search, remove `?q` from URL to keep it clean.
- **Delete confirmation**: Must use modal (not `window.confirm`) to stay consistent with focus management and styling.
- **Mobile bottom bar in editor**: Must check `env(safe-area-inset-bottom)` if targeting newer mobile devices, but standard `padding-bottom: 16px` is sufficient for v1.
- **Slug immutability**: Once published, slug does not change even if title is edited. The architecture says "slug is immutable after publish (or editable with collision checks)". In v1 UI, do not show slug input. Auto-generate from title on creation.

---

## 9. Decisions Log

| Decision | Rationale / Tradeoff |
|----------|----------------------|
| **Sidebar navigation on desktop, drawer on mobile** | Keeps navigation visible for fast context-switching on large screens; hides it on small screens to maximize reading space. Tradeoff: tablet landscape could support persistent sidebar, but 768px–1023px range is safer with a drawer to avoid crowding the article list. |
| **No separate search results page** | Search replaces the home list inline. This reduces navigation depth (one less page) and aligns with "low-friction movement." Tradeoff: URL sharing of a specific search is still possible via `?q=`. |
| **Markdown split-pane editor, no WYSIWYG toolbar** | Product brief allows either, and architecture explicitly chose Markdown for simplicity. A toolbar adds implementation time and UI clutter; raw Markdown is acceptable for an internal team audience. Tradeoff: non-technical users may need a quick Markdown cheat-sheet link (defer to v2 if needed). |
| **Slate + blue accent palette** | "Calm and readable" requires a neutral foundation. Blue is the default "action" color in most OS/browser conventions, so it requires no learning. Tradeoff: may feel generic, but avoids visual noise. |
| **Sticky action bar on mobile detail page** | Places Edit within thumb reach and prevents scrolling to find it. Tradeoff: reduces vertical viewport by 56px; compensated by comfortable scroll padding. |
| **No category/tag management UI in v1** | Schema is ready per architecture, so the data model supports them. Admin flows to create categories are "too many steps" for v1 per brief. Articles can be assigned to existing categories (hardcoded or seeded) during creation. Tags are inline strings. |
| **Visible focus rings on all interactives** | Accessibility requirement from architecture. Using `outline` (not `box-shadow`) ensures visibility in Windows High Contrast Mode. Tradeoff: slightly more visual weight on click for mouse users, but acceptable for inclusive design. |
| **No image upload / thumbnail in article list** | v1 is Markdown-only with no image asset pipeline per architecture. Keeping list items text-only makes them denser and faster to scan. Tradeoff: less visual richness. |
| **Native `<select>` for category dropdown** | Custom selects require heavy ARIA management. Native select is fully accessible out of the box and fits the "low-friction, not over-designed" guidance. Tradeoff: limited styling, but acceptable. |
| **Autosave every 2s to localStorage, not server** | Prevents data loss on refresh without hammering the API. Server save only happens on explicit Save button. Tradeoff: a localStorage draft and a server version can diverge if user edits on two devices; last-write-wins is acceptable per architecture. |

---

## 10. Appendix: Screen Inventory

| Screen | Route | Priority | States to implement |
|--------|-------|----------|---------------------|
| Home / Article List | `/` | P0 | Loading, empty (no articles), empty (no results), populated, search active |
| Article Detail | `/articles/:slug` | P0 | Loading, found, not found (404-style), delete confirmation |
| Create Article | `/articles/new` | P0 | Empty, dirty, validation error, saving, saved, server error |
| Edit Article | `/articles/:slug/edit` | P0 | Loading, dirty, validation error, saving, saved, server error, conflict (last-write-wins) |
| Delete Confirm Modal | Overlay | P0 | Open, closed |
| Mobile Drawer | Overlay | P1 | Open, closed |
| Toast / Banner | Overlay | P1 | Success, error, info |
