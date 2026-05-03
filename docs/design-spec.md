# UX/Design Direction Spec: Knowledge Base App (v1)

## 0. Design Philosophy

The interface should feel **calm, readable, and information-dense** without being cluttered. All design decisions flow from three priorities:

1. **Search-first navigation** — users should always be one keystroke away from finding an answer.
2. **Low-friction list↔detail transitions** — browsing and reading articles should feel continuous, not like page reloads.
3. **Fast create/edit flows** — writing should start immediately, with no multi-step wizards.

The target audience is internal team members who need to find or update knowledge quickly, not marketing audiences or enterprise administrators.

---

## 1. Layout and Page Flows

### 1.1 Application Shell

The app uses a **single-page application** layout with a persistent header and a content area that swaps between views.

```
┌─────────────────────────────────────────────────────┐
│  [Logo] KB                [Search bar ⌘K]    [+ New]│  ← Header (fixed, 56px)
├─────────────────────────────────────────────────────┤
│                                                      │
│                  Content area                        │
│            (swaps between views)                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Header (56px height, fixed top):**
- **Left**: App name or logo text "KB" in Inter 700, 18px. Links to the browse view.
- **Center**: Search input (described below). On desktop, occupies ~400px width.
- **Right**: "+ New" button (primary CTA, 32px height). Opens the create/editor view.

### 1.2 Browse View (Home / Default Route: `/`)

A two-column layout: sidebar + article list.

```
┌──────────────┬─────────────────────────────────────┐
│ Sidebar      │ Article List                        │
│ (240px)      │ (flex: 1, max ~800px)              │
│              │                                     │
│  Categories  │  ┌─────────────────────────────┐   │
│  ──────────  │  │ Article 1                   │   │
│  All (12)    │  │ Short preview excerpt...     │   │
│  Getting     │  │ Category · 2h ago           │   │
│    Started   │  └─────────────────────────────┘   │
│  API         │  ┌─────────────────────────────┐   │
│  Troublesh.  │  │ Article 2                   │   │
│              │  │ Short preview excerpt...     │   │
│              │  │ Category · 1d ago           │   │
│              │  └─────────────────────────────┘   │
│              │                                     │
│  ──────────  │  [Load more / pagination]           │
│  (v2) Tags   │                                     │
│              │                                     │
└──────────────┴─────────────────────────────────────┘
```

**Sidebar (240px, visible on desktop ≥768px):**
- **"Categories"** heading (12px uppercase, tracking 0.05em, muted text).
- Category list items: name + article count badge. Selected category is highlighted with accent background.
- "All" is always first, shows total count.
- On tablet (768–1023px): sidebar collapses behind a hamburger toggle (☰) in the header.
- On mobile (<768px): sidebar becomes a slide-out drawer.

**Article List (main content):**
- Each article card is clickable, ~80px min-height.
- Card layout: **Title** (16px semibold) → **Preview** (14px, muted, truncated to 2 lines) → **Meta row** (12px muted: category name, relative timestamp).
- Hover: subtle background fill (`var(--color-surface-hover)`).
- Selected/active: left border accent (`2px solid var(--color-accent)`) with fill (`var(--color-surface-active)`).
- Clicking a card navigates to the detail view (SPA route transition).

**Empty State (no articles):**
- Centered in the article list area with 64px vertical padding.
- Icon: `📄` or a simple SVG doc-with-plus illustration.
- Title: "No articles yet" (18px semibold).
- Description: "Create your first article to get started." (14px muted).
- CTA: "Create article" button (primary).

### 1.3 Article Detail View (Route: `/articles/:id`)

A reading-focused layout, single-column with a max-width for readability.

```
┌─────────────────────────────────────────────────────┐
│  [Logo] KB                [Search bar ⌘K]    [+ New]│
├─────────────────────────────────────────────────────┤
│  ← Back to list                                     │
│                                                     │
│          Article Title (24–30px, bold)              │
│                                                     │
│  Category · Updated 2h ago · by Author              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                     │
│          Rendered article content body              │
│          (prose, max-width 72ch)                    │
│                                                     │
│                                                     │
│  [Edit] button                                      │
└─────────────────────────────────────────────────────┘
```

**Navigation:**
- **"← Back"** link above the title returns to browse view, preserving scroll position and any active Category filter.
- Content is rendered from Markdown to HTML and styled as prose.

**Article content rendering (prose styles):**
- All rendered Markdown elements get `class="kb-prose"` with the following:
  - `<h1>`: 24px bold (same as title—avoid in article body; use h2+).
  - `<h2>`: 20px semibold, margin-top 32px.
  - `<h3>`: 16px semibold, margin-top 24px.
  - `<p>`: 16px, line-height 1.75, margin-bottom 16px.
  - `<code>` (inline): `var(--color-surface-elevated)` bg, 13px monospace, rounded 4px, padding 2px 6px.
  - `<pre><code>`: full-width block, `var(--color-surface-elevated)` bg, rounded 8px, padding 16px, overflow-x auto, font 14px monospace.
  - `<ul> / <ol>`: padding-left 24px, line-height 1.75.
  - `<blockquote>`: left border 3px solid `var(--color-border-accent)`, padding-left 16px, font-style italic, color muted.
  - `<table>`: full width, alternating row backgrounds, header row with semibold text.
  - `<a>`: accent color, underline on hover.
  - `<hr>`: `var(--color-border)` line, margin 32px 0.
  - `<img>`: max-width 100%, rounded 8px.

**Empty State (article deleted/not found):**
- "This article no longer exists" with a link back to the browse view.

### 1.4 Create/Edit View (Route: `/articles/new` or `/articles/:id/edit`)

An editor-focused layout with Markdown preview. On desktop, a **split-pane** layout. On mobile, tabbed.

**Desktop split-pane (≥1024px):**

```
┌──────────────┬────────────────────────┬──────────────┐
│              │ Editor                 │ Preview      │
│              │                        │              │
│  Title:      │ ┌────────────────────┐ │ # Heading    │
│  [________]  │ │ **Bold text**...   │ │ Body text    │
│              │ │ More content...    │ │              │
│              │ │                    │ │              │
│              │ └────────────────────┘ │              │
│              │                        │              │
│              │ [Discard]  [Save]      │              │
└──────────────┴────────────────────────┴──────────────┘
```

**Layout breakdown:**
- Left column (400px max):
  - **Title input**: Large text input (~24px, no placeholder chrome), placeholder "Article title".
  - Below title: metadata fields (v2: category selector).
- Middle column (flex): Markdown text area.
  - Monospace font, 15px, line-height 1.8.
  - Tab key inserts 2 spaces.
  - Minimum 300px height, auto-expand.
- Right column (flex): Live preview pane, styled identically to the article detail view (reuses `kb-prose` class).
- Bottom row: **Discard** (tertiary) and **Save** (primary) buttons, right-aligned.

**Mobile tabbed (<1024px):**
- Full-width title input at top.
- Two tabs below: **✏️ Write** | **👁️ Preview**
- Active tab shows editor OR preview, not both.
- Bottom action bar (sticky): Discard | Save.

**Validation & error states:**

| State | Behavior |
|-------|----------|
| Title empty on save | Inline red text below title: "Title is required." Input border turns `var(--color-error)`. Title input receives focus. |
| Content empty on save | Inline red text below editor: "Article content is required." |
| Save failure (network) | Toast notification: "Failed to save. Please try again." with [Retry] action. Editor content is preserved. |
| Save success | Redirect to article detail view. Brief toast: "Article saved." (auto-dismiss after 2s). |
| Unsaved changes on navigation | Browser `beforeunload` confirmation on page close. In-app navigation shows a confirmation modal: "You have unsaved changes. Discard or stay here?" with [Stay] and [Discard] options. |

**Discard behavior:**
- Browse view: returns to browse, content lost.
- Edit view: returns to detail view, changes lost. Shows confirmation modal if modifications detected.

### 1.5 Search Experience

Search is **always available** in the header as an input field.

**Search Input States:**

| State | Appearance |
|-------|------------|
| Default | 40px height, rounded 8px, `var(--color-surface)` background, `var(--color-border)` border, placeholder "Search articles…", 14px. |
| Focused | Border highlights to `var(--color-accent)`, subtle ring (`box-shadow: 0 0 0 3px var(--color-accent-subtle)`). |
| Typing (has query) | Results dropdown appears below. |
| Empty query with focus | Dropdown hidden. |
| No results for query | Dropdown shows "No results for 'xyz'" with a clear icon. |

**Search Results Dropdown:**
- Appears below the search input, max 360px width (or full width on mobile), max 8 results visible + scroll.
- Each result: **Title** (14px semibold) with matching query text highlighted in `var(--color-accent-subtle)` bg → **Preview snippet** (12px muted, with ellipsis) → **Category** (11px muted).
- Keyboard navigation: `↑`/`↓` arrow keys move highlight. `Enter` opens selected article. `Escape` closes dropdown and returns focus to search input.
- Clicking a result navigates to that article's detail view.
- On mobile: results appear in a full-width overlay with a close button.

### 1.6 Navigation Summary

| From | Action | To |
|------|--------|-----|
| Any page | Click logo | Browse view (`/`) |
| Any page | Type in search | Search results (dropdown or overlay on mobile) |
| Browse | Click article | Detail view (`/articles/:id`) |
| Browse | Click "+ New" | Create view (`/articles/new`) |
| Detail | Click "← Back" | Browse view |
| Detail | Click "Edit" | Edit view (`/articles/:id/edit`) |
| Create/Edit | Click "Save" and succeed | Detail view |
| Create | Click "Discard" | Browse view |
| Edit | Click "Discard" | Detail view |
| Any page | Press `⌘K` / `Ctrl+K` | Focus search input |

---

## 2. Feature UX Decisions

### 2.1 Article Browsing

- **Default view**: Shows all articles, sorted by most recently updated first.
- **Paging/scrolling**: Load 20 articles per page with a "Load more" button (not infinite scroll) to keep it predictable and low-friction. If fewer than 20 exist, show all.
- **Active filter state**: When a category filter is active (v2), show a filter chip ("Category: X" with × to clear) above the article list.
- **Loading state**: While articles are being fetched, show a skeleton of 5 article cards (animated gray bars) rather than a spinner. Each skeleton card matches the card layout: title bar (60%), preview lines (100%, 80%), meta line (40%).

### 2.2 Search

- **Implementation preference**: Client-side debounce of 200ms before triggering search. On first keystroke, show results. This balances responsiveness with server load.
- **Search across**: Both title and content. Title matches rank above content matches. The dropdown results show title always, with a snippet of matching content.
- **Empty search result**: "No results for 'xyz'" — offer no auto-suggestions in v1.
- **Search on mobile**: When input gets focus on mobile, open a full-screen overlay with the search bar at the top and results below. This gives more room and avoids the on-screen keyboard covering results.

### 2.3 Create/Edit (Markdown Editor)

- **Why Markdown over WYSIWYG**: Simpler to implement, reliable, no heavy library dependencies, easy to store as plain text, works offline, and the target audience (internal technical team) is comfortable with Markdown.
- **Toolbar**: Minimal toolbar above the editor with: **B**, *I*, `code`, heading (H2, H3), list (ordered/unordered), code block, link, image, quote, divider. These represent the most-used Markdown shortcuts for the target audience. The toolbar is optional in v1; if included, it should render as a simple flat row of icon buttons.
- **Keyboard shortcuts**:
  - `⌘S` / `Ctrl+S`: Save (if in editor)
  - `⌘K` / `Ctrl+K`: Focus search
  - `Esc`: Close search dropdown / close confirmation modal
- **Autosave**: Not in v1. Manual save only. Avoids complexity of conflict resolution.
- **Edit history**: Not in v1.
- **Maximum article size**: No client-side limit. Server should enforce a reasonable limit (e.g., 100KB per article). If exceeded on save, show error toast.

### 2.4 Reading Experience (Article Detail View)

- **Reading width**: Content max-width is `72ch` (~680px at 16px base) — optimal for readability. Centered within the available space.
- **Scroll behavior**: On navigation to detail view, scroll to top. "← Back" link preserves browse view scroll position.
- **Last-modified notice**: If viewing an article that was recently edited (within last 24h), show a subtle "Edited Xh ago" in the meta row to signal freshness.

---

## 3. Responsive Design

### 3.1 Breakpoints

| Name | Width | Target |
|------|-------|--------|
| Mobile | < 768px | Phones |
| Tablet | 768–1023px | Tablets, small laptops |
| Desktop | ≥ 1024px | Laptops, monitors |

### 3.2 Layout Adaptations

| Component | Mobile (<768px) | Tablet (768–1023px) | Desktop (≥1024px) |
|-----------|------------------|----------------------|-------------------|
| Sidebar | Hidden; accessible via hamburger ☰ (opens slide-out drawer) | Hidden; accessible via hamburger ☰ | Always visible, 240px fixed |
| Header search | Full-width in hamburger overlay when active; 32px height in header | Search bar visible, 36px height | Search bar visible, 40px height |
| Article list | Single column, full width | Single column, max 600px, centered | Single column, max 700px |
| Split-pane editor | Tabbed: Write / Preview | Split pane with narrower columns (editor 50%, preview 50%) | Split pane (editor 400px title + content area, preview fills remaining) |
| Detail view content | Full width with 16px padding | Max 600px, centered | Max 72ch, centered |
| "+ New" button | Icon only (+) in header | Full text "+ New" | Full text "+ New" |

### 3.3 Mobile Interaction Patterns

- **Touch targets**: Minimum 44×44px for all interactive elements (buttons, links, cards) per WCAG 2.5.5.
- **Article cards on mobile**: Tapping anywhere on the card opens the article. No separate "tap target" — the entire card is the hit area.
- **Swipe**: Not implemented in v1. Use explicit navigation only.
- **Search overlay on mobile**: Opens as a bottom sheet (slides up from bottom, 90vh height) with a close handle at the top. Search input is pinned to the top.

### 3.4 Tablet-Specific

- On tablet, the sidebar drawer slides in from the left over the content with a semi-transparent backdrop. Tapping the backdrop closes it.
- The split-pane editor uses a 50/50 layout with a collapsible preview (drag divider not in v1; just fixed split).

---

## 4. Visual Style System

### 4.1 Design Tokens (CSS Custom Properties)

```css
:root {
  /* ── Colors ── */
  --color-bg:          #F8F9FA;
  --color-surface:     #FFFFFF;
  --color-surface-hover: #F1F3F5;
  --color-surface-active: #E7EDF3;
  --color-surface-elevated: #F1F3F5;
  --color-border:      #DEE2E6;
  --color-border-strong: #ADB5BD;
  --color-border-accent: #4A90D9;

  --color-text:        #1A1A2E;
  --color-text-secondary: #5C6370;
  --color-text-muted:  #868E96;
  --color-text-inverse: #FFFFFF;

  --color-accent:      #3B82F6;
  --color-accent-hover: #2563EB;
  --color-accent-subtle: #DBEAFE;

  --color-error:       #DC2626;
  --color-error-bg:     #FEF2F2;
  --color-success:     #16A34A;
  --color-success-bg:   #F0FDF4;
  --color-warning:     #D97706;
  --color-warning-bg:   #FFFBEB;

  /* ── Typography ── */
  --font-sans:         'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:         'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace;

  --text-xs:           12px;
  --text-sm:           14px;
  --text-base:         16px;
  --text-lg:           18px;
  --text-xl:           20px;
  --text-2xl:          24px;
  --text-3xl:          30px;

  --leading-tight:     1.25;
  --leading-normal:    1.5;
  --landing-relaxed:   1.75;

  /* ── Spacing ── */
  --space-1:           4px;
  --space-2:           8px;
  --space-3:           12px;
  --space-4:           16px;
  --space-5:           20px;
  --space-6:           24px;
  --space-8:           32px;
  --space-10:          40px;
  --space-12:          48px;
  --space-16:          64px;

  /* ── Borders & Radius ── */
  --radius-sm:         4px;
  --radius-md:         8px;
  --radius-lg:         12px;
  --radius-full:       9999px;

  /* ── Shadows ── */
  --shadow-sm:         0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:         0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg:         0 10px 15px rgba(0,0,0,0.1);
  --shadow-focus:      0 0 0 3px var(--color-accent-subtle);
  --shadow-dropdown:   0 4px 16px rgba(0, 0, 0, 0.12);

  /* ── Transitions ── */
  --duration-fast:     150ms;
  --duration-normal:   200ms;
  --easing-default:    ease;

  /* ── Z-indices ── */
  --z-header:          100;
  --z-dropdown:        200;
  --z-drawer:          300;
  --z-modal:           400;
  --z-toast:           500;
}
```

### 4.2 Color Palette Reference

| Token | Hex | Usage | WCAG AA on #FFFFFF |
|-------|-----|-------|---------------------|
| `--color-text` | #1A1A2E | Primary text, headings | 15.4:1 ✅ |
| `--color-text-secondary` | #5C6370 | Secondary labels, meta | 5.5:1 ✅ |
| `--color-text-muted` | #868E96 | Placeholder, captions, inactive | 3.8:1 ❌ (not used alone for readable text; only metadata below 14px is not required for AA, but use at 14px+ where possible) |
| `--color-accent` | #3B82F6 | Links, buttons, focus rings | 3.0:1 ❌ (use for interactive elements with shape/context, not as sole indicator; passes on dark backgrounds) |
| `--color-accent-subtle` | #DBEAFE | Accents, highlights, subtle backgrounds | — (background tint) |
| `--color-error` | #DC2626 | Validation errors, destructive | 5.0:1 ✅ |
| `--color-success` | #16A34A | Success states | 3.8:1 on white; use with icon or for non-critical success feedback |

**Note**: The accent color is used primarily for interactive elements (buttons, links, focus rings) where shape and position also communicate intent, so the contrast ratio is acceptable under WCAG's "meaning is not conveyed by color alone" guideline. For text on `--color-accent` backgrounds, use `--color-text-inverse` (white) to achieve 5.6:1 ratio.

### 4.3 Typography Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-3xl` | 30px | 700 | 1.25 | Page hero titles |
| `--text-2xl` | 24px | 700 | 1.25 | Article detail title |
| `--text-xl` | 20px | 600 | 1.25 | Section headings (H2 in prose) |
| `--text-lg` | 18px | 600 | 1.5 | Card titles (large), sidebar headings |
| `--text-base` | 16px | 400 | 1.75 | Body text, article content |
| `--text-sm` | 14px | 400 | 1.5 | Card previews, input text, meta |
| `--text-xs` | 12px | 500 | 1 | Category labels, badges, timestamps |

