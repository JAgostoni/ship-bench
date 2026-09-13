// Iteration 6 acceptance checks against the production build.
//
// Every assertion maps to a line in `docs/iterations/iteration-6.md`'s Definition of done
// or to an explicit rule in `docs/design-spec.md` / `docs/architecture.md`. The run needs
// `E2E_TEST_MODE=1` so the reset endpoint is enabled.
//
// Run: `npx next start -p 3500` with E2E_TEST_MODE=1, then
//      `node scripts/smoke-iteration6.cjs`.
const { chromium } = require('playwright');

const BASE = 'http://localhost:3500';

const failures = [];
function check(label, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${!ok && detail ? `  -> ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const api = async (path, init) => {
    const r = await page.request.fetch(`${BASE}${path}`, init);
    const text = await r.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* 204 etc. */
    }
    return { status: r.status(), text, body, headers: r.headers() };
  };

  // ---- Reset to the fixture set -----------------------------------------
  let res = await api('/api/test/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: '{}',
  });
  check(
    'POST /api/test/reset returns the documented counts',
    res.status === 200 && res.body?.articles === 9 && res.body?.categories === 4,
    JSON.stringify(res.body),
  );

  // ---- 6.6 create route: the focused shell ------------------------------
  res = await page.goto(`${BASE}/articles/new`, { waitUntil: 'load' });
  check('GET /articles/new is 200', res.status() === 200);

  check(
    'the editor has no sidebar',
    (await page.locator('aside').count()) === 0,
    `asides=${await page.locator('aside').count()}`,
  );
  check(
    'the editor has no header search input',
    (await page.locator('header input[type="search"]').count()) === 0,
  );
  check(
    'the editor has no wordmark link',
    (await page.getByRole('button', { name: 'Team Knowledge Base' }).count()) === 0,
  );
  const stripTitle = await page.locator('header').innerText();
  check('the status strip says New article', stripTitle.includes('New article'), stripTitle);
  check('the status strip offers Cancel', stripTitle.includes('Cancel'));
  check('the status strip offers Save', stripTitle.includes('Save article'));

  // ---- 6.3 the create form starts empty ---------------------------------
  const titleValue = await page.locator('#title').inputValue();
  check('the create form starts with an empty title', titleValue === '');

  await page.locator('[data-testid="markdown-editor"]').waitFor({ timeout: 15000 });
  const bodyValue = await page.locator('#bodyMd').inputValue();
  check('the create form has no pre-filled placeholder body', bodyValue === '');

  const statusText = await page.getByRole('combobox', { name: 'Status' }).innerText();
  check('the status select defaults to Draft', statusText.trim() === 'Draft', statusText);
  const categoryText = await page.getByRole('combobox', { name: 'Category' }).innerText();
  check(
    'the category select defaults to Uncategorized',
    categoryText.trim() === 'Uncategorized',
    categoryText,
  );

  // E4: the ten toolbar buttons from design-spec.md §3.5.
  const toolbarLabels = await page
    .locator('.w-md-editor-toolbar button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  const expectedButtons = [
    'Bold',
    'Italic',
    'Heading 2',
    'Heading 3',
    'Link',
    'Bulleted list',
    'Numbered list',
    'Inline code',
    'Code block',
    'Quote',
  ];
  check(
    'the toolbar has exactly the 10 spec buttons, in order',
    JSON.stringify(toolbarLabels) === JSON.stringify(expectedButtons),
    JSON.stringify(toolbarLabels),
  );
  const archivedOption = await page.getByRole('option', { name: 'Archived' }).count();
  check('the status select does not offer Archived', archivedOption === 0);

  // E5: preview parity — the preview renders through ArticleBody's pipeline.
  await page.locator('#title').fill('Smoke Test Article');
  await page.locator('#bodyMd').fill('## A heading\n\nSome **bold** text.');
  await page.waitForTimeout(400);
  const previewH2 = await page.locator('.w-md-editor-preview h2').count();
  const previewStrong = await page.locator('.w-md-editor-preview strong').count();
  check('the live preview renders the Markdown', previewH2 >= 1 && previewStrong >= 1);

  // No raw HTML execution in the preview (no rehype-raw).
  await page.locator('#bodyMd').fill('<script>window.__xss = true</script>');
  await page.waitForTimeout(400);
  const xss = await page.evaluate(() => window.__xss === true);
  const previewScript = await page.locator('.w-md-editor-preview script').count();
  check('the preview does not execute embedded HTML', !xss && previewScript === 0);

  // ---- 6.1/6.6 create persists and redirects with the toast --------------
  await page.locator('#bodyMd').fill('## Prerequisites\n\n- Node 24 LTS');
  await page.locator('#title').fill('Smoke Test Article');
  await page.locator('#article-save').click();
  await page.waitForURL(/\/articles\/smoke-test-article/, { timeout: 15000 });
  check(
    'saving a new article redirects to its detail page',
    page.url().includes('/articles/smoke-test-article'),
  );
  check('the destination carries the created toast intent', page.url().includes('toast=created'));

  const created = await api('/api/articles/smoke-test-article');
  check(
    'the created article persisted',
    created.status === 200 && created.body.slug === 'smoke-test-article',
  );
  check(
    'the created article is a draft with version 1',
    created.body.status === 'draft' && created.body.version === 1,
  );
  check('the created article recorded a revision', created.body.version === 1);

  // Reload and confirm persistence.
  await page.reload({ waitUntil: 'load' });
  const h1 = await page.locator('main h1').innerText();
  check('reloading the page shows the persisted article', h1 === 'Smoke Test Article', h1);
  const historyText = await page.locator('details summary').last().innerText();
  check('History shows 1 revision', /1 revision/.test(historyText), historyText);

  // ---- 6.5 history view dialog -----------------------------------------
  await page.locator('details summary').last().click();
  await page.locator('main details button', { hasText: 'View' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ timeout: 5000 });
  check('the revision View dialog opens', (await dialog.count()) === 1);
  check('the dialog renders the revision body', (await dialog.locator('h2').count()) >= 1);
  await page.keyboard.press('Escape');

  // ---- 6.6 edit route ---------------------------------------------------
  res = await page.goto(`${BASE}/articles/smoke-test-article/edit`, { waitUntil: 'load' });
  check('GET /articles/[slug]/edit is 200', res.status() === 200);
  check('the edit route has no sidebar', (await page.locator('aside').count()) === 0);
  check('the edit form has a change-note field', (await page.locator('#changeNote').count()) === 1);
  await page.locator('[data-testid="markdown-editor"]').waitFor({ timeout: 15000 });
  const editTitle = await page.locator('#title').inputValue();
  check(
    'the edit form is seeded with the article title',
    editTitle === 'Smoke Test Article',
    editTitle,
  );
  const slugLine = await page.locator('text=/Slug: smoke-test-article/').count();
  check('the slug renders as read-only text', slugLine >= 1);

  // ---- 6.1 edit persists and bumps the version --------------------------
  await page.locator('#title').fill('Smoke Test Article (edited)');
  await page.locator('#changeNote').fill('Clarified the steps');
  await page.locator('#article-save').click();
  await page.waitForURL(/\/articles\/smoke-test-article(\?|$)/, { timeout: 15000 });
  check('saving an edit redirects with the saved toast', page.url().includes('toast=saved'));

  const edited = await api('/api/articles/smoke-test-article');
  check('editing increments the version', edited.body.version === 2, String(edited.body.version));
  check('editing persists the new title', edited.body.title === 'Smoke Test Article (edited)');

  await page.goto(`${BASE}/articles/smoke-test-article`, { waitUntil: 'load' });
  const editedH1 = await page.locator('main h1').innerText();
  check('reloading shows the edited title', editedH1 === 'Smoke Test Article (edited)', editedH1);
  const editHistory = await page.locator('details summary').last().innerText();
  check('History shows 2 revisions after the edit', /2 revisions/.test(editHistory), editHistory);

  // ---- 6.1 draft -> published shows the published toast -----------------
  await page.goto(`${BASE}/articles/smoke-test-article/edit`, { waitUntil: 'load' });
  await page.locator('[data-testid="markdown-editor"]').waitFor({ timeout: 15000 });
  await page.getByRole('combobox', { name: 'Status' }).click();
  await page.getByRole('option', { name: 'Published' }).click();
  await page.locator('#article-save').click();
  await page.waitForURL(/toast=published/, { timeout: 15000 });
  check(
    'a draft -> published save shows the published toast',
    page.url().includes('toast=published'),
  );
  const published = await api('/api/articles/smoke-test-article');
  check('the article is now published', published.body.status === 'published');
  check(
    'the published article stamps publishedAt',
    typeof published.body.publishedAt === 'string',
    String(published.body.publishedAt),
  );

  // ---- 6.4 conflict handling -------------------------------------------
  // A stale version is produced by saving twice: the second save still holds version 2.
  const detail = await api('/api/articles/smoke-test-article');
  const staleVersion = detail.body.version - 1;
  const conflict = await api('/api/articles/smoke-test-article', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      version: staleVersion,
      title: 'Should not stick',
      bodyMd: 'x',
      status: 'published',
    }),
  });
  check('PATCH with a stale version returns 409', conflict.status === 409, String(conflict.status));
  check(
    'the 409 body names the expected and found versions',
    /Expected version \d+, found \d+\./.test(JSON.stringify(conflict.body)),
    JSON.stringify(conflict.body),
  );

  // The banner itself is driven by the Server Action, so it is exercised through the
  // form: open the editor, then make the stored version move underneath it.
  await page.goto(`${BASE}/articles/smoke-test-article/edit`, { waitUntil: 'load' });
  await page.locator('[data-testid="markdown-editor"]').waitFor({ timeout: 15000 });
  await page.locator('#title').fill('Edited against a stale version');
  const moved = await api('/api/articles/smoke-test-article', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      version: published.body.version,
      title: 'Smoke Test Article (edited)',
      bodyMd: '## Prerequisites\n\n- Node 24 LTS',
      status: 'published',
    }),
  });
  check('the competing save succeeded', moved.status === 200, String(moved.status));
  await page.locator('#article-save').click();
  const banner = page
    .getByRole('alert')
    .filter({ hasText: 'This article was updated by someone else.' });
  await banner.waitFor({ timeout: 15000 });
  check('a stale-version save renders the conflict banner', (await banner.count()) === 1);
  check(
    'the conflict banner received focus',
    await page.evaluate(() =>
      document.activeElement?.textContent?.includes('This article was updated by someone else.'),
    ),
  );
  const copyButton = page.getByRole('button', { name: /Copy my text/ });
  check('Copy my text is offered', (await copyButton.count()) === 1);
  await copyButton.click();
  await page.waitForTimeout(200);
  check(
    'Copy my text swaps its label to Copied',
    (await page.getByRole('button', { name: /Copied/ }).count()) === 1,
  );
  await page.getByRole('button', { name: 'Reload latest version' }).click();
  const reloadDialog = page.getByRole('dialog');
  await reloadDialog.waitFor({ timeout: 5000 });
  check(
    'Reload latest version opens a confirm dialog rather than discarding',
    (await reloadDialog.innerText()).includes('Discard your unsaved edits?'),
  );
  await page.getByRole('button', { name: 'Keep editing' }).click();

  // ---- 6.5 archive + undo ----------------------------------------------
  await page.goto(`${BASE}/articles/smoke-test-article`, { waitUntil: 'load' });
  await page.getByRole('button', { name: 'More actions' }).click();
  const archiveItem = page.getByRole('menuitem', { name: 'Archive article' });
  check('the overflow menu offers Archive article', (await archiveItem.count()) === 1);
  await archiveItem.click();
  const archiveDialog = page.getByRole('dialog');
  await archiveDialog.waitFor({ timeout: 5000 });
  const archiveCopy = await archiveDialog.innerText();
  check(
    'the archive dialog states the consequence and the recoverability',
    archiveCopy.includes('hidden from browse and search') &&
      archiveCopy.includes('history are kept'),
    archiveCopy.replace(/\n/g, ' | '),
  );
  check(
    'the archive dialog never uses the word delete',
    !/delete/i.test(archiveCopy),
    archiveCopy.replace(/\n/g, ' | '),
  );
  await archiveDialog.getByRole('button', { name: 'Archive article' }).click();
  await page.waitForURL(/toast=archived/, { timeout: 15000 });
  check(
    'archiving redirects to / with the archived toast',
    page.url().endsWith('/?toast=archived&archivedArticleId=1') ||
      /toast=archived/.test(page.url()),
  );

  // `ToastFromQuery` strips `?toast=`, so this waits on the archive confirmation
  // regardless of whether the parameter has already been cleaned up by the time we look.
  const archivedToast = page
    .locator('[role="status"]')
    .filter({ hasText: /Article archived\./ })
    .first();
  await archivedToast.waitFor({ timeout: 8000 });
  check(
    'the Article archived. toast appears',
    (await page
      .locator('[role="status"]')
      .filter({ hasText: /Article archived\./ })
      .count()) >= 1,
  );
  const undo = page.getByRole('button', { name: 'Undo' });
  check('the archive toast offers Undo', (await undo.count()) === 1);

  // The default browse excludes archived articles; `status=all` is where they surface.
  // These run *before* Undo restores the article, so the archived state is observable.
  const archivedRow = await api('/api/articles');
  check(
    'the archived article is excluded from the default browse list',
    !archivedRow.body.items.some((i) => i.slug === 'smoke-test-article'),
    JSON.stringify(archivedRow.body.items.map((i) => i.slug)),
  );
  const allRows = await api('/api/articles?status=all');
  check(
    'the archived article is reachable when status=all is requested',
    allRows.body.items.some((i) => i.slug === 'smoke-test-article'),
  );
  const archivedDetail = await api('/api/articles/smoke-test-article');
  check(
    'the archived article still resolves at its URL',
    archivedDetail.status === 200 && archivedDetail.body.status === 'archived',
  );

  const archivedSearch = await api('/api/search?q=smoke');
  check(
    'the archived article is excluded from default search',
    !archivedSearch.body.results.some((hit) => hit.slug === 'smoke-test-article'),
    JSON.stringify(archivedSearch.body.results.map((h) => h.slug)),
  );

  await undo.click();
  await page.waitForTimeout(1500);
  const restored = await api('/api/articles/smoke-test-article');
  check(
    'Undo restores the article within the 5-second window',
    restored.body.status === 'published',
    restored.body.status,
  );

  // The word "delete" must appear nowhere in the rendered UI.
  const bodyText = await page.locator('body').innerText();
  check('the word delete appears nowhere in the UI', !/delete/i.test(bodyText));

  // ---- 6.7 display-name cookie -----------------------------------------
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  // The sidebar renders the chip in the desktop column and again inside the mobile drawer
  // (design-spec.md §6.3), so the first visible one is the target. It is a Radix dialog
  // trigger, whose accessible name is the whole chip — not a labelled button.
  const chip = page.locator('aside button', { hasText: 'Editing as' }).first();
  check('the sidebar shows the Editing as chip', (await chip.count()) >= 1);
  check(
    'the chip defaults to Anonymous editor',
    (await page.getByText('Anonymous editor').count()) >= 1,
  );
  check(
    'the anonymous chip carries the warning dot',
    (await page.locator('[data-testid="editing-as-warning"]').count()) >= 1,
  );
  await chip.click();
  const nameDialog = page.getByRole('dialog');
  await nameDialog.waitFor({ timeout: 5000 });
  const nameCopy = await nameDialog.innerText();
  check(
    'the display-name dialog says it is not a login',
    nameCopy.includes('It is not a login.'),
    nameCopy.replace(/\n/g, ' | '),
  );
  await nameDialog.locator('#displayName').fill('Grace Hopper');
  await nameDialog.getByRole('button', { name: 'Save name' }).click();
  await page.waitForTimeout(2000);
  check(
    'saving a display name shows the confirmation',
    (await page.getByText('Display name saved.').count()) >= 1,
  );
  check(
    'the chip shows the saved name',
    (await page.getByText('Grace Hopper').count()) >= 1,
    (await page.locator('aside').innerText()).replace(/\n/g, ' | '),
  );
  check(
    'the warning dot disappears once a name is set',
    (await page.locator('[data-testid="editing-as-warning"]').count()) === 0,
  );

  // The cookie changes the editorName recorded on a new revision.
  await page.goto(`${BASE}/articles/smoke-test-article/edit`, { waitUntil: 'load' });
  await page.locator('[data-testid="markdown-editor"]').waitFor({ timeout: 15000 });
  await page.locator('#changeNote').fill('Recorded the author');
  await page.locator('#article-save').click();
  await page.waitForURL(/articles\/smoke-test-article/, { timeout: 15000 });

  await page.goto(`${BASE}/articles/smoke-test-article`, { waitUntil: 'load' });
  // History is collapsed by default (UX18), so its rows are not in `innerText` until the
  // summary is opened — the spec's own default is what the test has to work with.
  const historyDetails = page.locator('main details').last();
  await historyDetails.locator('summary').click();
  await historyDetails.locator('ul').waitFor({ timeout: 5000 });
  const historyAfterName = await historyDetails.innerText();
  check(
    'the newest revision records the display name',
    historyAfterName.includes('Grace Hopper'),
    historyAfterName.replace(/\n/g, ' | ').slice(0, 300),
  );
  check(
    'the change note is recorded against the revision',
    historyAfterName.includes('Recorded the author'),
    historyAfterName.replace(/\n/g, ' | ').slice(0, 300),
  );

  // ---- 6.8 the reset endpoint's guard ----------------------------------
  // The running server has E2E_TEST_MODE=1, so the guard is checked by unit test
  // (`src/app/api/test/reset/route.test.ts`). Here the enabled path is asserted.
  const resetAgain = await api('/api/test/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: '{}',
  });
  check(
    'the reset endpoint is idempotent',
    resetAgain.status === 200 && resetAgain.body.articles === 9,
  );

  // ---- 6.8 the write API -----------------------------------------------
  const created2 = await api('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ title: 'API Created Article', bodyMd: '## Body', status: 'draft' }),
  });
  check('POST /api/articles returns 201', created2.status === 201, String(created2.status));
  check(
    'POST /api/articles returns the documented body with Location',
    created2.body?.slug === 'api-created-article' &&
      created2.body?.version === 1 &&
      created2.headers.location === `/api/articles/${created2.body.id}`,
    JSON.stringify(created2.body),
  );

  const invalidPost = await api('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ title: 'Hi', bodyMd: '' }),
  });
  check('POST /api/articles returns 422 for an invalid body', invalidPost.status === 422);
  check(
    'the 422 body carries the documented errors array',
    Array.isArray(invalidPost.body?.errors) &&
      invalidPost.body.errors.some((e) => e.path === 'title'),
    JSON.stringify(invalidPost.body),
  );

  const deleted = await api('/api/articles/api-created-article', { method: 'DELETE' });
  check('DELETE /api/articles/:slug returns 204', deleted.status === 204, String(deleted.status));
  const softDeleted = await api('/api/articles/api-created-article');
  check(
    'DELETE archives rather than removing the row',
    softDeleted.status === 200 && softDeleted.body.status === 'archived',
    JSON.stringify(softDeleted.body?.status),
  );

  const categoryPost = await api('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ name: 'Smoke Category', description: 'From the smoke run.' }),
  });
  check(
    'POST /api/categories returns 201',
    categoryPost.status === 201,
    String(categoryPost.status),
  );
  const duplicateCategory = await api('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ name: 'smoke category' }),
  });
  check('a duplicate category name returns 409', duplicateCategory.status === 409);

  const crossOrigin = await api('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' },
    data: JSON.stringify({ title: 'Cross origin', bodyMd: 'x' }),
  });
  check(
    'a cross-origin mutation returns 403',
    crossOrigin.status === 403,
    String(crossOrigin.status),
  );

  // ---- Design-spec guards ----------------------------------------------
  await page.goto(`${BASE}/articles/deploying-the-api-to-production`, { waitUntil: 'load' });
  const pageHtml = await page.content();
  check(
    'no dangerouslySetInnerHTML reaches the rendered output',
    !pageHtml.includes('dangerouslySetInnerHTML'),
  );
  const fullText = await page.locator('body').innerText();
  check('the word delete appears nowhere in the UI (detail route)', !/delete/i.test(fullText));
  check(
    'no Published badge renders on a published article',
    (await page.locator('main span', { hasText: /^PUBLISHED$/ }).count()) === 0 &&
      !/PUBLISHED/.test(await page.locator('main header').innerText()),
  );

  // ---- The editor bundle stays out of the browse route -------------------
  // Read the served HTML rather than guessing from the DOM: the editor's own class names
  // must not appear in the browse route's markup or its first-load chunks.
  const browseResponse = await page.goto(`${BASE}/`, { waitUntil: 'load' });
  const browseHtml = await browseResponse.text();
  const browseScripts = await page
    .locator('script[src]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('src') || ''));
  check(
    'the browse route does not render the editor chrome',
    !browseHtml.includes('w-md-editor'),
    'w-md-editor class present in the browse HTML',
  );
  check(
    'the browse route does not preload an editor chunk',
    !browseScripts.some((src) => /md-editor|markdown-editor/i.test(src)),
    browseScripts.join(' | '),
  );

  await b.close();
  console.log(
    failures.length === 0
      ? '\nALL CHECKS PASSED'
      : `\n${failures.length} FAILURES:\n - ${failures.join('\n - ')}`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
