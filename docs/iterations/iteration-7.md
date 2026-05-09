# Iteration 7: Polish & Documentation

**Goal:** Verify responsive design across breakpoints, audit accessibility, and produce project documentation. This is the final quality gate before delivery.

**Scope:** MVP — responsive layout, accessible interactions, readable contrast (per brief). Full accessibility audits are post-MVP.

---

## Task 7.1: Responsive Design Verification

**No new files.** Manual and tool-assisted testing across breakpoints.

### Test Matrix

| Feature | Desktop (≥1024px) | Tablet (768–1023px) | Mobile (<768px) |
|---------|-------------------|---------------------|-----------------|
| Layout shell | Sidebar visible, header 64px | Sidebar collapsed, hamburger menu | Single column, hamburger menu |
| Header | Full search bar, "New Article" button | Compact search bar | Search icon (expandable), "+" icon for new |
| Sidebar | Persistent 260px | Slide-out drawer | Slide-out drawer 280px |
| Article cards | Horizontal: title left, badge right | Same as desktop | Stacked vertical |
| Article detail | Full-width prose | Same | Full-width |
| Markdown editor | Split pane (50/50) | Split pane | Stacked with Write/Preview tabs |
| Article form | Single column, 860px max | Same | Full width, stacked buttons |
| Pagination | "← Previous  Page X of Y  Next →" | Same | "← Prev  Next →" |
| Search bar | Centered in header | Compact | Expandable overlay |
| Category nav | In sidebar | In drawer | In drawer |

### Verification Steps
1. Use browser DevTools responsive mode at 1920px, 1024px, 768px, 375px
2. Verify no horizontal scrollbars at any breakpoint
3. Verify all interactive elements have minimum 44×44px touch targets on mobile
4. Verify text is readable at all widths (no truncation except where intentional, like excerpt line-clamp)
5. Verify the sidebar drawer opens/closes correctly on tablet and mobile
6. Verify the Markdown editor switches from split-pane to tabbed at the mobile breakpoint

### Common Fixes
- Add `overflow-x-hidden` to body if horizontal scroll appears
- Add `max-w-full` to images in rendered Markdown (prose handles this, but verify)
- Fix any text overflow in article cards at narrow widths
- Ensure `form` buttons don't overflow on mobile

**What to verify:** Every page and component renders correctly at all 4 breakpoints. No layout breaks. Touch targets meet minimums.

---

## Task 7.2: Accessibility Audit

**No new files.** Audit existing components against accessibility requirements from the design spec and architecture spec.

### Checklist

#### Semantic HTML
- [ ] `<header>` has `role="banner"` (or implicit via `<header>`)
- [ ] `<nav>` has `aria-label="Main navigation"` (sidebar)
- [ ] `<main>` has `id="main-content"` (for skip link target)
- [ ] `<footer>` has `role="contentinfo"` (or implicit via `<footer>`)
- [ ] Forms have `aria-label` (e.g., "Create article", "Edit article")

#### Labels & Descriptions
- [ ] Search input has `<label className="sr-only">` linked via `htmlFor`
- [ ] Icon-only buttons have `aria-label`:
  - New article (+ icon on mobile): `aria-label="New article"`
  - Clear search (✕): `aria-label="Clear search"`
  - Hamburger menu (☰): `aria-label="Open menu"`
  - Close drawer (✕): `aria-label="Close menu"`
- [ ] Category select has associated `<label>`
- [ ] Status toggle has `aria-label="Article status"` and `role="radiogroup"`
- [ ] Individual status options have `<label>` elements

#### Keyboard Navigation
- [ ] Skip-to-content link is the first focusable element
- [ ] Tab order follows visual order on every page
- [ ] Enter/Space activates buttons and links
- [ ] Escape closes sidebar drawer
- [ ] Escape clears search focus (optional enhancement)
- [ ] Arrow keys navigate select dropdown options
- [ ] All focusable elements have visible `focus-visible` rings
- [ ] No `outline: none` without a replacement focus indicator

#### Screen Reader Announcements
- [ ] Search results container has `aria-live="polite"` so new results are announced
- [ ] Form error banner has `role="alert"`
- [ ] Form field errors use `aria-describedby` pointing to error message IDs
- [ ] Loading states use `aria-busy="true"` on skeleton containers

#### Live Regions
- [ ] Search results update: `aria-live="polite"` on the results `<section>`
- [ ] Form errors: `role="alert"` on the error banner