### 4.4 Spacing System

All spacing uses the `--space-*` scale above. Margins and padding should only use values from this scale to maintain consistency. Gaps between components follow:
- Inline elements: `var(--space-2)`
- Card internal padding: `var(--space-4)`
- Card-to-card gap: `var(--space-2)`
- Section-to-section: `var(--space-6)` to `var(--space-8)`
- View padding: `var(--space-6)` on desktop, `var(--space-4)` on mobile

### 4.5 Iconography

Use a minimal, line-icon set. Recommended: **Lucide Icons** (`lucide-react` or standalone SVG) — lightweight, consistent, and open-source.

| Icon | Usage |
|------|-------|
| `Search` | Search input prefix (16px) |
| `Plus` | Create article button (16px) |
| `ArrowLeft` | Back navigation (16px) |
| `Edit/ Pencil` | Edit article button (16px) |
| `Menu` | Hamburger sidebar toggle (20px) |
| `X` | Close modal, clear filter chip (16px) |
| `FileText` | Empty state document icon (48px) |
| `Bold` | Editor toolbar (16px) |
| `Italic` | Editor toolbar (16px) |
| `Code` | Editor toolbar (16px) |
| `List` / `ListOrdered` | Editor toolbar (16px) |
| `Link` | Editor toolbar (16px) |
| `Check` | Success state indicator (16px) |
| `AlertTriangle` | Error state indicator (16px) |
| `ChevronDown` | Dropdown indicators (12px) |
| `ExternalLink` | Open in preview (16px) |

