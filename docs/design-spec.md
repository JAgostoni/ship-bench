# UX/Design Direction Spec: Simplified Knowledge Base App

**Version:** 1.0
**Date:** 2026-05-08
**Status:** Ready for implementation

---

## Table of Contents

1. [Design Principles & Tone](#design-principles--tone)
2. [Layout & Page Flows](#layout--page-flows)
3. [Feature UX Decisions](#feature-ux-decisions)
4. [Responsive Design](#responsive-design)
5. [Visual Style System](#visual-style-system)
6. [UI States](#ui-states)
7. [Accessibility](#accessibility)
8. [Handoff Notes](#handoff-notes)
9. [Decisions Log](#decisions-log)

---

## Design Principles & Tone

The interface must feel **calm, readable, and information-dense without being cluttered**. Every design decision traces back to one of these directives:

| Principle | Manifestation |
|-----------|---------------|
| **Search-first** | The search bar is the most prominent interactive element on the home page. Users should reach it in one keystroke (Tab) from page load. |
| **Low-friction navigation** | Movement between list and detail views uses soft transitions, breadcrumbs, and back-button-friendly URL state. No modals, no multi-step wizards. |
| **Strong hierarchy** | Typography scale, spacing, and color weight guide the eye from primary actions → content → metadata. Headings are scannable; body text is comfortable at default zoom. |
| **Minimal decoration** | No hero images, gradients, drop shadows deeper than 1px, or animated transitions longer than 150ms. Icons are functional, not decorative. |
| **Information density** | Article cards surface title, excerpt, category, status, and relative time in one compact row. Lists use full available width. Whitespace is generous but purposeful. |

---

## Layout & Page Flows

### Global Shell

Every page shares a persistent shell:

```
┌─────────────────────────────────────────────────────┐
│ HEADER: [Logo/Title] ─── [Search Bar] ─── [+ New]  │
├──────────┬──────────────────────────────────────────┤
│ SIDEBAR  │                                          │
│          │          MAIN CONTENT AREA               │
│ Categories│                                         │
│ - Guides  │                                          │
│ - Ref     │                                          │
│ - Policies│                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│ FOOTER: "Knowledge Base · Internal Tool"            │
└─────────────────────────────────────────────────────┘
```

- **Header (64px tall, sticky):** App title on the left, search bar centered, "New Article" button on the right. On scroll, header remains fixed.
- **Sidebar (260px wide, desktop only):** Category navigation with article counts. Highlights the currently active category. Includes an "All Articles" link at top.
- **Footer (48px):** Minimal — app name and "Internal Tool" label. Not sticky; scrolls with content.
- **Main content:** Fills remaining space. Max-width 960px, centered with auto margins when sidebar is collapsed.

### Page 1: Home — Article List (`/`)

**Purpose:** Default landing page. Browse all published articles, newest first, with search and category filters.

```
HEADER (sticky)
─────────────────────────────────────────────────────
SIDEBAR    │  [Search Bar — full width, prominent]   │
           │                                          │
           │  20 articles · Sorted by most recent     │
           │                                          │
           │  ┌─ Article Card ──────────────────────┐ │
           │  │ Title (link)          Category Badge │ │
           │  │ Excerpt (2 lines max)   Updated 2d   │ │
           │  └──────────────────────────────────────┘ │
           │  ┌─ Article Card ──────────────────────┐ │
           │  │ ...                                  │ │
           │  └──────────────────────────────────────┘ │
           │                                          │
           │  ← Previous   Page 1 of 3   Next →      │
─────────────────────────────────────────────────────
FOOTER
```

**Flow entry points:**
- Direct URL `/`
- Clicking app title/logo in header
- Clicking "All Articles" in sidebar
- After creating, editing, or deleting an article (redirect back)

**Flow exits:**
- Click article title → `/articles/[slug]` (detail)
- Click "New Article" → `/articles/new` (create)
- Click category in sidebar → `/categories/[slug]` (filtered list)
- Type in search bar → `/?q=term` (filtered list with query param)
- Click pagination → `/?page=N` (same layout, different page)

**Article Card (list item):**
- Full-width horizontal card, 1px bottom border (`border-b border-neutral-200`)
- Padding: `py-4 px-1`
- **Left side:** Title (text-lg, font-semibold, link-colored), excerpt below (text-sm, text-neutral-500, 2-line clamp)
- **Right side:** Category badge (top), relative timestamp "Updated 3 days ago" (bottom, text-xs, text-neutral-400)
- Hover: subtle background shift to `bg-neutral-50`
- Focus: visible ring on the title link

### Page 2: Article Detail (`/articles/[slug]`)

**Purpose:** Read a single article with rendered Markdown content and navigation to edit.

```
HEADER (sticky)
─────────────────────────────────────────────────────
SIDEBAR    │  ← Back to articles           [Edit]    │
           │                                          │
           │  # Article Title                         │
           │  Category Badge · Draft badge ·          │
           │  Updated May 3, 2026                     │
           │  ─────────────────────────────           │
           │                                          │
           │  Rendered Markdown content               │
           │  (prose max-width ~75ch)                 │
           │                                          │
           │  ─────────────────────────────           │
           │  ← Back to articles           [Edit]    │
─────────────────────────────────────────────────────
FOOTER
```

**Flow entry points:**
- Click article card title from list or search results
- Direct URL
- After saving edits (redirect back to detail)

**Flow exits:**
- Click "Edit" → `/articles/[slug]/edit`
- Click "Back to articles" → `/`
- Click browser back
- Delete article → redirect to `/`

**Metadata bar:** Below the title, a horizontal row showing category badge (if assigned), status badge (if draft), and "Updated [date]" in text-neutral-500, text-sm. Items separated by `·` (middle dot).

**Content area:** Rendered via `react-markdown` wrapped in Tailwind `prose prose-neutral max-w-none`. This produces comfortable reading line length (~75 characters) with proper heading hierarchy, list styling, table formatting, and code block styling.

### Page 3: Create Article (`/articles/new`)

**Purpose:** Write and publish a new article with Markdown editing and live preview.

```
HEADER (sticky)
─────────────────────────────────────────────────────
SIDEBAR    │  ← Back                                  │
(no        │                                          │
active     │  Title: [_____________________________] │
category)  │  (1-200 chars)                           │
           │                                          │
           │  Category: [Select... ▼]                 │
           │  Status:   (●) Draft  ( ) Published      │
           │                                          │
           │  ┌─ Markdown Editor ────────────────────┐│
           │  │  Write    │  Preview                  ││
           │  │ ─────────────────────────────────── ││
           │  │ [textarea  │  Rendered Markdown      ││
           │  │  monospace] │  live preview            ││
           │  │            │                          ││
           │  └──────────────────────────────────────┘│
           │                                          │
           │  [Cancel]              [Save as Draft]   │
           │                        [Publish]         │
─────────────────────────────────────────────────────
FOOTER
```

**Flow entry points:**
- Click "New Article" button in header
- Click "Create the first one" in empty state
- Direct URL `/articles/new`

**Flow exits:**
- Click "Cancel" → navigate back (or to `/` if no history)
- Click "Save as Draft" → create with `status: "draft"`, redirect to `/articles/[slug]`
- Click "Publish" → create with `status: "published"`, redirect to `/articles/[slug]`
- On validation error: stay on form, show inline errors

**Form layout:** Single column, max-width 860px. Title field at top (full width input), then category and status on one row (flex), then the Markdown editor filling remaining vertical space.

**Editor tabs:** "Write" and "Preview" as tab-style buttons above the editor. "Write" is the default active tab. On desktop (≥768px), tabs are hidden and both panes show side-by-side. On mobile, tabs control which pane is visible.

### Page 4: Edit Article (`/articles/[slug]/edit`)

**Purpose:** Modify an existing article. Same layout as Create, but pre-filled.

```
HEADER (sticky)
─────────────────────────────────────────────────────
SIDEBAR    │  ← Back to article                       │
           │                                          │
           │  Title: [Pre-filled title____________]  │
           │  Slug: getting-started (read-only, gray)  │
           │                                          │
           │  Category: [Guides ▼]                    │
           │  Status:   ( ) Draft  (●) Published      │
           │                                          │
           │  ┌─ Markdown Editor (pre-filled) ───────┐│
           │  │  ...                                  ││
           │  └──────────────────────────────────────┘│
           │                                          │
           │  [Cancel]      [Delete...]   [Save]      │
─────────────────────────────────────────────────────
FOOTER
```

**Differences from Create:**
- Title, category, status, and content are pre-filled from the existing article
- Slug is shown as read-only text below the title (informational only)
- "Delete" button is present (left-aligned in the button row, styled as a destructive/danger variant)
- Single "Save" button replaces "Save as Draft" / "Publish" (since status is explicit via the toggle)
- "Back to article" link replaces generic "Back"
- On save: redirect to `/articles/[slug]` (which may have changed if the title changed)

**Delete flow:**
1. Click "Delete..." → browser `confirm()` dialog: "Delete this article? This cannot be undone."
2. On confirm: delete via Server Action, redirect to `/` with success message (optional: could show a brief toast, but for v1, just redirect with a query param `?deleted=1` that the home page reads to show a subtle banner).
3. On cancel: stay on edit page.

### Page 5: Category View (`/categories/[slug]`)

**Purpose:** Browse articles filtered to a single category.

```
HEADER (sticky)
─────────────────────────────────────────────────────
SIDEBAR    │  Guides — 5 articles                     │
(Guides    │                                          │
active)    │  Same article card layout as Home page   │
           │  but filtered by category                │
           │                                          │
           │  (or empty state if no articles)         │
─────────────────────────────────────────────────────
FOOTER
```

**Layout:** Identical to the home page, but:
- Heading shows category name and article count
- Articles are filtered to that category
- Active category is highlighted in the sidebar
- Same article card component, same pagination

### Search Flow

**Trigger:** User types in the search bar and presses Enter, or clicks the search icon, or the debounced input fires after 300ms of inactivity.

**Behavior:**
1. Browser navigates to `/?q=search+term`
2. Server Component reads `searchParams.q`, executes FTS5 query
3. Results render using the same article card component as the home page
4. Search bar retains the query text
5. A dismissible info banner appears: `Results for "search term" — 3 articles found. [Clear search]`
6. Clicking "Clear search" navigates back to `/`

**Empty search results:** Show empty state (see UI States section).

---

## Feature UX Decisions

### Feature 1: Article Browsing & Detail

**Article Card component:**
- Click target: the entire card is NOT clickable. Only the title is a link. This avoids nested-interactive issues and makes text selection possible on the excerpt.
- Title link: `text-blue-700 hover:text-blue-900 hover:underline` (or design token equivalent).
- Excerpt: rendered as plain text (Markdown stripped). Clamped to 2 lines via `line-clamp-2`.
- Category badge: `Badge` component, small pill, `bg-neutral-100 text-neutral-700 border border-neutral-200`, rounded-full, text-xs.
- Timestamp: relative format ("2 hours ago", "3 days ago", "May 3, 2026" for >30 days). Use `Intl.RelativeTimeFormat` or a lightweight library.

**Pagination:**
- Shown at the bottom of the list (and top if >50 total results).
- "← Previous" and "Next →" as text buttons, with "Page X of Y" in the center.
- Disabled state for Previous on page 1 and Next on last page.
- Page size: 20 articles per page (as specified in architecture).

**Article Detail — in-page navigation:**
- If the article has headings (`h2`, `h3`), optionally render a "On this page" table of contents in a right sidebar (desktop only, ≥1280px). For v1, this is **deferred** — headings alone provide scannability.
- Back-to-top button: appears after scrolling 500px down, fixed position bottom-right. Small circle with ↑ icon. Deferred to v2.

### Feature 2: Search

**Search bar behavior:**
- Input field with a search icon (magnifying glass) on the left, clear (✕) button on the right when text is present.
- Placeholder: "Search articles..."
- Debounce: 300ms before firing search (configurable constant). Immediate on Enter key.
- On focus: subtle border color change to accent.
- Clear button: clicking it clears the input and navigates to `/` (removes query param).
- The search bar is always visible in the header across all pages.

**Search bar in header vs. page body:**
- The header search bar is the primary search entry point. When on the home page, it appears both in the header AND as a larger, more prominent input above the article list. These are the same component, synced via URL search params.
- When navigating from a detail page to search: the user must return to the home page. The header search bar navigates to `/?q=term`.

### Feature 3: Markdown Editing

**Editor layout (desktop ≥768px):**
- Split pane: left 50% textarea, right 50% live preview.
- 1px divider between panes (`border-r border-neutral-200`).
- Minimum editor height: 400px. Grows with content.
- Both panes scroll independently; their scroll positions are NOT synced.

**Editor layout (mobile <768px):**
- Single pane with "Write" / "Preview" tab toggle above.
- Textarea fills available width and height (minimum 300px).
- Preview renders full-width when active tab.
- Tabs are styled as segmented control: two adjacent buttons, active tab has filled background, inactive has transparent background.

**Textarea styling:**
- Monospace font stack: `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace`
- Font size: `text-sm` (0.875rem), line-height: 1.7
- Background: `bg-neutral-50`, border: none (the parent container has the border)
- Padding: `p-4`
- Resize: vertical only (`resize-y`)
- No spellcheck underline styling interference (browser default is fine)
- Tab key: inserts 2 spaces (do NOT move focus). This is important for Markdown editing.

**Preview pane styling:**
- Wrapped in `prose prose-neutral lg:prose-lg max-w-none`
- Padding: `p-4`
- Background: white
- Scrollable independently

**Form validation:**
- **Title required:** "Title is required" — inline error below input, input border turns red (`border-red-500`). Prevent submission.
- **Title too long:** "Title must be 200 characters or fewer" — shown as character count approaches limit. Counter shows `145/200` in muted text below input when within 20% of limit.
- **Content required:** "Content cannot be empty" — inline error below editor. Editor border turns red.
- **Server errors:** Displayed as a banner above the form: "Something went wrong. Please try again." with a neutral-yellow background (`bg-amber-50 border border-amber-200 text-amber-800`).

**Category selector:**
- Native `<select>` element styled to match the design system.
- Options are all existing categories, loaded from the API.
- Default: "No category" (null value).
- For MVP, new categories cannot be created from this form (seeded categories only). The select is NOT a combobox with "create new" functionality.

**Status toggle:**
- Two radio-style buttons (not a checkbox or native radio group visually, but implemented as radio inputs for accessibility).
- "Draft" and "Published" side by side.
- Active option: `bg-neutral-900 text-white`. Inactive: `bg-white text-neutral-600 border border-neutral-300`.
- Labels include a small indicator dot: `● Draft` and `● Published` (dot is green for Published, amber for Draft).
- Default for new articles: Draft selected.

**Saving behavior:**
- On "Publish" or "Save" click: button shows loading spinner, disables all form inputs.
- On success: redirect to the article detail page.
- On validation failure: scroll to first error, focus the errored field.
- On server failure: show error banner, re-enable form.

### Feature 4: Category Organization

**Sidebar category navigation:**
- "All Articles" link at the top (bold when active, matching the home page).
- Category list below, each item showing: category name (link) + article count in a muted badge.
- Active category: `bg-neutral-100 font-semibold`, left border accent (`border-l-2 border-blue-600`).
- Hover on inactive: `bg-neutral-50`.
- Articles with no category are found only via "All Articles" — there is no "Uncategorized" sidebar item in v1.
- Category items are sorted alphabetically.

**Category page heading:**
- Shows category name as `h1`, with article count below: "5 articles".
- Same article card layout as home page.
- Empty state when no articles exist in the category (see UI States).

### Feature 5: Article Status (Draft/Published)

**Visibility rules:**
- **Published articles:** Visible on home page, search results, category pages. Show normal article card.
- **Draft articles:** NOT visible on home page or category pages. Visible via direct URL only (for author preview). NOT returned in search results.
- On article detail page: draft articles show a prominent "Draft" badge in the metadata bar: `bg-amber-100 text-amber-800 border border-amber-200`. Published articles show no status badge (published is the default expectation).

**Draft badge in article card:**
- If a draft article somehow appears in a list (e.g., a "My Drafts" filtered view — deferred to v2), show a "Draft" badge next to the category badge.

**Transition between statuses:**
- Toggling from Draft → Published and saving makes the article immediately appear in list views and search results (via `revalidatePath`).
- Toggling from Published → Draft hides it from those views.
- No confirmation dialog for status changes (the toggle is explicit enough).

---

## Responsive Design

### Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| **Mobile** | <768px | Single column. Sidebar hidden behind hamburger menu. Cards full-width. Editor stacked with tabs. |
| **Tablet** | 768–1023px | Two columns. Sidebar collapsed to hamburger; full-width main content. Editor side-by-side. |
| **Desktop** | ≥1024px | Two columns. Sidebar visible (260px). Main content max-width 960px. Editor side-by-side. |
| **Wide** | ≥1280px | Optional: "On this page" right sidebar for article detail (deferred to v2). |

### Mobile Adaptations

**Header (mobile):**
- Height: 56px (reduced from 64px).
- Layout: App title on left, search icon button on right (expands search bar on tap).
- "New Article" becomes a compact `+` icon button.
- Search bar, when expanded via icon tap, overlays the header full-width with an animated slide-down (150ms ease-out).

**Sidebar (mobile/tablet):**
- Triggered by a hamburger menu icon (☰) in the header, left of the app title on mobile.
- Opens as a slide-out drawer from the left, 280px wide, with a semi-transparent backdrop overlay (`bg-black/30`).
- Close on backdrop tap, Escape key, or close (✕) button in the drawer header.
- Drawer slides in/out with 200ms ease-in-out transition.

**Article cards (mobile):**
- Stack metadata below title instead of right-aligned.
- Full layout: Title (full width) → excerpt (full width) → category badge + timestamp (one row, left-aligned).

**Editor (mobile):**
- Single pane with Write/Preview tabs as described in Feature 3.
- Tab buttons are full-width, equally sized.
- Minimum textarea height: 300px.
- Form buttons stack vertically: Cancel on top, Save/Publish below, full width.

**Pagination (mobile):**
- Simplified: "← Prev" and "Next →" only, no page numbers (to save horizontal space).

### Touch Targets

- All interactive elements (buttons, links, form controls) must have a minimum touch target of **44×44px** per WCAG 2.1 (AAA).
- Article card title links have sufficient padding to meet this.
- Category sidebar items: `py-2` (8px vertical padding) + line height ensures ≥44px height.
- Close buttons, hamburger menu, and search clear button: minimum 44×44px.

---

## Visual Style System

### Color Palette

Neutral-driven with one calm accent. All colors have sufficient contrast (≥4.5:1 for text, ≥3:1 for large text/UI components).

```
CSS Variable              Hex        Usage
--color-neutral-50        #fafafa    Page background, card hover
--color-neutral-100       #f5f5f5    Sidebar active, code backgrounds
--color-neutral-200       #e5e5e5    Borders, dividers
--color-neutral-300       #d4d4d4    Disabled input borders
--color-neutral-400       #a3a3a3    Placeholder text, disabled text
--color-neutral-500       #737373    Secondary text, excerpts
--color-neutral-600       #525252    Body text (slightly softened)
--color-neutral-700       #404040    Emphasis text
--color-neutral-800       #262626    Headings
--color-neutral-900       #171717    Primary text, active states
--color-neutral-950       #0a0a0a    Highest emphasis (sparingly)

--color-accent-50         #eff6ff    Accent tint background
--color-accent-100        #dbeafe    Selected states, info banners
--color-accent-500        #3b82f6    Focus rings, active indicators
--color-accent-600        #2563eb    Link default
--color-accent-700        #1d4ed8    Link hover
--color-accent-800        #1e40af    Link active

--color-success-100       #dcfce7    Success banner bg
--color-success-700       #15803d    Success text

--color-warning-100       #fef3c7    Warning/draft banner bg
--color-warning-700       #a16207    Warning/draft text

--color-danger-100        #fee2e2    Error banner bg, error input bg
--color-danger-500        #ef4444    Error border
--color-danger-600        #dc2626    Destructive button
--color-danger-700        #b91c1c    Error text
```

**Tailwind mapping:** These map directly to Tailwind's built-in `neutral`, `blue`, `green`, `amber`, and `red` scales. No custom colors needed — use Tailwind default scales.

### Typography

**Font stack (UI):** System font stack for speed and zero layout shift.
```
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Font stack (monospace):** For code and Markdown editing.
```
--font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
             'Liberation Mono', monospace;
```

**Type scale:**

| Token | Size / Line-height | Weight | Usage |
|-------|-------------------|--------|-------|
| `text-xs` | 0.75rem / 1rem | 400 | Badges, timestamps, metadata |
| `text-sm` | 0.875rem / 1.25rem | 400 | Excerpts, form helpers, sidebar items |
| `text-base` | 1rem / 1.5rem | 400 | Body text, form inputs, article content |
| `text-lg` | 1.125rem / 1.75rem | 600 | Article card titles |
| `text-xl` | 1.25rem / 1.75rem | 600 | Section headings on list pages |
| `text-2xl` | 1.5rem / 2rem | 700 | Page titles (h1), article titles |
| `text-3xl` | 1.875rem / 2.25rem | 700 | Article title on detail page |

**Prose content (rendered Markdown):** Use Tailwind Typography plugin's `prose` class, which provides its own type scale optimized for long-form reading. Use `prose-neutral` for color and `lg:prose-lg` for larger screens.

### Spacing System

Based on a 4px grid. Use Tailwind's default spacing scale (1 unit = 4px).

| Token | Value | Usage |
|-------|-------|-------|
| `p-1` / `gap-1` | 4px | Tight icon+label spacing |
| `p-2` / `gap-2` | 8px | Compact component padding |
| `p-3` / `gap-3` | 12px | List item internal padding |
| `p-4` / `gap-4` | 16px | Standard card/container padding |
| `p-6` / `gap-6` | 24px | Section spacing |
| `p-8` / `gap-8` | 32px | Page-level padding, major sections |
| `p-12` | 48px | Hero/splash spacing (unlikely needed) |

**Layout spacing:**
- Sidebar width: 260px (`w-[260px]`)
- Main content max-width: 960px (`max-w-4xl` = 896px, close enough)
- Article prose max-width: `prose` provides ~65ch which is ~585px at default font size
- Header height: 64px (`h-16`), 56px on mobile (`h-14`)
- Footer height: 48px (`h-12`)

### Iconography

**Library:** Lucide React (`lucide-react`). All icons are 20px (1.25rem) by default, 16px (1rem) in compact contexts.

| Icon | Usage |
|------|-------|
| `Search` | Search bar icon, search button |
| `Plus` | New Article button (mobile compact) |
| `X` | Clear search, close drawer/modal |
| `Menu` | Hamburger menu (mobile sidebar trigger) |
| `ChevronLeft` | Back navigation, Previous page |
| `ChevronRight` | Next page |
| `Edit` or `Pencil` | Edit article button |
| `Trash2` | Delete button |
| `BookOpen` | App logo/icon |
| `FolderOpen` | Category icon (used sparingly) |
| `AlertCircle` | Error states |
| `FileText` | Empty state — no articles |
| `SearchX` | Empty state — no search results |
| `Check` | Success indicators |
| `Loader2` | Loading spinner (animated) |

Icons are always accompanied by text labels unless space-constrained (mobile header buttons). Icon-only buttons must have `aria-label`.

### Borders & Radius

- **Border radius:** `rounded-lg` (8px) for cards and inputs; `rounded-full` for badges and pills; `rounded-md` (6px) for buttons.
- **Borders:** 1px solid `border-neutral-200` for cards, inputs, and dividers.
- **Focus rings:** `ring-2 ring-accent-500 ring-offset-2` on all interactive elements.

### Shadows

Use sparingly per the no-decoration principle:
- **Cards:** No shadow in default state. `shadow-sm` on hover (cards in list).
- **Header:** `shadow-sm` (1px subtle shadow) to separate from content when sticky.
- **Drawer:** `shadow-lg` for the slide-out sidebar.
- **No elevation-based shadow system.** Two levels max.

---

## UI States

### Article List

| State | Visual |
|-------|--------|
| **Populated** | Article cards rendered with full data. |
| **Loading** | 5 skeleton cards: each a gray pulse-animated block with placeholder shapes for title (w-2/3), excerpt (w-full, 2 lines), badge (w-16). Use `animate-pulse bg-neutral-200`. |
| **Empty (no articles)** | Centered empty state: `FileText` icon (48px, neutral-300), "No articles yet" heading, "Create your first article to get started." body, "Create Article" button linking to `/articles/new`. |
| **Empty (no search results)** | Centered empty state: `SearchX` icon (48px, neutral-300), `No results for "[query]"`, "Try a different search term or browse all articles." body, "Browse all articles" link. |
| **Empty (no category articles)** | Centered empty state: `FolderOpen` icon, `No articles in [Category Name]`, "Articles assigned to this category will appear here." |
| **Error (fetch failure)** | Error banner: "Unable to load articles. [Try again]" with `AlertCircle` icon. The "Try again" is a button that reloads the page. |

### Article Detail

| State | Visual |
|-------|--------|
| **Populated** | Full rendered article with metadata bar. |
| **Loading** | Skeleton: title placeholder (w-3/4, h-8), metadata placeholder (w-1/3, h-4), 8 lines of content placeholders (varying widths). |
| **Not found (404)** | Centered: "Article not found" with `FileText` icon, "The article you're looking for doesn't exist or has been deleted.", "Browse articles" link. Uses Next.js `notFound()` which renders the closest `not-found.tsx`. |
| **Draft article** | Same layout + amber "Draft" badge in metadata bar. A thin amber strip at the top of the content area: "This article is a draft and not visible to others." |
| **Error** | "Unable to load article. [Try again]" banner. |

### Search Bar

| State | Visual |
|-------|--------|
| **Default** | White background, `border-neutral-300`, search icon in neutral-400, placeholder text in neutral-400. |
| **Focused** | Border changes to `border-accent-500`, ring-2 ring-accent-500/20. |
| **With text** | Clear (✕) button appears on the right. |
| **Searching** | Small `Loader2` spinner (animated) replaces the search icon OR appears at the end of the input. |
| **Disabled** | `bg-neutral-100`, cursor not-allowed. |

### Buttons

All buttons use the `Button` component. Three variants:

**Primary** (`variant="primary"`):
```
Default:  bg-neutral-900 text-white
Hover:    bg-neutral-800
Active:   bg-neutral-950
Focus:    ring-2 ring-offset-2 ring-accent-500
Disabled: bg-neutral-300 text-neutral-500 cursor-not-allowed
Loading:  Same as disabled + Loader2 spinner before text
```

**Secondary** (`variant="secondary"`):
```
Default:  bg-white text-neutral-700 border border-neutral-300
Hover:    bg-neutral-50
Active:   bg-neutral-100
Focus:    ring-2 ring-offset-2 ring-accent-500
Disabled: bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed
```

**Danger** (`variant="danger"`):
```
Default:  bg-white text-danger-600 border border-danger-300
Hover:    bg-danger-50
Active:   bg-danger-100
Focus:    ring-2 ring-offset-2 ring-danger-500
Disabled: Same as secondary disabled
```

**Ghost** (`variant="ghost"`):
```
Default:  bg-transparent text-neutral-600
Hover:    bg-neutral-100 text-neutral-900
Active:   bg-neutral-200
Focus:    ring-2 ring-offset-2 ring-accent-500
```

**Sizes:** `sm` (h-8, text-sm, px-3), `md` (h-10, text-sm, px-4), `lg` (h-12, text-base, px-6).

### Form Inputs

**Text Input:**
```
Default:  bg-white border border-neutral-300 rounded-lg px-3 py-2 text-base
Hover:    border-neutral-400
Focus:    border-accent-500 ring-2 ring-accent-500/20
Error:    border-danger-500, error text below
Disabled: bg-neutral-100 text-neutral-500 cursor-not-allowed
```

**Select:**
```
Default:  bg-white border border-neutral-300 rounded-lg px-3 py-2 text-base
          Custom chevron on right (appearance-none + bg chevron icon)
Focus:    border-accent-500 ring-2 ring-accent-500/20
```

**Textarea (Markdown editor):**
```
Default:  bg-neutral-50 border-0 rounded-none font-mono text-sm
          Leading-relaxed, resize-y
Focus:    ring-0 (no ring — the parent container handles the focus style)
```

### Status Toggle (Radio Group)

Implemented as two adjacent buttons that act as a segmented control.

```
Active:   bg-neutral-900 text-white
Inactive: bg-white text-neutral-600 border border-neutral-300
Hover (inactive): bg-neutral-50
Focus:    ring-2 ring-accent-500 (shared across the group)
Disabled: opacity-50 cursor-not-allowed
```

### Badges

**Category badge:**
```
bg-neutral-100 text-neutral-700 text-xs font-medium px-2.5 py-0.5 rounded-full
border border-neutral-200
```

**Status badge — Draft:**
```
bg-warning-100 text-warning-700 text-xs font-medium px-2.5 py-0.5 rounded-full
border border-warning-200
```

**Status badge — Published:** Not shown (published is the default state).

### Pagination

```
Previous (disabled):  text-neutral-400 cursor-not-allowed
Previous (active):    text-accent-600 hover:text-accent-700
Page indicator:       text-sm text-neutral-600 tabular-nums
Next (active):        Same as Previous active
Next (disabled):      Same as Previous disabled
```

### Sidebar

**Category list item:**
```
Default:    text-neutral-700 py-2 px-3 rounded-md flex justify-between
Hover:      bg-neutral-50
Active:     bg-neutral-100 text-neutral-900 font-semibold border-l-2 border-accent-600
Count:      text-xs text-neutral-400 ml-auto
```

**Drawer (mobile):**
- Backdrop: `bg-black/30` fade in (200ms ease-out)
- Drawer: slide from left, `bg-white shadow-lg`, 280px wide
- Close button: top-right corner, 44×44px touch target

### Empty States (Comprehensive)

All empty states use the `EmptyState` component with consistent layout:

```
┌──────────────────────────────────────────┐
│                                          │
│            [Icon: 48px, neutral-300]     │
│                                          │
│         Heading (text-lg, font-semibold) │
│    Description (text-sm, text-neutral-500)│
│                                          │
│         [Action Button or Link]          │
│                                          │
└──────────────────────────────────────────┘
```

| Scenario | Icon | Heading | Description | Action |
|----------|------|---------|-------------|--------|
| No articles | `FileText` | No articles yet | Create your first article to get started. | Create Article → `/articles/new` |
| No search results | `SearchX` | No results for "[query]" | Try a different search term or browse all articles. | Browse all articles → `/` |
| No category articles | `FolderOpen` | No articles in [Category] | Articles assigned to this category will appear here. | Browse all articles → `/` |
| Article not found | `FileQuestion` | Article not found | The article you're looking for doesn't exist or has been deleted. | Browse articles → `/` |
| Server error | `AlertCircle` | Something went wrong | We couldn't complete your request. Please try again. | Try again (reload) |

---

## Accessibility

### Color Contrast

All text/background combinations must meet **WCAG 2.1 AA** minimum:
- **Normal text (<18px):** ≥4.5:1 contrast ratio
- **Large text (≥18px or ≥14px bold):** ≥3:1 contrast ratio
- **UI components and graphical objects:** ≥3:1

**Key combinations and their ratios (using Tailwind neutral + blue scales):**
- Body text (`neutral-600` on white): ~5.5:1 ✓
- Headings (`neutral-900` on white): ~16.7:1 ✓
- Secondary text (`neutral-500` on white): ~4.6:1 ✓
- Placeholder (`neutral-400` on white): ~3.6:1 — this is borderline. Use `neutral-500` in inputs instead for better contrast.
- Links (`accent-600` on white): ~5.4:1 ✓
- Draft badge (`warning-700` on `warning-100`): ~5.7:1 ✓
- Error text (`danger-700` on white): ~5.1:1 ✓
- Primary button text (white on `neutral-900`): ~16.7:1 ✓

### Keyboard Navigation

**Focus order (home page):**
1. Skip-to-content link (visually hidden, appears on focus)
2. App title/logo link
3. Search input
4. New Article button
5. Sidebar navigation (desktop) or hamburger menu button (mobile)
6. Article card title links (in document order)
7. Pagination controls
8. Footer

**Focus order (article detail):**
1. Skip-to-content
2. App title/logo
3. Search input
4. New Article button
5. Back to articles link
6. Edit button
7. Article content (links within rendered Markdown, in document order)
8. Footer

**Keyboard interactions:**
- **Tab / Shift+Tab:** Move focus forward/backward through interactive elements.
- **Enter / Space:** Activate buttons and links.
- **Escape:** Close sidebar drawer, clear search focus, close any overlays.
- **Arrow keys:** Navigate select dropdown options.
- **Ctrl+Enter / Cmd+Enter:** Submit the article form from within the textarea (nice-to-have for v2).

**Visible focus indicators:**
- All interactive elements show `ring-2 ring-accent-500 ring-offset-2` on `:focus-visible`.
- Use `focus-visible:` variant, NOT `focus:`. This prevents focus rings on mouse clicks.
- No `outline: none` anywhere (Tailwind's `focus-visible:ring-2` adds rings without removing default outlines in unsupported browsers).

### Screen Reader Guidance

**Landmarks:**
- `<header>` with `role="banner"` for the top bar
- `<nav>` with `aria-label="Main navigation"` for the sidebar
- `<main>` for content area
- `<footer>` with `role="contentinfo"`
- `<form>` with `aria-label` (e.g., "Create article", "Edit article")
- `<section>` with `aria-label="Search results"` when search is active

**Labels:**
- Search input: `<label class="sr-only">Search articles</label>` associated via `htmlFor`
- Icon-only buttons: `aria-label` (e.g., `aria-label="New article"`, `aria-label="Clear search"`, `aria-label="Open menu"`, `aria-label="Close menu"`)
- Article card: Title is the name — no extra label needed.
- Status toggle: Each radio has a `<label>`.
- Category select: Associated `<label>`.
- Pagination: `aria-label="Pagination"` on the nav element; `aria-label="Page X"` and `aria-current="page"` on current page.

**Live regions:**
- Search results: Use `aria-live="polite"` on the results container so screen readers announce when new results load.
- Form errors: Use `role="alert"` on the error banner and `aria-describedby` on errored inputs pointing to their inline error messages.
- Loading states: `aria-busy="true"` on skeleton containers.

**Article content:**
- `react-markdown` renders semantic HTML (`h1`-`h6`, `<p>`, `<ul>`, `<ol>`, `<table>`, `<code>`, `<pre>`, `<blockquote>`, etc.). No extra ARIA needed.
- Images in Markdown: always include `alt` text. If none is provided, `react-markdown` should be configured to set `alt=""` for decorative images (default behavior).
- Links in rendered Markdown: `target="_blank"` should include `rel="noopener noreferrer"` (configure in `react-markdown` link renderer).

### Skip-to-Content Link

```
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-accent-500">
  Skip to content
</a>
```

Target: `<main id="main-content">`.

### Reduced Motion

Respect `prefers-reduced-motion`:
- Sidebar drawer transition (200ms) → 0ms (instant)
- Skeleton pulse animation → static
- Loading spinner → static icon
- Any hover transitions → instant

Use Tailwind's `motion-safe:` and `motion-reduce:` prefixes.

---

## Handoff Notes

### Component Inventory

These components should be built in `src/components/` as described in the architecture spec. Below are the design tokens and key props for each.

| Component | File | Key Props | Notes |
|-----------|------|-----------|-------|
| `Button` | `ui/button.tsx` | `variant: 'primary' \| 'secondary' \| 'danger' \| 'ghost'`, `size: 'sm' \| 'md' \| 'lg'`, `loading: boolean`, `disabled: boolean` | Renders `<button>`. Use `clsx` for variant classes. Loading state shows `Loader2` spinner. |
| `Input` | `ui/input.tsx` | `label: string`, `error?: string`, `hint?: string`, all native `<input>` props | Renders label + input + error/hint. `aria-describedby` for errors. |
| `Badge` | `ui/badge.tsx` | `variant: 'neutral' \| 'warning' \| 'success'`, `children` | Small pill. Use for categories (neutral) and draft status (warning). |
| `EmptyState` | `ui/empty-state.tsx` | `icon: LucideIcon`, `title: string`, `description: string`, `action?: { label: string, href: string }` | Centered layout. Icon is 48px in neutral-300. |
| `MarkdownEditor` | `ui/markdown-editor.tsx` | `initialContent?: string`, `onChange: (content: string) => void`, `error?: string` | Split-pane on desktop, tabbed on mobile. The parent form owns the content state. |
| `ArticleCard` | `articles/article-card.tsx` | `article: { title, slug, excerpt, category, status, updatedAt }` | Card for list views. Title links to `/articles/[slug]`. |
| `ArticleList` | `articles/article-list.tsx` | `articles: Article[]`, `loading?: boolean` | Maps articles to ArticleCards or renders skeleton/empty. |
| `ArticleForm` | `articles/article-form.tsx` | `mode: 'create' \| 'edit'`, `initialData?: Article`, `categories: Category[]` | Full form with title, category, status, editor, and submit buttons. |
| `SearchBar` | `search/search-bar.tsx` | `initialQuery?: string` | Debounced input with search icon, clear button, and loading state. Syncs to URL query params. |
| `CategoryNav` | `categories/category-nav.tsx` | `categories: Category[]`, `activeSlug?: string` | Sidebar navigation list. |
| `Header` | `layout/header.tsx` | — | Sticky top bar with title, SearchBar, New Article button, and mobile menu toggle. |
| `Sidebar` | `layout/sidebar.tsx` | `categories: Category[]`, `activeSlug?: string` | Desktop: persistent sidebar. Mobile/tablet: slide-out drawer. |
| `Footer` | `layout/footer.tsx` | — | Minimal footer. |
| `Pagination` | `ui/pagination.tsx` | `page: number`, `totalPages: number`, `baseUrl: string` | Previous/Next with page indicator. Uses URL query params. |

### CSS Variables / Design Tokens

Define these in `src/app/globals.css` under the `@layer base`:

```css
@layer base {
  :root {
    /* Typography */
    --font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
                 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas,
                 'Liberation Mono', monospace;

    /* Spacing scale: use Tailwind defaults (0.25rem increments) */
    --sidebar-width: 260px;
    --header-height: 64px;
    --header-height-mobile: 56px;
    --content-max-width: 960px;

    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-normal: 200ms ease;

    /* Z-index scale */
    --z-sidebar-backdrop: 40;
    --z-sidebar-drawer: 50;
    --z-header: 30;
    --z-skip-link: 60;
  }
}
```

Most styling should use Tailwind utility classes directly. These CSS variables are for values that need to be referenced across components (e.g., header height for sticky offset calculations).

### Implementation Order (Component Build Sequence)

For the developer:

1. **Design tokens & globals:** Set up `globals.css` with base styles, font stacks, focus ring defaults.
2. **Base UI components:** `Button`, `Input`, `Badge`, `EmptyState` — these have no data dependencies.
3. **Layout shell:** `Header`, `Sidebar`, `Footer`, root `layout.tsx` with proper HTML structure.
4. **ArticleCard + ArticleList:** Can be built with mock data before API routes exist.
5. **SearchBar:** Client component with debounce, URL param sync.
6. **CategoryNav:** Sidebar content, category links.
7. **MarkdownEditor:** Split-pane editor with write/preview tabs for mobile.
8. **ArticleForm:** Compose Input + Select + StatusToggle + MarkdownEditor.
9. **Page assembly:** Wire Server Components to Prisma, Client Components to Server Actions.
10. **Error boundaries & 404 pages:** `error.tsx`, `not-found.tsx` at route levels.
11. **Pagination:** Add to list pages.
12. **Polish:** Responsive testing, keyboard navigation audit, empty state verification.

### Example: Button CSS Class Construction

```typescript
// src/components/ui/button.tsx
const baseClasses = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variantClasses = {
  primary: "bg-neutral-900 text-white hover:bg-neutral-800 active:bg-neutral-950",
  secondary: "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 active:bg-neutral-100",
  danger: "bg-white text-red-600 border border-red-300 hover:bg-red-50 active:bg-red-100",
  ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200",
};

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};
```

### Example: Focus Ring Configuration

Add to `globals.css`:

```css
@layer base {
  * {
    /* Use focus-visible only — no rings on mouse clicks */
    @apply focus:outline-none;
  }
}
```

Then use `focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2` on all interactive elements.

### Image Handling in Markdown

`react-markdown` should be configured to:
- Not render raw HTML (`allowedElements` or `rehype-sanitize`)
- Open external links in new tabs with `rel="noopener noreferrer"`
- This is a code concern, but the design expectation is that images in articles are rendered at `max-width: 100%` and `height: auto` (provided by `prose` class).

---

## Decisions Log

| # | Decision | Alternatives Considered | Rationale |
|---|----------|------------------------|-----------|
| 1 | **Markdown editor (textarea + preview) over WYSIWYG** | TipTap, Lexical, Slate, or TinyMCE | Simpler implementation, no heavy client-side dependency, version-control-friendly content, brief explicitly permits either. The textarea approach is more reliable and bug-resistant. |
| 2 | **Split-pane editor on desktop, tabbed on mobile** | Stacked always, or side-by-side always | Side-by-side provides the best writing UX at wider widths; stacking with tabs prevents cramped panes on narrow screens. The tab toggle is a well-established mobile pattern. |
| 3 | **Neutral color palette with blue accent** | Green accent (calm), warm gray, or brand color | Blue is universally associated with trust and information; neutral grays keep the interface calm and content-focused. No brand colors exist for this internal tool. |
| 4 | **Search via URL query params, not live-filter with client state** | Client-side filter of loaded articles, or dropdown search results | URL state makes searches shareable, back-button-friendly, and stateless. It also aligns with Server Component architecture where data is fetched server-side. The 300ms debounce keeps it feeling responsive. |
| 5 | **Categories in sidebar (persistent navigation) rather than a filter dropdown** | Filter bar above article list, or tag cloud | Persistent sidebar navigation reduces clicks to switch categories, provides at-a-glance context about what categories exist, and gives article counts as navigational hints. |
| 6 | **Radio-group status toggle instead of a select dropdown** | Select dropdown with 2 options, or toggle switch | A two-segment toggle makes the binary choice explicit and discoverable. It's visually heavier than a select but communicates the draft/published state more clearly, which matters for authors. |
| 7 | **No "On this page" TOC in v1** | Auto-generated table of contents sidebar on article detail | The brief targets a small article set; a TOC adds complexity without proportional value. Headings are scannable on their own for typical article lengths. Can add in v2. |
| 8 | **`focus-visible` rings rather than `focus` rings** | Always-visible focus rings, or no custom focus styles | `focus-visible` provides accessibility for keyboard users without showing rings on mouse clicks, which many users find visually distracting. The brief says "calm" — this is a calmer default. |
| 9 | **System font stack over a web font** | Inter, Source Serif, or IBM Plex | Zero layout shift, zero download cost, native rendering quality, and the design brief doesn't call for distinctive branding. System fonts perform well and read comfortably. |
| 10 | **Sticky header over static header** | Static header that scrolls away | The search bar and "New Article" button are primary actions that should be reachable from any scroll position, especially on long articles. The 64px fixed bar is an acceptable tradeoff. |
| 11 | **No confirmation dialog on status change** | Confirm dialog: "Change status to draft? This will hide the article." | The toggle is explicit enough that accidental changes are unlikely. A dialog adds friction to a common authoring action. The undo path (toggle back + save) is trivial. |
| 12 | **20 articles per page** | 10, 25, 50, or infinite scroll | 20 is a common default that balances load time with browsing convenience. Pagination is preferred over infinite scroll for a knowledge base where users may want to find a specific article by position or page. |

---

*This spec is complete and ready for implementation. All design decisions are resolved. A developer should be able to implement the full UI without making additional design choices.*
