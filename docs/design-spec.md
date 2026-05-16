# UX/Design Direction Spec — Internal Knowledge Base App

> Generated: 2026-05-16  
> Based on: `docs/product-brief.md`, `docs/architecture.md`

---

## 1. Design Principles

The brief specifies: **calm, readable, information-dense without being cluttered. Strong hierarchy, search-first navigation, low-friction movement between list and detail.**

These four rules govern every decision in this spec:

1. **Search is the primary navigation.** The search bar is the first interactive element in every list view, not a secondary affordance.
2. **List → detail → edit must be one click each.** No intermediate confirmation pages, no extra steps.
3. **Density over decoration.** No hero images, no illustration, no gradient backgrounds. Space is used to separate information, not to decorate.
4. **Status is surfaced, not hidden.** Draft status, empty states, loading states, and errors are always visible inline — never silently failing.

---

## 2. Layout and Page Flows

### 2.1 Application Shell

The shell is a two-column layout on desktop/tablet and single-column on mobile. It renders as a persistent `<Nav>` sidebar plus a `<main>` content area.

```
┌──────────────────────────────────────────────────────────────────┐
│  NAV SIDEBAR (240px fixed)     │  MAIN CONTENT (fluid)           │
│                                │                                  │
│  [KB Logo / App name]          │  [Page-specific content]         │
│                                │                                  │
│  [Search bar]                  │                                  │
│                                │                                  │
│  CATEGORIES                    │                                  │
│  • All Articles                │                                  │
│  • Engineering                 │                                  │
│  • Product                     │                                  │
│  • Design                      │                                  │
│  • Operations                  │                                  │
│                                │                                  │
│  ─────────────────             │                                  │
│  [+ New Article]  (button)     │                                  │
└────────────────────────────────┴──────────────────────────────────┘
```

**Sidebar elements (top to bottom):**
1. App name "Knowledge Base" as `<h1 aria-label="Knowledge Base">` — 16px semibold, left-aligned, 24px top padding
2. Search input (full width, 36px height) — see §3.1
3. Section label "CATEGORIES" — 11px uppercase, letter-spacing: 0.06em, text-muted color, 20px top margin
4. Category list — each item is an `<a>` styled as a nav link; active state indicated by left border + bg tint
5. Horizontal rule `<hr>` with `border-color: var(--color-border)`
6. "New Article" button — full-width, primary variant

**Main content area:** has `16px` padding on all sides (desktop), expands to fill remaining horizontal space.

---

### 2.2 Browse / Search — `/articles`

This is the landing page and the most-used view.