All icons should use `currentColor` for the stroke color and inherit from the parent element's text color.

---

## 5. UI States

### 5.1 Button States

#### Primary Button ("Save", "Create article")

| State | Background | Text | Border | Notes |
|-------|------------|------|--------|-------|
| Default | `--color-accent` | `--color-text-inverse` | none | |
| Hover | `--color-accent-hover` | `--color-text-inverse` | none | |
| Focus | `--color-accent` | `--color-text-inverse` | `0 0 0 3px var(--color-accent-subtle)` | |
| Active | `--color-accent-hover` | `--color-text-inverse` | darkened inner shadow | Pressed effect |
| Disabled | `--color-border-strong` | `rgba(255,255,255,0.6)` | none | `pointer-events: none`, `cursor: not-allowed` |
| Loading | `--color-accent` | transparent | none | Show 16px spinner in center; button width is fixed; `aria-busy="true"` |

#### Secondary/Tertiary Button ("Discard", "Back")

| State | Background | Text | Border | Notes |
|-------|------------|------|--------|-------|
| Default | transparent | `--color-text-secondary` | none | |
| Hover | `--color-surface-hover` | `--color-text` | none | |
| Focus | transparent | `--color-text` | `--shadow-focus` | |
| Disabled | transparent | `--color-text-muted` | none | |

