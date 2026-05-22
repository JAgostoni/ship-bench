# Iteration 4 Summary: Dynamic Split-Pane Markdown Editor & Operations

This document summarizes the execution and verification of Iteration 4, establishing full document authoring and modification workflows with the responsive Split-Pane Markdown Workspace.

---

## 1. Summary of What Was Built

### Next.js Server Actions & Zod Schema
- **Input Validation**: Defined `articleSchema` in `src/lib/actions.ts` using `zod` to enforce title lengths (2–100 chars), safe lowercase URL-friendly slugs, minimum content length (5 chars), status enums (`draft`/`published`), and category preprocessors.
- **Create Mutation**: Implemented `createArticleAction` validating inputs, checking slug uniqueness, inserting rows to the `articles` SQLite table, and revalidating public index paths (`/articles`, `/`).
- **Update Mutation**: Implemented `updateArticleAction` validating inputs, ensuring unique slugs (excluding the self article ID), modifying rows, updating the `updatedAt` timestamp, and revalidating active routes (`/articles`, `/`, `/articles/[slug]`, and `/articles/[oldSlug]` if changed).
- **Zod Test Suite**: Programmed [actions.test.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/actions.test.ts) covering length boundaries, slug formats, preprocessing coercions, and status validation constraints.

### Premium Split-Pane Markdown Workspace
- **Controls Header Row**: Created the top bar in [MarkdownEditor.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/MarkdownEditor.tsx) with a borderless title text input, category selection options, status pills (`Draft` / `Published`), a `Cancel` backward navigation button, and a Cobalt `Save Changes` button with a built-in spinning loading indicator.
- **Custom Slug Editor**: Added a custom slug input allowing authors to override generated slugs or write clean URL-friendly paths manually.
- **Split Workspace (Desktop >= 1024px)**: Built a 50/50 side-by-side flex panel structure containing a monospace, IDE-padded writing area and a live HTML rendered canvas side-by-side.
- **Tab Collapsing Workspace (Tablet/Mobile < 1024px)**: Folded panels into a toggleable header (`[Write Markdown]` and `[Preview Output]`). Added touch event listeners to allow fluid horizontal swiping gestures to toggle tabs on touchscreen viewports.
- **IDE Line Numbering**: Integrated a left vertical line numbering column synced precisely in scroll position with the editor textarea.
- **Proportional Scroll Sync**: Implemented a scroll listener calculating the editor's scroll percentage and setting the exact proportional offset on the live preview pane, maintaining inline text alignment during reviews.
- **Debouncedmarked Compilation**: Built a 75ms debounced markdown parser combining `marked` compilation with `isomorphic-dompurify` HTML sanitization to avoid typing latency while ensuring robust protection against XSS injections.

### Multi-Level Navigation Guards
- **beforeunload Listener**: Added a standard window event listener to warn users of unsaved changes when refreshing, closing tabs, or navigating away.
- **Client Link Interception**: Implemented a capture-phase global click event listener that checks if any clicked link is internal, preventing Next.js soft navigation and requesting browser confirmation if the editor workspace is dirty.

---

## 2. Assumptions Made and Issues Encountered

- **Preprocessed Category Values**: When selecting "No Category" in the dropdown, form elements transmit empty string values (`""`). To accommodate SQLite's nullable foreign key `categoryId`, I implemented a preprocess transformation mapping `""` to `null` before Zod number schema checks.
- **TypeScript Promise params**: Consistent with Next.js 16.x parameters, the `EditArticlePage` resolves route params asynchronously via `await params` to maintain compatibility with modern compilation requirements.
- **Automatic FTS5 Updates**: Thanks to existing database triggers defined on SQLite tables, both insert and update Server Actions automatically keep the `articles_fts` virtual search index perfectly synchronized without manual secondary query inserts.

---

## 3. Decisions Log

### Desktop Split vs. Mobile Tab Fold
- **Tradeoff**: Desktop screens have ample horizontal space for real-time 50/50 side-by-side previews, but on mobile/tablets, this layout leaves textboxes cramped and virtually unusable.
- **Resolution**: Implemented layout folding at the 1024px CSS breakpoint. On desktops, side-by-side splits are rendered. On viewports `< 1024px`, the workspace collapses into tabs toggled via UI buttons or swipe touch gestures.

### Manual Actions Save vs. Auto-Save Index Churn
- **Tradeoff**: Auto-saving updates immediately, but triggers continuous SQLite writes and virtual table FTS5 rebuilds on every keystroke, which degrade performance.
- **Resolution**: Kept a manual Cobalt save button (and standard `Ctrl+S` key submit hook) and paired it with bulletproof client-side page-leave guards (both window-level and soft click-level) to avoid data loss with maximum execution speed.

---

## 4. Local Execution Confirmation

### Unit Testing Assertions
Wrote new unit tests covering all schema validations, bringing total test suite coverage to 10 passing assertions under Vitest:
```bash
> vitest run

 RUN  v4.1.6 C:/projects/evals_may2026_gemini-3.5-flash

 ✓ src/lib/smoke.test.ts (1 test) 4ms
 ✓ src/lib/actions.test.ts (6 tests) 10ms
 ✓ src/lib/search.test.ts (3 tests) 31ms

 Test Files  3 passed (3)
      Tests  10 passed (10)
   Start at  07:08:01
   Duration  1.48s
```

### Production Bundler Compilation
Successfully verified types and compiled optimized static production builds with Turbopack:
```bash
> next build

▲ Next.js 16.2.6 (Turbopack)

✓ Compiled successfully in 2.4s
Finished TypeScript in 3.4s ...
✓ Generating static pages using 8 workers (5/5) in 623ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /articles
├ ƒ /articles/[slug]
├ ƒ /articles/[slug]/edit
└ ○ /articles/new
```

### Manual Walkthrough
1. **Creation Journey**: Navigated to `/articles/new`, typed "Drizzle ORM setup", set the category to "Engineering", entered markdown contents, and verified real-time debounced preview compilation and proportional scroll synchronization.
2. **Slug Auto-Generation**: Verified that title input automatically populates a URL-friendly lowercase slug, and allows custom edits.
3. **Redirection & Refreshes**: Clicked "Save Changes", verified database storage, redirection to `/articles/drizzle-orm-setup`, and instant appearance in the sidebar category counter and list views.
4. **Safety Guards**: Edited the article, typed modified words, clicked the logo or a category link in the sidebar, and verified the browser alert prevented accidental navigation.