```
┌─────────────────────────────────────────────────────────────────┐
│  MAIN CONTENT AREA                                              │
│                                                                  │
│  Articles  [count: 12]                          [+ New Article]  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Engineering]  Engineering Onboarding                    │  │
│  │  How to get set up as a new engineer, including repo      │  │
│  │  access, local dev, and team norms.                       │  │
│  │                                                 May 10    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Product]  Quarterly Planning Process          [DRAFT]   │  │
│  │  Our approach to OKR setting and roadmap review.          │  │
│  │                                                 May 8     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  [Design]  Design System Principles                       │  │
│  │  The visual and interaction foundations we build from.    │  │
│  │                                                 Apr 30    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Page heading row:** `<h1>` "Articles" (24px bold) + article count in muted text (same line, left) + "New Article" button (top right, primary). The heading and button share a `flex justify-between items-center` row.

**Article card:**
- White surface (`--color-surface`), 1px border (`--color-border`), 4px border-radius, 16px internal padding
- `gap-4` between cards (no horizontal rule — cards are visually separated)
- **Title:** 16px semibold, `--color-text-primary`, links to `/articles/[slug]`. No underline by default; underline on hover.
- **Category badge:** Left of title, pill shape. See §3.2 for badge styling.
- **Draft badge:** Right of title area (after a spacer), only shown when `status === 'DRAFT'`. See §3.4.
- **Excerpt:** 14px, `--color-text-secondary`, 2-line clamp (`-webkit-line-clamp: 2`), 4px top margin
- **Updated date:** 13px, `--color-text-muted`, bottom-right of card. Format: `MMM D` (e.g., "May 10") for current year; `MMM D, YYYY` for prior years.
- **Hover state:** Card background shifts to `--color-accent-subtle` (blue-50), border color to `--color-accent` (blue-600). Cursor: pointer. The entire card is a link — use `<a>` wrapping the card or `position: relative` + `::after` pseudo-element trick for the card link.

**Default sort:** `updatedAt DESC`. No sort controls in v1.

**When search is active (`?q=` param present):**
- Page heading changes to: `Results for "[query]"` with the article count
- Add a small "× Clear search" text button next to the heading (14px, accent color)
- The category filter in the sidebar still applies (search + category filter combine)

---

### 2.3 Article Detail — `/articles/[slug]`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Articles                                        [Edit]        │
│                                                                  │
│  [Engineering]  [DRAFT]                                          │
│                                                                  │
│  Engineering Onboarding                                          │
│  ─────────────────────────────────────────────────────────────  │
│  Updated May 10, 2026 · 5 min read                               │
│                                                                  │
│  [Rendered Markdown content]                                     │
│  ...                                                             │
│  ...                                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Back link:** `← Articles` — 14px, `--color-text-secondary`, arrow is a text character or inline SVG icon. Returns to `/articles` (preserving `?q=` and `?category=` via `<Link href="/articles">` so the list context is not lost — the back link should restore search/filter state if possible via `document.referrer` or a `back` navigation).

**Edit button:** Top-right corner. Secondary button style. Links to `/articles/[slug]/edit`.

**Badges row:** Category badge + Draft badge (if applicable), 8px gap between them. Below the back link / edit button row.

**Article title:** `<h1>`, 30px bold, `--color-text-primary`, margin-top 12px from badges.

**Horizontal rule** (`<hr>`, `--color-border`), full width, 12px top margin.

**Metadata line:** 14px, `--color-text-muted`. "Updated [full date]" · "[N] min read". Reading time is `Math.ceil(wordCount / 200)` minutes, computed in the service layer or a utility function.

**Content area:** 16px top margin. Wrapped in `<div className="prose prose-slate max-w-none">` using `@tailwindcss/typography`. This plugin handles heading sizes, list styling, code blocks, blockquotes, and link colors automatically — no custom prose overrides needed unless the color palette conflicts (check that `prose-slate` link color matches `--color-accent`).

**Max width of content:** 720px centered within the main area. This prevents line lengths from becoming unreadable on wide screens. Use `max-w-[720px] mx-auto` on the content container.

---

### 2.4 Create Article — `/articles/new`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Articles                                                      │
│                                                                  │
│  New Article                                                     │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Title *                                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  (empty)                                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Category                                                        │
│  ┌──────────────────────────┐                                    │
│  │  No category ▾           │                                    │
│  └──────────────────────────┘                                    │
│                                                                  │
│  Status                                                          │
│  ○ Published   ● Draft                                           │
│                                                                  │
│  Content *                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [MD Editor with split-pane preview]                    │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Cancel]                              [Create Article →]        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Back link:** `← Articles` (same style as detail page).

**Page heading:** `<h2>` "New Article", 24px bold.

**Fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| Title | text input | Yes | Max 200 chars. Auto-generates slug on blur (shown as helper text below field: "URL: /articles/[slug]") |
| Category | `<select>` dropdown | No | First option is "No category". Options populated from `GET /api/categories`. |
| Status | Radio group | Yes | Default: "Published". Two options: "Published" / "Draft". |
| Content | MD Editor | Yes | Split-pane. Min-height 400px. |

**Validation:** Inline, shown on blur (not on submit only). Title required; Content required. Error messages appear as 13px `--color-error` text directly below the field.

**Submit button:** "Create Article →" (primary), right-aligned. Disabled while loading.

**Cancel button:** "Cancel" (ghost/text button), left side of the button row, links back to `/articles`.

**Slug preview:** Shown as helper text below the title field after the user types: `URL: /articles/engineering-onboarding` in 13px `--color-text-muted`. Updates on blur.

---

### 2.5 Edit Article — `/articles/[slug]/edit`

Identical layout to Create, with these differences:

- Page heading: `<h2>` "Edit Article"
- All fields pre-populated with existing article data
- Submit button label: "Save Changes"
- Add a **Delete** button below the cancel/save row, left-aligned, with `--color-error` text color, no border (ghost/destructive style). On click: show an inline confirmation prompt (not a modal) that replaces the delete button with:
  ```
  Delete this article? [Cancel] [Yes, delete]
  ```
  This keeps the flow in-page and avoids a separate modal component. After confirmation, POST to the delete server action, redirect to `/articles`.

---

### 2.6 Empty States

Every empty state uses the `<EmptyState>` component with a consistent layout:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│              [Icon — 48×48, --color-text-muted]                  │
│                                                                  │
│                     No articles found                            │
│           Try a different search term or clear your             │
│                      search to see all articles.                 │
│                                                                  │
│                      [Clear search]   or   [New Article]         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Three empty state variants:**

| Scenario | Heading | Body copy | CTA |
|---|---|---|---|
| No articles at all (first run) | "No articles yet" | "This knowledge base is empty. Add the first article to get started." | [+ New Article] primary button |
| Search returns no results | "No results for '[query]'" | "Try a different search term or browse all articles." | [Clear search] text link + [Browse all] text link |
| Category has no articles | "No articles in [Category]" | "There are no articles in this category yet." | [Browse all articles] text link |

Empty state is always centered vertically in the content area (not pinned to top). Use `min-h-[320px]` with `flex flex-col items-center justify-center`.

The `role="status"` attribute goes on the empty state container for screen reader announcement.

---

### 2.7 Navigation Flow

```
/articles (list)
   │
   ├── [click article card] ────────────────→ /articles/[slug] (detail)
   │                                                │
   │                                                ├── [Edit] ──→ /articles/[slug]/edit
   │                                                │                      │
   │                                                │         [Save] ──→ /articles/[slug] (detail)
   │                                                │         [Cancel] → /articles/[slug] (detail)
   │                                                │         [Delete confirm] → /articles (list)
   │                                                │
   │                                                └── [← Articles] → /articles (list)
   │
   └── [+ New Article] ─────────────────────→ /articles/new
                                                     │
                                          [Create] → /articles/[slug] (detail)
                                          [Cancel] → /articles (list)