### 5.2 Card States (Article Cards in List)

| State | Background | Border | Shadow | Other |
|-------|------------|--------|--------|-------|
| Default | `--color-surface` | `1px solid var(--color-border)` | none | `cursor: pointer` |
| Hover | `--color-surface-hover` | `1px solid var(--color-border)` | `--shadow-sm` | |
| Focus (keyboard) | `--color-surface-hover` | `2px solid var(--color-accent)` | `--shadow-focus` | `outline: none` |
| Active/Selected | `--color-surface-active` | `2px solid var(--color-accent)` left border | none | Persistent after click on desktop split view |
| Loading (skeleton) | `--color-surface-elevated` with animated gradient | `1px solid var(--color-border)` | none | Shimmer animation: `0 → 100%` background position over 1.5s |

### 5.3 Input States (Title, Search, Textarea)

| State | Background | Border | Shadow | Notes |
|-------|------------|--------|--------|-------|
| Default | `--color-surface` or `--color-surface-elevated` | `1px solid var(--color-border)` | none | |
| Focus | `--color-surface` | `1px solid var(--color-accent)` | `--shadow-focus` | Remove default browser outline |
| Hover (not focused) | `--color-surface` | `1px solid var(--color-border-strong)` | none | |
| Error | `--color-error-bg` | `1px solid var(--color-error)` | `0 0 0 3px rgba(220, 38, 38, 0.1)` | |
| Disabled | `--color-surface-elevated` | `1px solid var(--color-border)` | none | `opacity: 0.6`, `cursor: not-allowed`, `aria-readonly="true"` |
| Success | `--color-success-bg` | `1px solid var(--color-success)` | none | Brief show after validation passes |

