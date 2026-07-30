# UX / Design Direction Spec

## 1. Layout & Page Flows

### 1.1 Core Screens
| Screen | Route | Primary Goal |
|--------|-------|--------------|
| **Home / Article List** | `/articles` | Browse, filter, search articles. |
| **Article Detail** | `/articles/[id]` | Read full content, see tags & status, quick actions (edit, status toggle). |
| **Article Edit** | `/articles/[id]/edit` | Create or edit markdown content, tags, status. |
| **Search Results** | Integrated on List page (search bar) | Show matching articles, empty state when none. |
| **Login** | `/login` | Simple credential login for admins/content owners. |

### 1.2 Navigation Flow
- **Entry** → **Login** (if not authenticated) → **Home** (list). 
- From **Home**: 
  - Click article card → **Detail**.
  - Click "New article" button → **Edit** (create mode).
  - Use search bar → filtered **Home** view (results list). 
- From **Detail**: 
  - "Edit" button → **Edit** (edit mode). 
  - "Back" (browser back or header breadcrumb) → **Home**.
- From **Edit**: 
  - "Save" → **Detail** (optimistic update). 
  - "Cancel" → **Detail** (discard changes). 

All transitions are instant client‑side navigation (Next.js router) with a subtle fade‑in (150 ms) for perceived continuity.

## 2. Feature UX Decisions

### 2.1 Article Browsing
- **List Layout**: Two‑column grid on desktop (min‑width 1024 px), single column on tablet/mobile.
- **Article Card**: Title (bold), excerpt (first 2 lines), status badge (draft/published), tag chips (max 3, overflow → "+N").
- **Hover**: Card elevation (shadow) and subtle background tint.
- **Empty State**: Friendly illustration + "No articles yet. Click ‘New article’ to start." CTA.

### 2.2 Search
- **Search Input**: Top‑right of list header, 300 ms debounce, clear button.
- **Results**: Same card layout; highlight matched terms (yellow background, 4.5:1 contrast).
- **No Results**: State with suggestion to broaden query.

### 2.3 Editing
- **Editor**: React‑MDE markdown area + live preview pane (toggle or split view). 
- **Toolbar**: Bold, italic, heading, list, code block, link, image (URL only).
- **Form Fields**: Title (text input), Tags (multi‑select dropdown), Status (toggle switch).
- **Validation**: Title required, max 150 chars; content required, max 10 KB.
- **Saving**: Primary "Save" button (primary color), disabled until form dirty & valid; spinner overlay on click.
- **Error**: Inline field error messages, toast notification for server errors.

### 2.4 Tag Organization
- **Tag Selector**: Headless UI Combobox with type‑ahead, chips for selected tags, max 5 tags per article.
- **Hover**: Tooltip with tag description (if any).

### 2.5 Status Handling
- **Badge**: Pill badge on list and detail (color: gray for Draft, green for Published).
- **Toggle**: Switch component on edit page; immediate visual feedback.

## 3. Responsive Design
- **Breakpoints**: 
  - **Desktop** ≥ 1024 px – 2‑column grid, full header navigation.
  - **Tablet** 768‑1023 px – single column, collapsible side drawer for navigation.
  - **Mobile** ≤ 767 px – full‑screen list, hamburger menu, touch‑optimized controls.
- **Touch Targets**: Minimum 44 × 44 dp for buttons, list items, and toggle switches.
- **Mobile‑Specific**: Swipe left on list item to reveal quick actions (Edit, Delete) – optional, fallback to overflow menu.

## 4. Visual Style System

| Token | Value | Usage |
|-------|-------|-------|
| **Color Primary** | `#0066CC` | Buttons, links, active states |
| **Color Primary Hover** | `#004999` | Hover/focus |
| **Color Gray Light** | `#F5F7FA` | Background surfaces |
| **Color Gray Medium** | `#E1E4E8` | Borders, dividers |
| **Color Gray Dark** | `#6A737D` | Disabled text |
| **Color Success** | `#28A745` | Published badge |
| **Color Warning** | `#D73A49` | Draft badge |
| **Typography Font Family** | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |
| **Base Font Size** | `16px` |
| **Heading Scale** | `h1: 2.25rem`, `h2: 1.75rem`, `h3: 1.5rem` |
| **Spacing Unit** | `8px` (multiply for margins/paddings) |
| **Border Radius** | `4px` |
| **Icon Set** | Heroicons 2 (outline for UI, solid for status) |