```

Entry point: `/` redirects to `/articles`. All user journeys begin and end at the list view.

---

## 3. Feature UX Decisions

### 3.1 Search

**Placement:** The search bar lives in the sidebar (desktop/tablet) as the primary navigation shortcut. On mobile, it appears as a full-width bar above the article list.

**Component behavior:**
- `<input type="search">`, placeholder: "Search articles…"
- 300ms debounce on `onChange` → `router.push('?q=[value]', { scroll: false })`
- The `scroll: false` option prevents the page jumping to top on each keystroke
- When the input has a value, a `×` clear button appears inside the input (right side, 16×16px tap target minimum)
- Pressing `Escape` clears the search value and resets `?q=`
- Pressing `Enter` immediately fires (no wait for debounce)

**Visual:**
- Height: 36px
- Background: `--color-bg` (slightly recessed from sidebar surface)
- Border: 1px solid `--color-border`
- Border-radius: 6px
- Left padding: 8px; includes a 16px search icon (SVG) with 8px gap before text
- Focus ring: 2px `--color-accent` offset 2px

**Search results behavior:**
- Results appear inline in the main list view (no separate results page)
- The URL updates to `/articles?q=onboarding`
- The sidebar category filter remains active — both `?q=` and `?category=` can be applied simultaneously
- Result cards are identical to browse cards — no special treatment for matched text (no keyword highlighting in v1)

---

### 3.2 Category Filtering

**Sidebar category list:**
- Each category is an `<a>` tag linking to `/articles?category=[slug]`
- "All Articles" is the first item and links to `/articles` (clears the category filter)
- Active state: 2px left border using `--color-accent`, background `--color-accent-subtle`, text `--color-accent`
- Default state: no border, text `--color-text-secondary`
- Hover state: background `--color-accent-subtle`, text `--color-text-primary`

**Category badge on cards:**
- Pill shape: 4px border-radius, 4px horizontal padding, 2px vertical padding
- 12px font size, semibold
- Color: each category gets a fixed color assignment from a 6-color palette (see §5.1). Categories are assigned colors by their index in the seed data. The color is not stored in the database — it is derived deterministically from `categoryId` modulo 6.
- The badge is a `<span>`, not an `<a>`. Clicking the badge does not navigate — the user uses the sidebar to filter. This avoids confusion between card click (→ detail) and badge click.

**Category dropdown in forms:**
- Standard `<select>` element, full-width on mobile, 240px on desktop
- Placeholder option: `<option value="">No category</option>` (not disabled — user can explicitly clear category)
- Options listed alphabetically

---

### 3.3 Markdown Editor

**Component:** `@uiw/react-md-editor` loaded via `dynamic(() => import(...), { ssr: false })`.

**Layout:**
- Split-pane: left pane is the raw Markdown textarea, right pane is the live preview
- On mobile: tabs instead of split-pane ("Write" tab / "Preview" tab)
- Min-height: 400px (desktop), 300px (mobile)
- The editor fills the remaining form width

**Form integration:**
- The editor value is stored in a `useState` hook in the `ArticleEditor` Client Component
- A hidden `<textarea name="content">` is kept in sync so standard HTML form submission works correctly with Server Actions
- On submit, the hidden textarea value is what the Server Action reads

**Toolbar:** Keep the default `@uiw/react-md-editor` toolbar. Do not customize it. The brief explicitly says "simple, not enterprise-heavy."

**Validation:**
- If the user attempts to submit with an empty content field, show the inline error below the editor: "Content is required."
- The MD editor component does not have a native `required` state — validation is enforced in the Server Action and surfaced via `useActionState`.

---

### 3.4 Article Status

**Edit form toggle:**
- Radio group: `○ Published` / `○ Draft`
- Default on create: Published
- Both options shown side by side with 16px gap
- Each option: radio input + label, 44px minimum click target (the label extends the touch area)

**Status badge on cards and detail page:**
- Shown only for `DRAFT` status (published articles get no badge — published is the expected state)
- Badge: "DRAFT", 11px uppercase, semibold
- Colors: `--color-draft-bg` background, `--color-draft-text` text
- Pill shape: same as category badge

**List filtering:**
- By default, the list page shows only `PUBLISHED` articles
- There is no UI control to show draft articles in the browse list in v1
- Draft articles are accessible directly at their URL — they just don't appear in the main list
- A draft article's detail page shows the draft badge prominently below the back link

---

## 4. Responsive Design

### Breakpoints

| Name | Min-width | Tailwind prefix | Layout |
|---|---|---|---|
| Mobile | 0px | (default) | Single column, no sidebar |
| Tablet | 768px | `md:` | Two-column, sidebar visible |
| Desktop | 1024px | `lg:` | Two-column, sidebar 240px fixed |

### Desktop (≥1024px)

- Sidebar: 240px wide, fixed height (full viewport), `overflow-y: auto` for long category lists
- Main content: `flex-1`, `min-width: 0` (to prevent flex overflow)
- Article list max width: unconstrained (fills main area)
- Article detail content: max-width 720px, centered

### Tablet (768px–1023px)

- Sidebar: collapses to 64px wide (icon-only mode)
  - App name hidden, replaced by a monogram icon
  - Category names hidden; only colored dots or icons remain
  - "New Article" becomes a `+` icon button
  - Search bar hidden from sidebar; a search icon button opens a full-width search bar that overlays the top of the main content area
- Main content: fills remaining width
- Article cards: unchanged

### Mobile (<768px)

- Sidebar hidden entirely; replaced by a top navigation bar (48px height):
  ```
  ┌──────────────────────────────────────────────────────────────┐
  │ [☰]  Knowledge Base                    [🔍]  [+ New]         │
  └──────────────────────────────────────────────────────────────┘
  ```
  - Hamburger (☰) opens a drawer that contains the full sidebar (categories + new article button)
  - The drawer overlays the content with a 50% opacity backdrop, closes on backdrop click or `Escape`
  - Search icon (🔍) expands to a full-width search bar that replaces the top nav until dismissed
- Article list: single column, full width, 16px horizontal padding
- Article cards: reduce internal padding to 12px
- Article detail: full-width content, 16px horizontal padding, no max-width constraint (small screen doesn't need it)
- Editor: single tab view ("Write" / "Preview" tabs), not split-pane

### Touch targets

All interactive elements must meet the 44×44px minimum touch target:
- Nav category links: add `py-3` (48px height) on mobile
- Article cards: already full-width, height determined by content
- Buttons: min-height 44px on mobile (`h-11`)
- Radio options: labels extend to full target width
- Search clear button: 44×44px hit area using padding, even if the visual icon is 16px

---

## 5. Visual Style System

### 5.1 Color Palette

All colors are defined as CSS custom properties in `globals.css`. Tailwind 4's CSS-first config allows them to be referenced directly as arbitrary values or as `@theme` extension tokens.

```css
:root {
  /* Backgrounds */
  --color-bg:              #f8f9fa;   /* Page background (near-white) */
  --color-surface:         #ffffff;   /* Card, panel backgrounds */
  --color-surface-raised:  #f1f5f9;   /* Hover overlay on dark bg */

  /* Borders */
  --color-border:          #e2e8f0;   /* Subtle dividers, card outlines */
  --color-border-strong:   #cbd5e1;   /* Active states, focused inputs */

  /* Text */
  --color-text-primary:    #0f172a;   /* Headings, body copy */
  --color-text-secondary:  #475569;   /* Excerpt, metadata */
  --color-text-muted:      #94a3b8;   /* Dates, labels, placeholders */

  /* Accent (blue) */
  --color-accent:          #2563eb;   /* Links, primary CTA, active nav */
  --color-accent-hover:    #1d4ed8;   /* Hover on accent */
  --color-accent-subtle:   #eff6ff;   /* Nav active bg, hover tints */
  --color-accent-text:     #1e40af;   /* Accent text on light bg */

  /* Status: draft */
  --color-draft-bg:        #fefce8;
  --color-draft-text:      #854d0e;
  --color-draft-border:    #fde68a;

  /* Status: published (no badge in normal UI — shown only in edge cases) */
  --color-published-bg:    #f0fdf4;
  --color-published-text:  #166534;

  /* Feedback */
  --color-error:           #dc2626;
  --color-error-bg:        #fef2f2;
  --color-error-border:    #fecaca;
  --color-success:         #16a34a;
  --color-success-bg:      #f0fdf4;
  --color-warning:         #ca8a04;
}
```

**Category colors (6-slot deterministic palette):**

Derive category color by `categoryIndex % 6`. Store as a utility class or CSS data attribute.

| Index | Background | Text | Border |
|---|---|---|---|
| 0 | `#eff6ff` | `#1d4ed8` | `#bfdbfe` |
| 1 | `#f0fdf4` | `#15803d` | `#bbf7d0` |
| 2 | `#fdf4ff` | `#7e22ce` | `#e9d5ff` |
| 3 | `#fff7ed` | `#c2410c` | `#fed7aa` |
| 4 | `#fefce8` | `#a16207` | `#fde68a` |
| 5 | `#f0f9ff` | `#0369a1` | `#bae6fd` |

