# QA Review & Code Quality Report: Simplified Knowledge Base App (v1 MVP)

This document provides a comprehensive, evidence-based QA review and light code review of the Simplified Knowledge Base App MVP. The assessment covers environment setup, test suite validation, responsive breakpoints, error handling, visual spec adherence, and a detailed log of defects and spec drifts.

---

## 1. Executive Summary & Release Recommendation

### **Release Recommendation: SHIP WITH CONDITIONS**

The Simplified Knowledge Base App delivers an exceptionally solid, high-performance foundation for a local-first wikis workspace. The codebase shows premium engineering practices including strict type safety, zero compile warnings, robust unit coverage, and cross-browser automated integration testing.

However, a **critical search defect** breaks internationalization (i18n), and a **major UX loophole** causes older drafts to become completely inaccessible in the UI.

#### **Conditions for Shipment:**
1. **[CRITICAL]** Fix the query sanitizer RegExp in `src/lib/search.ts` to support accented/non-ASCII characters (e.g., French, Spanish, Japanese, Chinese) so search functions globally.
2. **[MAJOR]** Implement a dedicated "Drafts" filter in the sidebar or a "Show Drafts" toggle on the list view to prevent draft documents from becoming "ghosts" in the DB once they exit the homepage's top-3 list.
3. **[MAJOR]** Correct the broken `npm run lint` script in `package.json` by adding standard ESLint packages and configuration.

---

## 2. MVP Flow Verification Results