### 5.4 Page-Level States

| View | State | Display |
|------|-------|---------|
| Browse | Loading | Skeleton cards (5 items). Animate with shimmer. No spinner. |
| Browse | Empty | Centered empty state with icon, title, description, and CTA button. |
| Browse | Error | Centered message: "Something went wrong loading articles." with [Retry] button. |
| Detail | Loading | Skeleton: Title bar (full width), meta line, then 4–6 lines of varying width (80%, 100%, 90%, 100%, 60%). |
| Detail | Not found | Empty state (see 1.3). |
| Editor | Loading (on edit) | Skeleton of editor textarea + preview pane. |
| Search | Typing (debounced) | Show skeleton in dropdown (3 items, 40px tall, animated bars). |
| Search | No results | "No results for '{query}'" with muted styling. |
| Search | Error | "Unable to search. Please try again." |

### 5.5 Toast/Notification States

| State | Background | Text | Border/Icon | Dismissal |
|-------|------------|------|-------------|-----------|
| Success | `--color-success-bg` | `--color-text` | Left border 3px `--color-success`, ✓ icon | Auto-dismiss after 3s, or × to dismiss early |
| Error | `--color-error-bg` | `--color-text` | Left border 3px `--color-error`, ⚠ icon | Manual dismiss only (× button) |
| Warning | `--color-warning-bg` | `--color-text` | Left border 3px `--color-warning`, ⚠ icon | Manual dismiss |