All tokens are exposed as CSS variables in `:root` (e.g., `--color-primary`).

## 5. UI States

| Component | Default | Hover | Focus | Loading | Disabled | Error | Success |
|-----------|---------|-------|-------|---------|----------|-------|---------|
| **Button** | `bg-primary` white text | `bg-primary-hover` | `outline: 2px solid #0066CC` | Spinner overlay, opacity 0.7 | `bg-gray-medium`, `cursor:not-allowed` | N/A | N/A |
| **Input** | `border-gray-medium` | `border-primary` | `box-shadow: 0 0 0 2px rgba(0,102,204,.2)` | N/A | `background:#F0F0F0` | Red border, helper text | Green border (valid) |
| **Toggle Switch** | Gray track, white thumb | Track `primary` | Same as hover | N/A | Gray track, disabled thumb | N/A | N/A |
| **Card** | White background, gray border | Shadow + slight lift | `outline: 2px solid #0066CC` | N/A | Dimmed opacity | Red border if error state (e.g., load fail) | Green border for newly published |
| **Tag Chip** | Light gray background, dark text | Darker gray | `outline: 1px solid #0066CC` | N/A | `opacity:0.5` | N/A | `background:#28A745, color:#fff` |

## 6. Accessibility
- **Contrast**: All text/background combos meet WCAG AA (≥ 4.5:1). Primary button text `#ffffff` on `#0066CC` = 5.0:1.
- **Keyboard Navigation**: Logical tab order – header → search → article cards → pagination → footer. Interactive elements have `:focus-visible` outlines.
- **ARIA**: 
  - Buttons: `role="button"` (implicit). 
  - Toggle: `aria-checked`.
  - Input fields: `aria-label` or associated `<label>`.
  - Error messages: `role="alert"`.
- **Screen Reader**: Article cards use `aria-labelledby` linking to title; status badge includes `aria-label="Draft"` or `"Published"`.
- **Focus Management**: After navigation, focus moves to first heading of new page.

## 7. Handoff Notes
- **Component Library**: Build reusable components in `src/components/`:
  - `Header`, `ArticleCard`, `SearchBox`, `EditorPane`, `TagSelect`, `StatusBadge`, `ToggleSwitch`.
- **CSS Tokens**: Use Tailwind `@apply` with custom variables, e.g., `bg-[var(--color-primary)]`.
- **Responsive Grid**: Tailwind `grid-cols-1 md:grid-cols-2` for list.
- **State Management**: React Query hooks (`useArticles`, `useArticle`, `useSearch`) with `staleTime: 60_000`.
- **API Contracts**: JSON shape for article: `{ id, title, content, status, tags: [{id,name}], createdAt, updatedAt }`.
- **Validation Schema**: Zod `articleSchema = z.object({ title: z.string().min(1).max(150), content: z.string().min(1).max(10240), tags: z.array(z.string()), status: z.enum(["DRAFT","PUBLISHED"]) })`.
- **Icon Usage**: Import Heroicons as React components, e.g., `import { PencilIcon } from "@heroicons/react/24/outline"`.
- **Animations**: Use CSS `transition: background-color .15s ease, box-shadow .15s ease`.

## 8. Decisions Log
- **Two‑column grid** chosen for desktop to maximize information density while keeping readability.
- **Markdown editor** over WYSIWYG to stay lightweight and align with “simple reliable” editing expectation.
- **SQLite FTS5** for search to avoid external services, meeting small‑to‑medium dataset requirement.
- **Tailwind 4** selected for rapid utility‑first styling and easy token exposure.
- **Heroicons** for consistent, accessible iconography without extra font load.
- **Focus‑visible outlines** rather than custom outlines to satisfy WCAG with minimal CSS.
- **Swipe actions** added as optional mobile enhancement, keeping core functionality keyboard‑first.

---

*All design decisions directly reflect the product brief’s tone (calm, readable, information‑dense) and non‑functional goals (responsive, accessible, performant).*