Every core user flow from the [Product Brief](file:///C:/projects/evals_may2026_gemini-3.5-flash/docs/product-brief.md) was traced and verified.

| Flow / Journey | Status | Key States Tested | Notes |
| :--- | :--- | :--- | :--- |
| **1. Article Browsing & Details** | **PASS** | Empty, Success, 404 | Sidebar filter renders dynamic categories and published article counts. Breadcrumbs work cleanly. The text canvas is optimized for reading (`max-width: 720px`). Dynamic stats (read time, character counts) compute server-side. |
| **2. Category Sidebar & Counts** | **PASS** | Empty, Success, Counting | Categories are populated from the DB. A custom grouping select query counts published articles per category dynamically. |
| **3. Full-Text Search (FTS5)** | **CONDITIONAL PASS** | Empty, Success, Syntax | Global search navigates to `/articles?search=query`. Re-indexes automatically via SQLite triggers. Relevance uses BM25 scoring with a 3x title weight boost. **Fails for non-ASCII queries (see Defect Log).** |
| **4. Article Creation & Editing** | **PASS** | Validation, Draft, Published | Markdown split-pane includes line numbers, debounced marked parsing (75ms), and proportional scroll sync. Handles both Create and Update flows via unified server actions. |
| **5. Relational Cascade Deletion** | **PASS** | Modal loading, Re-assignment | Deleting a category prompts a modal that fetches active article records in the background, warns the user, and automatically reassigns them to `NULL` (Uncategorized) in the database via foreign key constraints. |
| **6. Navigation Intercept Guards** | **PASS** | Dirty-state, Exit warnings | `beforeunload` warns on page refresh/close. Client click listener intercept blocks internal route clicks if changes are unsaved, providing confirmation dialogs. |

---

## 3. Local Setup Verification

The local dev environment is straightforward and highly ergonomic, matching the SQLite WAL-mode architecture.

* **Prerequisites**: Node.js (`v24.x` / `v22.x`) and npm (`v10.x`) compile and initialize out of the box.
* **Database & Seeding**: Running `npm run db:push` and `npm run db:seed` successfully pushes Drizzle models and seeds high-quality markdown mock guides into `data/kb.db`.
* **Execution**: Command `npm run dev` boots the server locally on port 3000.
* **Setup Gaps**: 
  * The `.env.example` copy step is well documented.
  * **Critical Gap**: `npm run lint` fails out-of-the-box because ESLint is not declared in `package.json` dependencies and no eslint configurations are present in the workspace.

---

## 4. Test Suite Results & Coverage Summary

The test suites are well-structured, combining fast unit checking and browser integration runs.

### **Unit & Integration Testing (Vitest)**
All **10 assertions** pass cleanly under 1.5 seconds.
```bash
 RUN  v4.1.6 C:/projects/evals_may2026_gemini-3.5-flash

 ✓ src/lib/smoke.test.ts (1 test) 4ms
 ✓ src/lib/actions.test.ts (6 tests) 10ms
 ✓ src/lib/search.test.ts (3 tests) 30ms

 Test Files  3 passed (3)
      Tests  10 passed (10)
   Duration  1.49s
```
* **Coverage Scope**: Validates Zod payload constraints (min/max boundaries), slug format validation, search input query cleaning, and marked/DOMPurify HTML sanitation (filtering out dangerous scripts and script links).

### **Automated E2E Integration Testing (Playwright)**
All **2 tests** pass on both Chromium and Firefox browsers.
```bash
Running 2 tests using 1 worker

[1/2] [chromium] › tests-e2e\kb-journey.spec.ts:54:7 › Knowledge Base Primary User Journey › should execute the critical user journey: browse, search, select, edit, and save
[2/2] [firefox] › tests-e2e\kb-journey.spec.ts:54:7 › Knowledge Base Primary User Journey › should execute the critical user journey: browse, search, select, edit, and save
  2 passed (16.1s)
```
* **E2E Stability**: The dev team resolved database locking issues by configuring Playwright with sequential execution (`workers: 1`, `fullyParallel: false`). This guarantees that beforeEach database wipe-and-reseed operations execute sequentially without collision.

---

## 5. Responsiveness Check

The CSS grid and flex setups are extremely responsive across the target screen breakpoints.

* **Desktop (`>= 1024px`)**: Renders a persistent 260px sidebar + content pane grid. The Markdown editor splits 50/50 side-by-side with synced line-number blocks and proportionate canvas scrolling.
* **Tablet (`768px - 1023px`)**: The sidebar collapses via an interactive menu toggle. The editor folds from side-by-side into toggleable tabs: `[Write Markdown]` and `[Preview Output]`.
* **Mobile (`< 768px`)**: The sidebar is replaced by a sliding overlay drawer with scrim backing. The search bar converts to a full-screen input modal. Buttons feature visual padding extending touch targets to `48px x 48px` minimums. Swiping horizontally swaps between editor and preview tabs.

---

## 6. Error Handling Review

Error states and invalid boundaries are gracefully handled and surfaced to the user.

* **404 Handling**: Routing to an invalid slug or direct ID triggers Next's `notFound()`, which properly renders the framework's fallback 404 handler.
* **Server Action Safeguards**: DB writes are wrapped in try-catch-finally clauses. Uncaught database exceptions return a safe generic message, `An unexpected database error occurred`, while printing exact traces to server logs to prevent leaking underlying database layout specs.
* **Validation Surfacing**: Injected Zod parser errors return key-value arrays mapped to form fields. The UI catches these errors, highlights invalid inputs in matching HSL error borders, and prints specific warning texts adjacent to the elements.

---

## 7. Spec Adherence Summary

The delivered codebase represents a strong, standard-compliant interpretation of the [Architecture Spec](file:///C:/projects/evals_may2026_gemini-3.5-flash/docs/architecture.md) and [Design Spec](file:///C:/projects/evals_may2026_gemini-3.5-flash/docs/design-spec.md).

* **Obsidian HSL Tokens**: Themes useSlate HSL values in light mode and deep obsidian HSL colors in system-triggered dark mode.
* **Custom Glow Focus**: Browser default blue rings are replaced globally in `globals.css` with HSL cobalt glow outlines on focusable inputs, links, and triggers.
* **HTML Landmarks & ARIA**: Standard layouts are wrapped in semantic landmarks (`<header role="banner">`, `<nav aria-label="...">`, `<main tabindex="-1">`, `<article>`). Live preview pane includes `aria-live="polite"` and status badges use `sr-only` prefix tags.
* **SQLite trigger index sync**: The FTS5 index relies on native DB triggers rather than heavy application-level code loops.

---

## 8. Code Signals Checklist

| Signal | Status | Evidence / Notes |
| :--- | :--- | :--- |
| **1. Clean Linting** | **NO** | `npm run lint` throws an exit error out of the box because ESLint is not configured or installed. |
| **2. Obvious Security Holes** | **YES** | Parameterized queries via Drizzle ORM prevent SQL injections. HTML preview outputs are purged server and client side via `isomorphic-dompurify`. |
| **3. Modular Codebase** | **YES** | Standard React separation. CSS Modules keep element rules scoped locally, avoiding messy global conflicts. |
| **4. Specs Alignment** | **YES** | Integrates App Router, SQLite WAL, DrizzleKit, Marked and DomPurify exactly as specified in the architecture document. |
| **5. No Scope Drift** | **YES** | Out-of-scope backlog items (conflict resolution, enterprise RBAC, inline category creation) were skipped, preserving project borders. |
| **6. Current Dependencies** | **YES** | Uses React 19, Next 16, Vitest 4, Playwright 1.60, and modern SQLite wrappers. TypeScript compiles with **zero errors**. |

---

## 9. Defect Log

### **1. Critical: Internationalization (i18n) Search Query Mangling**
* **Reproduction Steps**:
  1. Open the search bar in the header.
  2. Type a word containing non-ASCII or accented letters, e.g. `général` (French) or `マニュアル` (Japanese).
  3. Observe that the search input in the URL becomes `?search=gnral` or `?search=`, and no matches are shown.
* **Root Cause**: The function `sanitizeSearchQuery` in [src/lib/search.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/lib/search.ts#L7-L9) uses `replace(/[^\w\s]/g, '')`. In JavaScript regular expressions, the `\w` character class only matches ASCII letters (`a-zA-Z0-9_`) unless unicode flags and properties are specified. Any multilingual search terms are therefore heavily mangled or completely erased.
* **Suggested Fix**: Modify the query sanitizer to selectively strip only special SQLite FTS5 symbols that could cause query parse crashes while keeping all characters and numbers across foreign scripts:
  ```typescript
  export function sanitizeSearchQuery(queryStr: string): string {
    return queryStr.replace(/[*"':()]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  ```

### **2. Major: Ghost Draft Article Accessibility Gap**
* **Reproduction Steps**:
  1. Go to the workspace, create four published articles, and save them.
  2. Create a fifth new article and save its status as a "Draft".
  3. Navigate to `/articles` (Browse page). Note that the draft is not displayed (by design to keep drafts hidden from public view).
  4. Navigate to `/` (Homepage). Note that "Recent Articles" lists the top 3 newest published articles, and the draft is no longer visible.
  5. Search for the draft's title. It is excluded from public search and doesn't load.
  6. Attempt to find any list or filter option in the sidebar navigation or headers to access "Drafts". There is none, meaning the draft article is permanently lost in the database unless its URL slug is known beforehand.
* **Root Cause**: Next.js browse and search routes strictly omit drafts. However, there is no corresponding administrative dashboard or drafts drawer that allows writers to see and open their own drafts.
* **Suggested Fix**: Add a dedicated "Drafts" link at the bottom of the sidebar navigation (similar to the "Uncategorized" filter, displaying the draft count) to let authors easily browse and access drafts in progress.

### **3. Major: Broken Lint Command Out-Of-The-Box**
* **Reproduction Steps**:
  1. Run `npm run lint` in the terminal.
  2. Observe that Next throws: `Invalid project directory provided, no such directory: ...\lint`.
* **Root Cause**: ESLint is not declared in `package.json` dependencies and no `.eslintrc.json` config file is present. Next CLI fails to resolve the lint script and treats `lint` as a directory path argument.
* **Suggested Fix**: Run `npm i --save-dev eslint eslint-config-next`, add a basic `.eslintrc.json` file in the workspace root, or change the lint script to run a custom parser.

### **4. Minor: Sidebar Category "+" Button is a Dead Interactive Control**
* **Reproduction Steps**:
  1. Open the application.
  2. Click the `+` button in the sidebar header next to "Categories".
  3. Observe that nothing happens (no modal, no link navigation, no input box appears).
* **Root Cause**: The button in [Sidebar.tsx](file:///C:/projects/evals_may2026_gemini-3.5-flash/src/components/Sidebar.tsx#L59-L65) is hardcoded into the layout shell, but has no click handlers because category creation was marked out-of-scope for the MVP.
* **Suggested Fix**: Either hide the button to avoid user confusion, disable it with `disabled` and add a `title="Category creation coming soon"` tooltip, or implement a basic text popup.

---

## 10. Spec Drift Log

### **1. Missing Search Focus Overlay / Dropdown Panel**
* **Spec Reference**: `docs/design-spec.md` Section 4.1: *"Live Overlay Indicator: When focused, a search overlay displays a quick list of 'Recent Articles' or 'Popular Keywords' underneath before the user starts typing."*
* **Drift**: Focusing the search bar in the header does not trigger any desktop popups or overlays. The dropdown pane displaying "Recent Articles" or "Popular Keywords" was omitted by the development team.

### **2. Dom Tab-Order Sequencing Deviation**
* **Spec Reference**: `docs/design-spec.md` Section 7.1: *"Tab navigation follows DOM flow sequentially: 1. Search input -> 2. Category list navigation -> 3. New Article trigger -> 4. Article list cards -> 5. Detail pane action buttons."*
* **Drift**: Natural DOM ordering in `LayoutShell.tsx` places the "New Article trigger" in the global header, which means keyboard tab navigation jumps from the search input to the "New Article" button before moving to the sidebar category list.

---

## 11. Priortized Next Steps

To transition this high-quality MVP into a production-ready system, the following actions are recommended, in priority order:

1. **Fix the search query sanitizer** in `src/lib/search.ts` using the selective symbol-strip helper, restoring international language searching.
2. **Add a "Drafts" filter** to the sidebar navigation (matching the "Uncategorized" filter implementation) to allow authors to find and resume editing their draft articles.
3. **Configure ESLint properly** in `package.json` and add a standard `.eslintrc.json` file in the project root to ensure `npm run lint` passes out-of-the-box.
4. **Remove or disable the "Add Category" (+)** button in the sidebar to prevent user confusion, or hook it up to a basic prompt alert.
5. **Implement the search overlay popover** on desktop to display recent documents upon search focus, satisfying Section 4.1 of the design specification.
