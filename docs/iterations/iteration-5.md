# Iteration 5: Lifecycle Operations, Advanced Polish & Automated E2E Testing

## Goal & Scope
Conclude development by implementing advanced relational operations, refining UI interactions to match the Design Spec's comprehensive states matrix, and executing the Playwright automated E2E integration test suites.

At the end of this iteration, the codebase will feature cascade-delete warnings, custom uncategorized filters, high-fidelity HSL focus outlines, standard-compliant landmark ARIA attributes, and verified cross-browser integration tests.

---

## Task Checklist

### 1. Category Cascade Deletion UX
- [ ] **Implement Database Cascade Safeguards**:
  Confirm that deleting a category updates all matching articles to `categoryId = null` in SQLite (`onDelete: 'set null'` database constraint).
- [ ] **Build Warning Modal Component**:
  Create a modal dialog triggered by clicking a category delete icon:
  - Display warning messages: *"This category will be permanently removed. The [X] articles inside will not be deleted; they will become Uncategorized."*
  - Lock confirmation controls until database calculations finish loading.
- [ ] **Build "Uncategorized" Sidebar Filter**:
  Render a dedicated "Uncategorized" link at the bottom of the category listing if the database contains articles with `categoryId = null`:
  - Clicking this filter loads lists of uncategorized documents, allowing authors to select them in the editor and re-assign categories.

### 2. Interaction Design Polish (States Matrix Audit)
- [ ] **Apply High-Fidelity Design States**:
  Conduct a CSS visual review of all interactive elements to ensure they conform exactly to the states matrix:
  - **Buttons**: Verify translation animations (`transform: translateY(-1px)`) and matching elevations (`var(--shadow-md)`) on hovers, pressed effects, and disabled states.
  - **Focus Indicators**: Remove standard browser outline rings. Apply the custom HSL cobalt glow:
    `box-shadow: 0 0 0 3px hsla(var(--accent-primary-hsl), 0.25);`
    `border-color: hsl(var(--accent-primary-hsl));`
  - **Error Indicators**: Set input borders and backgrounds to matching error HSL values upon failed Zod schema checks.

### 3. Accessibility (a11y) & Semantic Structure
- [ ] **Incorporate Landmark Structures & ARIA Labels**:
  Verify the DOM structure conforms to WCAG 2.1 Level AA principles:
  - Wrap the header in `<header role="banner">`.
  - Wrap navigation lists in `<nav aria-label="Main Category Navigation">`.
  - Wrap detail panes in `<main id="main-content" tabIndex="-1">` and articles in `<article>`.
  - Add `aria-live="polite"` and `aria-label="Live HTML Preview"` tags on the Markdown editor preview canvas.
  - Include `<span class="sr-only">` tags in status badges for screen readers.

### 4. Playwright E2E Integration Testing
- [ ] **Configure Playwright E2E Runner**:
  Ensure the configuration in `playwright.config.ts` is fully defined:
  - Configure Chromium and Firefox browser projects.
  - Set the development web server command (`npm run dev`) and test timeouts (120s).
- [ ] **Implement Primary User Journey E2E Script**:
  Write [tests-e2e/kb-journey.spec.ts](file:///C:/projects/evals_may2026_gemini-3.5-flash/tests-e2e/kb-journey.spec.ts) reproducing the critical user journey:
  - Load the home page `/` and assert that categories are active in the sidebar.
  - Focus and input "Node.js" into the global search bar.
  - Assert that the URL navigates to `/articles?search=Node.js`.
  - Click on the first article card and verify the detail view loads.
  - Click the "Edit Article" button, type "Adding custom notes for production build logs." in the editor, and select "published" status.
  - Save changes and verify redirection back to the detail view showing updated contents.

---

## Verification & QA Checkpoints

### 1. Cross-Browser Automated E2E Execution
- Start the test suite locally:
  ```bash
  npm run test:e2e
  ```
- Confirm that the Playwright browser runners complete both Chromium and Firefox executions successfully.
- Review the generated HTML report (`npx playwright show-report`) to verify all screenshots and navigation timings pass.

### 2. Category Delete Cascade Validation
- Create a category and add 2 new articles inside.
- Click the delete category action in the sidebar:
  - Verify that the warning modal displays: *"2 articles inside will not be deleted; they will become Uncategorized."*
  - Approve the deletion.
- Verify that the category is removed from the sidebar and that the "Uncategorized" filter is active, containing the 2 uncategorized articles.