Toast position: fixed bottom-right on desktop, bottom-center (full width) on mobile. Max 1 toast visible at a time (queue subsequent toasts).

---

## 6. Accessibility

### 6.1 Contrast Summary

| Element | Foreground | Background | Ratio | WCAG AA |
|---------|-----------|------------|-------|---------|
| Primary body text | `#1A1A2E` | `#FFFFFF` | 15.4:1 | ✅ AAA |
| Secondary/meta text | `#5C6370` | `#FFFFFF` | 5.5:1 | ✅ AA |
| Button text (primary) | `#FFFFFF` | `#3B82F6` | 5.6:1 | ✅ AA |
| Input placeholder text | `#868E96` | `#FFFFFF` | 3.8:1 | ✅ AA (placeholder exception) |
| Error text | `#DC2626` | `#FEF2F2` | 6.3:1 | ✅ AAA |
| Link text | `#3B82F6` | `#FFFFFF` | 3.0:1 | ⚠️ Use underline to reinforce |

### 6.2 Keyboard Navigation

- **Tab order**: Follow visual reading order — top-left to bottom-right.
  1. Logo link
  2. Search input
  3. "+ New" button
  4. Sidebar items (if visible)
  5. Article list items
  6. Pagination / load-more button
  7. Footer (if any)
- **Search dropdown**: Once search input is focused and dropdown appears, `Tab` cycles through results. `Enter` selects. `Escape` closes.
- **Editor view**: `Tab` should move between title input → textarea → action buttons. Within the textarea, `Tab` inserts 2 spaces (not tab cycling).
- **Modal**: Focus is trapped within the modal when open. `Escape` closes modal.

- **Skip link**: Provide a "Skip to content" link (visually hidden until focused) as the first tab stop of every page, linking to the main content area `#main-content`.

### 6.3 Screen Reader Guidance