#### Reduced Motion
- [ ] Sidebar drawer respects `prefers-reduced-motion`:
  - Use `motion-safe:transition-all motion-safe:duration-200` for transitions
  - Use `motion-reduce:transition-none` to disable animations
- [ ] Skeleton loading pulse disabled: `motion-reduce:animate-none`
- [ ] Loading spinners: `motion-reduce:animate-none` (static icon)

#### Color Contrast
- [ ] Run a contrast checker (e.g., axe DevTools, Lighthouse) on:
  - Home page
  - Article detail page
  - Create/Edit article page
  - Category page
- [ ] Verify all text meets WCAG AA (≥4.5:1 for normal text, ≥3:1 for large text)
- [ ] Verify placeholder text uses `neutral-500` (not `neutral-400`) for sufficient contrast

**What to verify:** Lighthouse accessibility score ≥ 90 on all key pages. No axe-core violations. Keyboard-only navigation completes all critical flows.

---

## Task 7.3: Write README

**File:** `README.md` (root)

Content:

```markdown
# Knowledge Base

A simple, internal knowledge-base application for teams to create, browse, search, and maintain documentation in one place.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 6, Tailwind CSS 4
- **Backend:** Next.js API Routes, Prisma 7, SQLite (better-sqlite3)
- **Testing:** Vitest, Playwright

## Prerequisites

- Node.js >= 20.9.0
- npm >= 10.x

## Quick Start

```bash
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

The app is now running at http://localhost:3000.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run Playwright with UI mode |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:reset` | Reset database and re-run migrations |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page (article list + search)
│   ├── articles/         # Article pages
│   ├── categories/       # Category pages
│   └── api/              # REST API routes
├── components/           # React components
│   ├── ui/               # Base UI (Button, Input, Badge, etc.)
│   ├── articles/         # Article-specific components
│   ├── categories/       # Category components
│   ├── search/           # Search components
│   └── layout/           # Layout components
├── lib/                  # Utilities and shared logic
├── prisma/               # Database schema and migrations
├── e2e/                  # Playwright E2E tests
└── __tests__/            # Vitest unit tests
```

## Features

- **Article browsing:** Browse all published articles with pagination
- **Full-text search:** Search across article titles and content
- **Markdown editing:** Create and edit articles with live Markdown preview
- **Category organization:** Browse articles by category
- **Draft/published status:** Control article visibility

## Design

The interface follows a calm, search-first design with neutral colors and a blue accent. 
It's responsive across desktop, tablet, and mobile. See `docs/design-spec.md` for full design details.
```

**What to verify:** README renders correctly on GitHub. All commands work as documented. Project structure matches actual files.

---

## Task 7.4: Final Integration Verification

Run the full setup from scratch to verify the one-command quick start:

```bash
# In a clean checkout:
npm install && npx prisma migrate dev --name init && npx prisma db seed && npm run dev
```

Then verify:
- [ ] Home page loads at http://localhost:3000 with seeded articles
- [ ] Can browse articles and view detail pages
- [ ] Search works from header and home page
- [ ] Can create a new article (draft and published)
- [ ] Can edit an existing article
- [ ] Can delete an article
- [ ] Category pages work
- [ ] Status visibility rules work (drafts hidden from lists)
- [ ] `npm run build` succeeds without errors
- [ ] `npm run test` passes all unit tests
- [ ] `npm run test:e2e` passes all E2E tests
- [ ] `npm run lint` passes

**What to verify:** The entire app works end-to-end from a clean install. CI would pass on this state.

---

## Iteration 7 Completion Checklist

- [ ] All breakpoints verified — no layout issues
- [ ] Touch targets meet 44×44px minimum on mobile
- [ ] Lighthouse accessibility score ≥ 90 on all key pages
- [ ] All ARIA labels present on icon-only buttons
- [ ] All form inputs have associated labels
- [ ] Skip-to-content link is functional
- [ ] Keyboard navigation completes all critical flows
- [ ] Focus-visible rings visible on all interactive elements
- [ ] Sidebar drawer respects prefers-reduced-motion
- [ ] Color contrast meets WCAG AA on all pages
- [ ] README is complete and accurate
- [ ] Full clean install → run → verify passes
- [ ] `npm run build` succeeds
- [ ] `npm run test` and `npm run test:e2e` all pass
- [ ] `npm run lint` passes