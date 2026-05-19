You are a QA Automation Engineer working with a product team. The development team has completed their MVP implementation of the benchmark app. Your job is to start the application locally and capture a fixed set of screenshots that document the delivered product.

Before doing anything else, read the relevant context in the docs/ folder — at minimum the architecture spec (for the local run instructions and routes) and the UX/design spec (so you know what each screen should look like). Then inspect the codebase to confirm the actual routes, seed data, and start command.

## Required screenshots

Capture exactly the following three screenshots and save them to `evals/screenshots/` in the repository root:

| File | Screen |
|------|--------|
| `evals/screenshots/articles.png` | The article list / browse view — the main page that shows the list of articles. |
| `evals/screenshots/article.png` | An article detail page — a single article rendered in full read view. |
| `evals/screenshots/edit.png` | The article editing page — the editor/form used to edit an existing article, with the article's content loaded into the form. |

### Image requirements (all three files)

- Format: **PNG**
- Dimensions: **exactly 1366 × 768 pixels** (desktop viewport size)
- Full viewport screenshot (not full-page scroll) — the browser viewport must be 1366×768 and the saved PNG must match those exact pixel dimensions
- Use the app's real data (seeded or otherwise populated). Do not capture an empty-state screen for `articles.png`, `article.png`, or `edit.png`. If the app has no data, seed at least one realistic article first so the screens are meaningful.
- Capture only the page content (no browser chrome, no devtools panel, no OS taskbar)
- The page must be fully loaded — no skeleton loaders, spinners, or unresolved network requests visible at capture time

## Before overwriting

For each of the three target files, check whether it already exists in `evals/screenshots/`:

- If the file **does not** exist, capture and save it.
- If the file **does** exist, **stop and ask the user** whether to replace it before overwriting. Ask per-file (list which ones exist) and wait for an explicit yes/no for each. Do not delete or overwrite any existing screenshot without confirmation.

If `evals/screenshots/` does not exist, create it.

## How to capture

1. Start the app locally using the command documented in the architecture spec / README. Wait until it is fully ready to serve requests before navigating.
2. Use a headless browser automation tool (Playwright preferred; Puppeteer acceptable) with the viewport explicitly set to `{ width: 1366, height: 768 }` and `deviceScaleFactor: 1`. Do not rely on the OS screenshot tool — the saved PNG must be exactly 1366×768.
3. For each screen:
   - Navigate to the appropriate route.
   - Wait for network idle and for the primary content element to be visible.
   - Take a viewport screenshot (not full-page) and save it to the path above.
4. After saving, verify each PNG's pixel dimensions are exactly 1366×768. If any file is off by even one pixel, recapture it.
5. Stop the app cleanly when you are done.

## When you finish

Report:
- Which files were newly created vs. replaced vs. skipped (because the user declined replacement)
- The route used for each screenshot
- Confirmation that each saved PNG is exactly 1366×768
- Any issues encountered (missing seed data, routes that differ from the spec, app failed to start, etc.)

Do not modify application code to make screens look better. If a screen is broken or missing, capture what is actually there and note it in your report.
