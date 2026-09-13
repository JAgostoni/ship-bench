// Iteration 8.8: capture the ten screenshots the brief asks for, in both themes
// where the design differs (`docs/iterations/iteration-8.md` task 8.8).
//
// Run against a server backed by a *scratch* database, so the empty-state captures
// can empty it without touching `data/kb.db`:
//
//   DATABASE_FILE=./data/kb.shots.db npx tsx scripts/db-setup.ts --fresh --seed
//   DATABASE_FILE=./data/kb.shots.db npx next start --port 3300
//   node scripts/screenshots.cjs http://127.0.0.1:3300
const { chromium } = require('@playwright/test');
const { execSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const base = process.argv[2] ?? 'http://127.0.0.1:3300';
const outDir = path.join(__dirname, '..', 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

async function shot(page, name, { fullPage = true } = {}) {
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage });
  console.log(`  wrote ${name}.png`);
}

function emptyScratchDb({ categories = false } = {}) {
  execSync(`npx tsx scripts/empty-scratch-db.ts${categories ? ' --categories' : ''}`, {
    stdio: 'inherit',
  });
}

(async () => {
  const browser = await chromium.launch();

  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();

    // ── 1. Browse: sidebar, filter bar, pagination ──────────────────────────
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(350);
    await shot(page, `01-browse-${theme}`);

    // ── 2. Search: <mark> highlighting and the announced count ──────────────
    await page.goto(base + '/search?q=deploy', { waitUntil: 'load' });
    await page.waitForTimeout(350);
    await shot(page, `02-search-${theme}`);

    // ── 3. Detail: breadcrumb, meta, TOC, collapsed History ─────────────────
    await page.goto(base + '/articles/deploying-the-api-to-production', { waitUntil: 'load' });
    await page.waitForTimeout(350);
    await shot(page, `03-detail-${theme}`);

    // ── 4. Editor with the live preview visible ─────────────────────────────
    await page.goto(base + '/articles/deploying-the-api-to-production/edit', { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    await shot(page, `04-editor-${theme}`, { fullPage: false });

    // ── 5. Conflict banner with focus applied ───────────────────────────────
    // The banner appears when a save is attempted against a stale `version`. The
    // article is loaded, its version is bumped behind the form's back through the
    // API, then the form is submitted — which is exactly the real race.
    await page.goto(base + '/articles/deploying-the-api-to-production/edit', { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    await page.request.patch(`${base}/api/articles/deploying-the-api-to-production`, {
      headers: { 'Content-Type': 'application/json', Origin: base },
      data: {
        version: 3,
        title: 'Deploying the API to Production',
        bodyMd: '## Overview\n\nA newer version written by someone else.\n',
        status: 'published',
        editorName: 'Screenshot',
      },
    });
    await page
      .getByRole('textbox', { name: 'Article body' })
      .fill('## Overview\n\nMy local edits, written against the stale version.\n');
    await page.locator('#article-save').click();
    await page.waitForTimeout(1200);
    await shot(page, `05-conflict-banner-${theme}`, { fullPage: false });

    // ── 6. The five empty states ────────────────────────────────────────────
    // State 2 — a search returns nothing.
    await page.goto(base + '/search?q=zzzzqqq', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await shot(page, `06-empty-search-${theme}`);

    // State 5 — a filter combination yields nothing.
    await page.goto(base + '/?status=draft&category=uncategorized', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await shot(page, `06-empty-filter-${theme}`);

    // State 3 — a category with no articles. `People` is emptied by archiving its one
    // published article, the same soft status change the E2E spec uses.
    await page.request.delete(`${base}/api/articles/onboarding-checklist-for-new-engineers`, {
      headers: { Origin: base },
    });
    await page.goto(base + '/categories/people', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await shot(page, `06-empty-category-${theme}`);

    // State 1 — no articles at all, and state 4 — no categories at all.
    emptyScratchDb();
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await shot(page, `06-empty-no-articles-${theme}`);

    emptyScratchDb({ categories: true });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await shot(page, `06-empty-no-categories-${theme}`);

    // ── 8. Command palette ──────────────────────────────────────────────────
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(400);
    await page.keyboard.type('deploy');
    await page.waitForTimeout(700);
    await shot(page, `08-palette-${theme}`, { fullPage: false });

    // ── 9. Tablet drawer at 834×1112 ────────────────────────────────────────
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.waitForTimeout(400);
    await shot(page, `09-tablet-drawer-${theme}`, { fullPage: false });

    // ── 10. The 404 page for a missing slug ─────────────────────────────────
    await page.goto(base + '/articles/this-article-does-not-exist', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await shot(page, `10-not-found-${theme}`);

    await context.close();

    // Restore the seeded dataset for the next theme's pass.
    execSync('npx tsx scripts/db-setup.ts --fresh --seed', { stdio: 'inherit' });
  }

  // ── 7. The archive confirm dialog (theme-independent) ───────────────────
  {
    const page = await browser
      .newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' })
      .then((c) => c.newPage());
    await page.goto(base + '/articles/incident-response-runbook', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.waitForTimeout(200);
    await page.getByRole('menuitem', { name: 'Archive article' }).click();
    await page.waitForTimeout(300);
    await shot(page, '07-archive-confirm-light', { fullPage: false });
  }

  await browser.close();
  console.log('\nAll screenshots written to docs/screenshots/.');
})();