| Component | ARIA Usage |
|-----------|------------|
| Search input | `role="search"` on parent or `aria-label="Search articles"` on input |
| Search dropdown | `role="listbox"`, each result `role="option"` with `aria-selected` for highlighted item |
| Article cards | `role="link"` or `<a>` element with descriptive text (title + preview). `aria-labelledby` if using card structure |
| Editor textarea | `aria-label="Article content"` or `aria-labelledby` pointing to editor heading |
| Title input | `aria-label="Article title"`, `aria-required="true"` |
| Loading skeletons | `aria-busy="true"` on container, `aria-live="polite"` for regions updating after load |
| Toast notifications | `role="status"` / `role="alert"` with `aria-live` for screen reader announcement |
| Confirmation modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` for title |
| Back button | `aria-label="Back to article list"` or descriptive label |

### 6.4 Additional Accessibility

- **Focus visible**: Use `:focus-visible` for keyboard focus indicators (the blue ring `--shadow-focus`). Mouse clicks should not show the ring (use `:focus:not(:focus-visible)` to suppress).
- **Reduced motion**: Respect `prefers-reduced-motion`. Disable shimmer animation on skeletons and all transitions shorter than 300ms when this preference is set.
- **Color-only indicators**: Never use color alone to convey state. Errors include an icon (⚠) and text. Success includes an icon (✓). Search result highlights use both background color and a subtle border change.
- **Touch target size**: All interactive elements are minimum **44×44px** on mobile (WCAG 2.5.5). On desktop, minimum 32×32px with appropriate padding is acceptable.

---

## 7. Handoff Notes

### 7.1 Component Inventory

| Component | Description | Props/Variants |
|-----------|-------------|----------------|
| `AppHeader` | Fixed top bar, 56px. Contains logo, search, "+ New" button. | None (global) |
| `ArticleCard` | Article preview card in list view. Clickable. | `article` (object), `variant: 'default' \| 'selected'`, `onClick` |
| `ArticleList` | Scrollable list of `ArticleCard` components. Handles loading, empty, and error states internally or via parent prop. | `articles[]`, `state: 'loading' \| 'empty' \| 'error' \| 'ready'`, `onArticleClick` |
| `ArticleDetail` | Renders a single article's title, metadata, and rendered Markdown body. Max-width 72ch centered. | `article` (object), `onBack`, `onEdit` |
| `ArticleEditor` | Split-pane (desktop) or tabbed (mobile) Markdown editor with live preview. | `title?`, `content?`, `isEdit: boolean`, `onSave`, `onDiscard`, `state: 'draft' \| 'saving' \| 'saved'` |
| `SearchInput` | Header-based search with debounced results dropdown. Keyboard accessible. | `onSelectArticle`, `placeholder?` |
| `SearchDropdown` | Results list triggered by SearchInput. Supports keyboard nav. | `results[]`, `query`, `onSelect`, `onClose` |
| `Sidebar` | Category navigation (v1: placeholder for v2 categories). | `categories[]`, `activeCategory?`, `onSelect` |
| `SidebarDrawer` | Mobile/tablet version of Sidebar as a slide-out overlay. | `isOpen`, `onClose`, same category props |
| `Toast` | Notification popup. Auto-dismiss or manual. Queued. | `type: 'success' \| 'error' \| 'warning'`, `message`, `duration?`, `onDismiss` |
| `Button` | Multi-purpose button. | `variant: 'primary' \| 'secondary' \| 'tertiary'`, `size: 'sm' \| 'md'`, `disabled?`, `loading?`, `onClick` |
| `SkeletonCard` | Placeholder loading card. Animated shimmer. | Count prop for number of skeletons |
| `EmptyState` | Reusable empty-state component. | `icon`, `title`, `description`, `actionLabel?`, `onAction?` |
| `ConfirmationModal` | Dialog for unsaved changes confirmation. | `title`, `message`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel` |

### 7.2 Layout Structure

The app follows this DOM structure (simplified):

```html
<div id="app">
  <header class="app-header">…</header>
  <main id="main-content" class="app-main">
    <!-- View content swaps here: BrowseView, ArticleDetailView, EditorView -->
  </main>
  <div id="toast-container" role="status" aria-live="polite"></div>
</div>
```

### 7.3 Recommended Libraries

| Purpose | Recommendation | Rationale |
|---------|---------------|-----------|
| Markdown parsing | `marked` (v13+) or `markdown-it` | Lightweight, fast, supports syntax highlighting |
| Markdown rendering | Custom CSS classes on parsed HTML via `kb-prose` wrapper | No heavy WYSIWYG library needed |
| Icons | Lucide Icons (`lucide` package) | Consistent, tree-shakeable, open-source |
| CSS framework | Plain CSS or Tailwind CSS (if the framework supports it) | Avoid heavy UI frameworks like Material UI — they add weight and constrain the "calm" aesthetic |
| Date formatting | `date-fns` (`formatRelative`) | Lightweight, tree-shakeable |
| Toast notifications | Inline custom component or `sonner` (if React) | Simple, accessible toasts |

### 7.4 CSS Architecture Recommendations