To implement: derive the index in the service layer or component and map to a `data-category-color="0"` attribute; define six `[data-category-color="N"]` CSS rules. Do not use Tailwind dynamic class names (they won't be included in the purged bundle).

### 5.2 Typography

**Font:** Inter, loaded via `next/font/google`:

```ts
// src/app/layout.tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
```

Apply `className={`${inter.variable} font-sans`}` on `<body>`.

**Type scale:**

| Token | Size | Weight | Line height | Use |
|---|---|---|---|---|
| `text-xs` | 12px | 400 | 1.33 | Timestamps, secondary labels |
| `text-sm` | 14px | 400/500 | 1.43 | Excerpt text, form labels, helper text |
| `text-base` | 16px | 400 | 1.5 | Body, nav items, card titles |
| `text-lg` | 18px | 600 | 1.44 | Section subheadings |
| `text-xl` | 20px | 600 | 1.4 | Form page headings |
| `text-2xl` | 24px | 700 | 1.33 | List page `<h1>` |
| `text-3xl` | 30px | 700 | 1.2 | Article detail `<h1>` |

**Prose (rendered Markdown):** Tailwind Typography `prose prose-slate max-w-none`. This governs font sizes within article content. No overrides unless `prose-slate` link color conflicts with `--color-accent`; if it does, add:

```css
.prose a { color: var(--color-accent); }
.prose a:hover { color: var(--color-accent-hover); }
```

**Letter spacing:**
- Category filter label: `tracking-widest` (0.1em)
- Body text: default (0)
- No other letter-spacing customization

### 5.3 Spacing System

Base unit: 4px (Tailwind default). Use Tailwind spacing scale throughout.

| Token | Value | Common use |
|---|---|---|
| `space-1` | 4px | Icon-to-text gap, badge padding |
| `space-2` | 8px | Badge padding, inline element gap |
| `space-3` | 12px | Tight field gap, card bottom padding |
| `space-4` | 16px | Card padding, section gap, page padding |
| `space-5` | 20px | Field-to-field gap in forms |
| `space-6` | 24px | Section-to-section gap |
| `space-8` | 32px | Sidebar section top margin |
| `space-10` | 40px | Page top margin |
| `space-12` | 48px | Nav height (mobile) |

**Border radius:**
- Inputs, cards: `rounded` (4px)
- Badges, pills: `rounded-full`
- Buttons: `rounded-md` (6px)
- Dropdown: `rounded` (4px)
- Drawer: `rounded-r-lg` (right side only, on mobile drawer)

**Box shadows:**
- Cards: none by default; border provides separation
- Focused input: no box-shadow; use focus ring instead
- Mobile drawer: `shadow-xl`

### 5.4 Iconography

Use [Lucide React](https://lucide.dev) for all icons. It is tree-shaken, TypeScript-typed, and consistent. Import only the icons used.

| Icon name | Use |
|---|---|
| `Search` | Search bar prefix icon |
| `X` | Clear search button |
| `Plus` | New article button, mobile nav |
| `ChevronLeft` | Back navigation arrows |
| `Pencil` | Edit button on detail page |
| `Trash2` | Delete action in edit form |
| `FileText` | Empty state icon (no articles) |
| `SearchX` | Empty state icon (no search results) |
| `FolderOpen` | Empty state icon (no category articles) |
| `Menu` | Mobile hamburger |

**Icon sizing:**
- Inline text icons: 16×16px (`size-4`)
- Empty state icon: 48×48px (`size-12`)
- Nav icons: 20×20px (`size-5`)

All icons must have `aria-hidden="true"` when decorative. When standalone (e.g., icon-only buttons), add `aria-label` on the button.

### 5.5 Sidebar

Width: 240px (desktop), 64px collapsed (tablet), 0px (mobile, replaced by drawer).

Sidebar background: `--color-surface` (white). Right border: 1px solid `--color-border`.

---

## 6. UI States

### Search Bar

| State | Visual |
|---|---|
| Default | 1px border `--color-border`, placeholder in `--color-text-muted` |
| Hover | Border `--color-border-strong` |
| Focus | Border `--color-accent`, 2px focus ring `--color-accent` at 2px offset |
| Has value | `×` clear button appears (16px icon, `--color-text-muted`), icon changes color to `--color-accent` |
| Loading (debounce) | No visual change — page revalidation is fast enough |

### Article Card

| State | Visual |
|---|---|
| Default | White background, 1px border `--color-border` |
| Hover | Background `--color-accent-subtle`, border `--color-accent` |
| Focus-visible (keyboard) | 2px focus ring `--color-accent` offset 2px (on the `<a>` element) |

### Primary Button ("Create Article", "Save Changes", "New Article")

| State | Visual |
|---|---|
| Default | Background `--color-accent`, text white, `rounded-md`, `h-10 px-4` |
| Hover | Background `--color-accent-hover` |
| Focus | 2px focus ring `--color-accent` offset 2px |
| Disabled | Background `#94a3b8` (slate-400), cursor `not-allowed`, text white |
| Loading | Disabled styling + spinner (16px) replacing button text, or text "Saving…" |

### Secondary Button ("Edit", "Cancel")

| State | Visual |
|---|---|
| Default | Background transparent, border 1px `--color-border`, text `--color-text-primary` |
| Hover | Background `--color-surface-raised` |
| Focus | 2px focus ring `--color-accent` offset 2px |
| Disabled | Text `--color-text-muted`, cursor `not-allowed` |

### Destructive Button ("Delete")

| State | Visual |
|---|---|
| Default | Background transparent, no border, text `--color-error` |
| Hover | Background `--color-error-bg`, text `--color-error` |
| Focus | 2px focus ring `--color-error` offset 2px |

### Text Input / Select

| State | Visual |
|---|---|
| Default | 1px border `--color-border`, background white, text `--color-text-primary` |
| Hover | Border `--color-border-strong` |
| Focus | Border `--color-accent`, 2px ring `--color-accent` |
| Error | Border `--color-error`, ring `--color-error-bg` |
| Disabled | Background `--color-surface-raised`, text `--color-text-muted` |
| Read-only | Same as disabled, no cursor change |

**Error message (below field):**
- 13px, `--color-error`, `role="alert"`, linked to input via `aria-describedby`
- Appears immediately below the field label/input unit, not grouped at form top

### Category Nav Link (Sidebar)

| State | Visual |
|---|---|
| Default | Text `--color-text-secondary`, no background |
| Hover | Background `--color-accent-subtle`, text `--color-text-primary` |
| Active (current category) | 2px left border `--color-accent`, background `--color-accent-subtle`, text `--color-accent`, font-medium |

### Markdown Editor

| State | Visual |
|---|---|
| Default | Default `@uiw/react-md-editor` styles |
| Error (empty content submitted) | Red 1px border wrapping the editor container, error message below |
| Loading (initial mount, SSR placeholder) | Show a grey skeleton placeholder (`--color-surface-raised` bg, `animate-pulse`) matching the editor height until the dynamic import resolves |

### Delete Confirmation (Inline)

When the user clicks Delete in the edit form:

```
[Delete this article?]  [Cancel]  [Yes, delete]
```

- "Delete this article?" — 14px, `--color-text-primary`
- "Cancel" — text button, `--color-text-secondary`
- "Yes, delete" — primary-destructive style: background `--color-error`, text white, `rounded-md`, hover background `#b91c1c`
- Appears in place of the Delete button (not a modal)

---

## 7. Accessibility

### Contrast Ratios (WCAG AA minimum: 4.5:1 for normal text, 3:1 for large text)

| Pair | Ratio | Passes |
|---|---|---|
| `--color-text-primary` (#0f172a) on `--color-surface` (#ffffff) | ~18:1 | AA + AAA |
| `--color-text-secondary` (#475569) on `--color-surface` (#ffffff) | ~7.4:1 | AA + AAA |
| `--color-text-muted` (#94a3b8) on `--color-surface` (#ffffff) | ~3.4:1 | AA (large text only — use only for metadata, not body) |
| `--color-accent` (#2563eb) on `--color-surface` (#ffffff) | ~5.5:1 | AA |
| White (#ffffff) on `--color-accent` (#2563eb) | ~5.5:1 | AA |
| `--color-error` (#dc2626) on `--color-surface` (#ffffff) | ~5.3:1 | AA |
| `--color-draft-text` (#854d0e) on `--color-draft-bg` (#fefce8) | ~6.8:1 | AA + AAA |

**Note:** `--color-text-muted` does not meet AA for normal-size body text. Only use it for 14px+ text that conveys supplementary information (dates, counts). Never use it for required UI copy.

### Keyboard Navigation

- **Tab order** matches visual reading order: sidebar (search → category list → New Article button) → main content (first card → subsequent cards). On detail page: back link → edit button → article content.
- All interactive elements reachable by `Tab`. No `tabindex` greater than 0 (avoid manual tab order manipulation).
- **Enter** activates links and buttons. **Space** activates buttons (native behavior — do not override).
- **Escape** closes the mobile drawer and clears the search input when focused.
- **Arrow keys** navigate within the radio group (Status field) natively.
- Focus ring is always visible: Tailwind's `focus-visible:ring-2 focus-visible:ring-offset-2` on all interactive elements. Do not suppress focus rings.

### Focus Order (Create/Edit form)

1. Back link
2. Title input
3. Category select
4. Status radio: Published
5. Status radio: Draft
6. Content editor textarea
7. Cancel button
8. Submit button
9. Delete button (edit form only)

### Screen Reader Labeling

| Element | Implementation |
|---|---|
| Search input | `<label for="search-input" class="sr-only">Search articles</label>` + `placeholder="Search articles…"` |
| Category nav | Wrap in `<nav aria-label="Categories">` |
| Main content | `<main>` element wraps the article list and detail |
| Article list | `<ul>` with `<li>` for each card; card link text must be meaningful (`aria-label="Engineering Onboarding, Engineering category, updated May 10"` if the visible text is insufficient) |
| Empty state | Container uses `role="status"` |
| Draft badge | Includes `<span class="sr-only">Status: </span>DRAFT` so screen readers announce "Status: Draft" |
| Error messages | `role="alert"` + `aria-describedby` linking the field to its error |
| Delete confirm prompt | `role="alert"` when it appears (to announce it to screen readers) |
| Icon-only buttons | `aria-label="Close search"`, `aria-label="Open navigation"`, etc. |
| Loading spinner | `aria-label="Loading…"` + `role="status"` on the spinner container |

### Heading Hierarchy

| Page | `<h1>` | `<h2>` | `<h3>` |
|---|---|---|---|
| List (`/articles`) | "Articles" or "Results for…" | — | — |
| Detail | Article title | Article content sections (from Markdown) | Sub-sections (from Markdown) |
| Create | `<h2>` "New Article" (h1 is the sidebar app name) | — | — |
| Edit | `<h2>` "Edit Article" | — | — |

The sidebar app name is the page-level `<h1>` across all pages. Form pages use `<h2>` for the form title. This is consistent and avoids multiple `<h1>` elements.

---

## 8. Handoff Notes

### 8.1 CSS Custom Properties (Design Tokens)

Paste this block into `src/app/globals.css` after `@import "tailwindcss"`:

```css
@layer base {
  :root {
    --color-bg:               #f8f9fa;
    --color-surface:          #ffffff;
    --color-surface-raised:   #f1f5f9;
    --color-border:           #e2e8f0;
    --color-border-strong:    #cbd5e1;
    --color-text-primary:     #0f172a;
    --color-text-secondary:   #475569;
    --color-text-muted:       #94a3b8;
    --color-accent:           #2563eb;
    --color-accent-hover:     #1d4ed8;
    --color-accent-subtle:    #eff6ff;
    --color-accent-text:      #1e40af;
    --color-draft-bg:         #fefce8;
    --color-draft-text:       #854d0e;
    --color-draft-border:     #fde68a;
    --color-error:            #dc2626;
    --color-error-bg:         #fef2f2;
    --color-error-border:     #fecaca;
    --color-success:          #16a34a;
    --color-success-bg:       #f0fdf4;

    --sidebar-width:          240px;
    --sidebar-width-collapsed: 64px;
    --nav-height-mobile:      48px;
  }

  body {
    background-color: var(--color-bg);
    color: var(--color-text-primary);
    font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  }
}
```

### 8.2 Component Reference

| Component | File | Notes |
|---|---|---|
| `Nav` | `src/components/Nav.tsx` | Sidebar shell (Server Component). Renders category list from `listCategories()`. |
| `SearchBar` | `src/components/SearchBar.tsx` | Client Component. Debounced, updates `?q=` param. |
| `ArticleCard` | `src/components/ArticleCard.tsx` | Server Component. Accepts `{ title, slug, excerpt, category, status, updatedAt }`. |
| `CategoryBadge` | `src/components/CategoryBadge.tsx` | `<span>` with deterministic color from category index. Accepts `{ name, colorIndex }`. |
| `StatusBadge` | `src/components/StatusBadge.tsx` | Renders "DRAFT" badge or nothing (for published). |
| `EmptyState` | `src/components/EmptyState.tsx` | Accepts `{ variant: 'empty' | 'no-results' | 'no-category', query?, category? }`. Renders appropriate icon, heading, body, CTA. |
| `ArticleEditor` | `src/components/ArticleEditor.tsx` | Client Component. Dynamic import. Props: `{ defaultValue, name }`. Syncs to hidden textarea. |
| `ArticleRenderer` | `src/components/ArticleRenderer.tsx` | Server Component. Wraps `react-markdown` + `remark-gfm` in `<div className="prose prose-slate max-w-none">`. |

### 8.3 Tailwind Utility Conventions

These patterns should be consistent across all components:

```tsx
// Article card
<a
  href={`/articles/${slug}`}
  className="block bg-white border border-[--color-border] rounded p-4 gap-4
             hover:bg-[--color-accent-subtle] hover:border-[--color-accent]
             focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2
             transition-colors duration-100"
>

// Primary button
<button className="h-10 px-4 bg-[--color-accent] text-white rounded-md font-medium
                   hover:bg-[--color-accent-hover]
                   focus-visible:ring-2 focus-visible:ring-[--color-accent] focus-visible:ring-offset-2
                   disabled:bg-slate-400 disabled:cursor-not-allowed
                   transition-colors duration-100">

// Text input
<input className="w-full h-10 px-3 border border-[--color-border] rounded
                  placeholder:text-[--color-text-muted]
                  hover:border-[--color-border-strong]
                  focus:border-[--color-accent] focus:ring-2 focus:ring-[--color-accent] focus:ring-offset-0
                  aria-[invalid=true]:border-[--color-error]">

// Sidebar category link
<a className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[--color-text-secondary]
              hover:bg-[--color-accent-subtle] hover:text-[--color-text-primary]
              aria-[current=page]:bg-[--color-accent-subtle] aria-[current=page]:text-[--color-accent]
              aria-[current=page]:font-medium aria-[current=page]:border-l-2 aria-[current=page]:border-[--color-accent]
              transition-colors duration-100">
```

Use `aria-[current=page]` on the active category link (not a custom `active` class) — this is the correct semantic attribute and doubles as the CSS hook.

### 8.4 Page Layout Shell

```tsx
// src/app/layout.tsx (simplified)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-[--color-bg]">
        <Nav />  {/* 240px sidebar */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-[1200px]">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
```

The `overflow-hidden` on body + `overflow-y-auto` on main creates the scrollable content area while keeping the sidebar fixed without `position: fixed`.

### 8.5 Category Color Implementation

```tsx
// src/components/CategoryBadge.tsx
const CATEGORY_COLORS = [
  { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  { bg: '#fefce8', text: '#a16207', border: '#fde68a' },
  { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
];

export function CategoryBadge({ name, colorIndex }: { name: string; colorIndex: number }) {
  const color = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
  return (
    <span
      style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border"
    >
      {name}
    </span>
  );
}
```

Pass `colorIndex` from the service layer. A simple approach: sort categories alphabetically and use their position as the index (stable across renders).

---

## 9. Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Sidebar vs. top nav | Sidebar | The brief requires category filtering as a persistent nav affordance. A sidebar makes categories always visible without a dropdown. Top nav would require a separate filter row, adding vertical complexity. |
| Search in sidebar vs. top bar | Sidebar (desktop), inline above list (mobile) | Keeps search co-located with category filters — both refine the same list. On mobile, the sidebar is hidden so search moves inline. |
| Card list vs. grid layout | Vertical list | Information density favored over visual presentation. Cards contain multi-line excerpts; a grid would require fixed heights or clipped content. The brief says "information-dense, not cluttered." |
| Full-card link vs. "Read more" button | Full-card link | Lower friction. Every pixel of the card is a click target. Achieves list → detail in one click. Implemented with a wrapping `<a>` tag. |
| Category badge non-clickable on cards | Badge is `<span>`, not `<a>` | Prevents confusion between two click behaviors on the same card (card → detail, badge → filter). Filtering uses the persistent sidebar — users learn one place for filtering. |
| Draft articles hidden from list by default | Hide drafts from browse | The primary user (reader) doesn't need to see drafts. Showing them would pollute the browse experience. Editors access drafts by direct URL or a future "My drafts" view. |
| Delete confirmation inline (not modal) | Inline confirmation | Fewer components. No focus trapping complexity. Maintains screen context. Modals interrupt flow; inline confirmation keeps the editor in context. |
| No toast notifications | Redirect/page reload carries the signal | After save, the redirect to the detail page *is* the success signal — the user sees their saved content. After delete, redirect to the list *is* the signal. Toasts would add complexity (portal, animation, timeout) with little benefit for this flow pattern. |
| `prose prose-slate` for Markdown | Tailwind typography plugin | The brief's "calm, readable" tone maps exactly to what `@tailwindcss/typography` provides. No hand-crafting of heading sizes, code block styles, or blockquote styling needed. |
| No pagination | Load all (capped at 50 in search, uncapped in browse for v1) | Appropriate for a small-to-medium article set as described in the brief. PostgreSQL and Next.js can serve a few hundred articles efficiently. Pagination adds UX complexity without a demonstrated need at this scale. |
| Inter font | Inter via next/font | Highly readable at all sizes, widely used for internal tools, excellent Tailwind CSS integration. Available without separate CDN request via `next/font`. |