Use CSS custom properties (defined above) for all semantic styling. Avoid hardcoding color values. Structure styles as:

1. **Global reset/normalize** (use `modern-normalize` or equivalent)
2. **Design tokens** (`:root` block from Section 4)
3. **Base elements** (`body`, `h1-h6`, `p`, `a`, `button`, `input`, `textarea`)
4. **Utility components** (`.button`, `.card`, `.empty-state`, `.skeleton`, `.toast`)
5. **Layout components** (`.app-header`, `.app-main`, `.sidebar`)
6. **Page views** (`.browse-view`, `.article-detail`, `.article-editor`)

### 7.5 Route Configuration

| Route | View | Notes |
|-------|------|-------|
| `/` | BrowseView | Default route |
| `/articles/:id` | ArticleDetailView | Read-only view |
| `/articles/new` | ArticleEditor | Create mode |
| `/articles/:id/edit` | ArticleEditor | Edit mode with pre-loaded data |

---

## 8. v2 Feature Design Guidance (For Reference — Not Required in v1 Implementation)

These features are **out of scope for v1** but the v1 layout should accommodate them structurally.

### 8.1 Category/Tag Organization

- **Sidebar**: Already reserved in the layout. Each category shows article count badge. Selected state uses accent background.
- **Filter chip**: Above article list when category selected: `Category: [Name] ✕` (clicking ✕ clears filter).
- **Category selector** in editor: Dropdown below title input.
- **Tag UI**: As pill-style badges beneath the meta row on article cards and detail view (future).

### 8.2 Article Status (Draft / Published)

- **Badge**: Small pill next to article title in detail view and in list cards.
  - "Draft": `--color-warning-bg` background, `--color-warning` text, `--radius-full`, padding 2px 8px, 12px text.
  - "Published": No badge by default. If needed, a subtle `--color-success-bg` pill with "Published" text.
- **Status selector** in editor: Toggle or dropdown near the Save button. Default to "Draft" for new articles created in v1 (future behavior).
- **Filtering**: Browse view can filter by status (future). Default shows both.

### 8.3 Full Accessibility

- Add `aria-describedby` relationships between form inputs and error messages.
- Implement a proper `Skip to content` link (design-only guidance above).
- Ensure all interactive components have `aria-*` attributes matching their role.
- Test with keyboard-only navigation.
- Validate color contrast for all text/ background combinations.

---

## 9. Decisions Log

### 1. Markdown Editor over WYSIWYG
**Tradeoff**: WYSIWYG is more familiar to non-technical users but adds significant library weight and complexity. Markdown is simpler, more reliable, and matches the target user profile (internal team members, likely technical).
**Decision**: Markdown editor with live preview. If non-technical users are identified later, a WYSIWYG toolbar can be layered on top without changing the storage format.

### 2. Search in Header vs Dedicated Search Page
**Tradeoff**: A dedicated search page allows richer filtering and results. A header search is always accessible but limited in space.
**Decision**: Header search with dropdown. The brief prioritizes "search-first navigation" and "low-friction movement." A header search is immediately available from any view without navigation. A full search page can be added for v2 if complex filtering is needed.

### 3. Split-Pane Editor vs Full-Width Editor
**Tradeoff**: Split-pane reduces editor width but lets users see formatting immediately. Full-width gives more editing room but requires a separate preview step.
**Decision**: Split-pane on desktop (matches the "calm, readable" aesthetic and enables immediate visual feedback). Tabbed on mobile where horizontal space is insufficient.

### 4. No Autosave in v1
**Tradeoff**: Autosave prevents data loss but introduces complexity around conflicts, UI feedback, and network reliability.
**Decision**: Manual save only (`⌘S` shortcut supported). Reduces scope significantly. The unsaved-changes modal on navigation provides a safety net.

### 5. Load More Button vs Infinite Scroll
**Tradeoff**: Infinite scroll feels more modern but can cause navigation issues and makes it harder to reach footer or other page-end controls.
**Decision**: Explicit "Load more" button. More predictable, works better with keyboard navigation, and users maintain full control of loading.

### 6. Light Theme Only for v1
**Tradeoff**: Dark theme would accommodate user preferences but doubles the color testing and adds maintenance burden.
**Decision**: Light theme only. The chosen palette prioritizes calm readability. Dark theme can be added later if demand warrants it.

### 7. No Multi-Step Create Flow
**Tradeoff**: Multi-step flows can guide users but create friction for a simple "write an article" task.
**Decision**: Single-page editor. Users type the title and start writing immediately. "Save" is the only required action. The brief specifically says to "avoid admin flows with too many steps."
