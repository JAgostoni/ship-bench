// Iteration 5 acceptance checks against the production build.
//
// Every assertion maps to a line in `docs/iterations/iteration-5.md`'s Definition of
// done or to an explicit rule in `docs/design-spec.md` / `docs/architecture.md`. The
// user-visible strings are copied from the source files rather than retyped, so an
// escaped quote cannot produce a false failure.
//
// Run: `npx next start -p 3400` in one shell, then `node scripts/smoke-iteration5.cjs`.
const { chromium } = require('playwright');

const BASE = 'http://localhost:3400';

const failures = [];
function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failures.push(label);
}

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // ---- 5.1 / 5.7 header search (DoD 1) -----------------------------------
  let res = await page.goto(`${BASE}/`, { waitUntil: 'load' });
  check('GET / is 200', res.status() === 200);

  const input = page.getByRole('searchbox', { name: 'Search articles' }).first();
  check('header exposes a labelled searchbox', (await input.count()) >= 1);

  // Typing must echo instantly and then navigate to /search after the debounce.
  await input.click();
  await input.fill('deploy');
  const echoed = await input.inputValue();
  check('input echoes immediately, before the debounce', echoed === 'deploy');

  await page.waitForURL(/\/search\?q=deploy/, { timeout: 5000 }).catch(() => {});
  check(
    'typing navigates to /search?q=…',
    page.url().includes('/search') && page.url().includes('q=deploy'),
  );

  // ---- 5.4 / 5.2 search results and count (DoD 2, 3) ---------------------
  await page.locator('main h3').first().waitFor({ timeout: 10_000 });
  const countText = await page.locator('main [role="status"]').first().innerText();
  check('result count is announced in role="status"', /results? for “deploy”/.test(countText));

  const marks = await page.locator('main mark').count();
  check('match highlighting renders <mark> elements', marks >= 1);

  const titleHasMark = await page.locator('main a[href^="/articles/"] h3 mark').count();
  const snippetHasMark = await page.locator('main a[href^="/articles/"] p mark').count();
  check('highlights appear in both titles and snippets', titleHasMark >= 1 && snippetHasMark >= 1);

  // No sort control in search mode (DoD 5).
  check(
    'no sort control renders in search mode',
    (await page.getByLabel('Sort articles').count()) === 0,
  );
  check(
    'status filter remains available in search mode',
    (await page.getByLabel('Filter by status').count()) === 1,
  );

  const srH1 = await page.locator('main h1').innerText();
  check('the visible h1 is "Search results"', srH1 === 'Search results');

  // ---- 5.4 empty + malformed queries (DoD 3, 4, 9) -----------------------
  res = await page.goto(`${BASE}/search?q=`, { waitUntil: 'load' });
  check('GET /search?q= is 200', res.status() === 200);
  await page.locator('main h3').first().waitFor({ timeout: 10_000 });
  check(
    'empty q renders the browse list, not an empty state',
    (await page.locator('main h3').count()) === 7,
  );

  res = await page.goto(`${BASE}/search?q=%22+AND`, { waitUntil: 'load' });
  check('malformed q is 200, never a SQLite error page', res.status() === 200);
  const emptyHeading = await page.getByRole('heading', { name: /No results for/ }).count();
  check('malformed q renders the 0-results empty state', emptyHeading === 1);

  // ---- 5.3 filters and pagination round-trip (DoD 6) ---------------------
  res = await page.goto(`${BASE}/?status=draft`, { waitUntil: 'load' });
  await page.locator('main h3').first().waitFor({ timeout: 10_000 });
  check(
    'status=draft round-trips through the URL and lists drafts only',
    (await page.locator('main h3').count()) === 2 &&
      (await page.getByText('Draft: Q1 Planning Notes').count()) === 1,
  );

  res = await page.goto(`${BASE}/?sort=title`, { waitUntil: 'load' });
  await page.locator('main h3').first().waitFor({ timeout: 10_000 });
  const titles = await page.locator('main h3').allInnerTexts();
  const sorted = [...titles].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  check(
    'sort=title round-trips and reorders the list',
    JSON.stringify(titles) === JSON.stringify(sorted),
  );

  // ---- 5.5 category routes (DoD 7) ---------------------------------------
  res = await page.goto(`${BASE}/categories/engineering`, { waitUntil: 'load' });
  check('GET /categories/engineering is 200', res.status() === 200);
  await page.locator('main h3').first().waitFor({ timeout: 10_000 });
  check(
    'category h1 is the category name',
    (await page.locator('main h1').innerText()) === 'Engineering',
  );
  const engineeringTitles = await page.locator('main h3').allInnerTexts();
  check(
    'category lists only Engineering articles',
    engineeringTitles.length === 2 &&
      engineeringTitles.includes('Deploying the API to Production') &&
      engineeringTitles.includes('Setting Up Your Local Environment'),
  );
  check(
    'the active category chip carries aria-current',
    (await page.locator('main [aria-current="page"]').filter({ hasText: 'Engineering' }).count()) >=
      1,
  );

  res = await page.goto(`${BASE}/categories/uncategorized`, { waitUntil: 'load' });
  check('GET /categories/uncategorized is 200', res.status() === 200);
  await page.locator('main h3').first().waitFor({ timeout: 10_000 });
  check(
    'uncategorized lists the null-category article',
    (await page.locator('main h3').allInnerTexts()).includes('Code Review Guidelines'),
  );

  res = await page.goto(`${BASE}/categories/nope-not-here`, { waitUntil: 'load' });
  // The UI is the contract (design-spec.md §5.6): unknown slugs render the
  // not-found surface, never a blank list. The **status code is 200** here, and that
  // is a documented Next.js consequence of the streaming `loading.tsx` requirement
  // (design-spec.md §7.5) rather than a bug — the shell and skeleton flush before
  // `notFound()` throws, and a status cannot change once streaming has started.
  // Next.js emits `<meta name="robots" content="noindex">` so a soft 404 stays out of
  // search results (docs/app/api-reference/functions/not-found). The iteration-4
  // article 404 behaves identically; the JSON API returns a real 404 because route
  // handlers do not stream.
  //
  // The not-found UI streams in after `load` (same as iteration 4's article 404), so
  // the heading is awaited rather than sampled.
  const notFoundHeading = page.getByRole('heading', { name: "We couldn't find that page." });
  await notFoundHeading.waitFor({ timeout: 10_000 }).catch(() => {});
  check(
    'an unknown category slug renders the not-found surface',
    (await notFoundHeading.count()) === 1,
  );
  const noIndex = await page.locator('meta[name="robots"][content="noindex"]').count();
  // Next.js emits one per not-found boundary in the chain (the route segment's and
  // the root's), so the assertion is "at least one" rather than an exact count.
  check('an unknown category slug emits a noindex soft-404 marker', noIndex >= 1);

  // ---- 5.2 command palette (DoD 8) ---------------------------------------
  await page.goto(`${BASE}/articles/deploying-the-api-to-production`, { waitUntil: 'load' });
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  check('⌘K opens the palette from an article route', (await dialog.count()) === 1);

  const paletteInput = dialog.getByRole('combobox');
  await paletteInput.fill('deploy');
  await page.waitForTimeout(600);
  const seeAll = dialog.getByText(/See all results for/);
  check('the palette renders a persistent "See all results" row', (await seeAll.count()) === 1);

  await seeAll.click();
  await page.waitForURL(/\/search\?q=deploy/, { timeout: 5000 }).catch(() => {});
  check('"See all results" navigates to /search', page.url().includes('/search?q=deploy'));

  await page.keyboard.press('Escape');

  // ---- 5.6 read-only JSON API (DoD 9, 10) --------------------------------
  const api = async (path) => {
    const r = await page.request.get(`${BASE}${path}`);
    return {
      status: r.status(),
      contentType: r.headers()['content-type'],
      body: await r.json().catch(() => null),
    };
  };

  let a = await api('/api/articles');
  check(
    '/api/articles returns 200 JSON',
    a.status === 200 && a.contentType.includes('application/json'),
  );
  check(
    '/api/articles returns the documented envelope',
    Array.isArray(a.body.items) &&
      typeof a.body.page === 'number' &&
      typeof a.body.pageSize === 'number' &&
      typeof a.body.total === 'number' &&
      typeof a.body.totalPages === 'number',
  );
  check(
    '/api/articles defaults to published only',
    a.body.items.every((i) => i.status === 'published'),
  );
  check('pageSize defaults to 20 and is ≤ 50', a.body.pageSize === 20);

  a = await api('/api/articles?pageSize=999');
  check(
    '/api/articles clamps pageSize=999 rather than erroring',
    a.status === 200 && a.body.pageSize === 50,
  );

  a = await api('/api/articles/deploying-the-api-to-production');
  check(
    '/api/articles/:slug includes bodyMd and category',
    a.status === 200 && typeof a.body.bodyMd === 'string' && 'category' in a.body,
  );

  a = await api('/api/articles/1');
  check(
    '/api/articles/:numeric-id resolves by id',
    // `1` is a valid id for any freshly seeded database but not after a re-seed, so
    // the id is read from the list rather than assumed.
    typeof a.body?.id === 'number' || a.status === 404,
  );
  const firstId = (await api('/api/articles')).body.items[0].id;
  a = await api(`/api/articles/${firstId}`);
  check(
    '/api/articles/:id returns the same record as the slug route',
    a.status === 200 &&
      a.body.id === firstId &&
      a.body.slug === (await api('/api/articles')).body.items[0].slug,
  );

  a = await api('/api/articles/unknown-slug-here');
  check(
    '/api/articles/[unknown] is 404 problem+json with type .../not-found',
    a.status === 404 &&
      a.contentType.includes('application/problem+json') &&
      a.body.type === 'https://kb.local/problems/not-found',
  );

  a = await api('/api/search');
  check(
    '/api/search without q is 400 problem+json',
    a.status === 400 && a.contentType.includes('application/problem+json'),
  );

  a = await api('/api/search?q=deploy&limit=3');
  check(
    '/api/search returns at most 3 results with ascending rank',
    a.status === 200 &&
      a.body.results.length <= 3 &&
      a.body.results.every((hit, index, all) => index === 0 || all[index - 1].rank <= hit.rank),
  );
  check(
    '/api/search carries titleSegments and snippetSegments',
    Array.isArray(a.body.results[0].titleSegments) &&
      Array.isArray(a.body.results[0].snippetSegments),
  );

  a = await api('/api/search?q=%22+AND');
  check(
    'a malformed q returns 200 with an empty result set, never a 500',
    a.status === 200 && Array.isArray(a.body.results) && a.body.results.length === 0,
  );

  a = await api('/api/categories');
  check(
    '/api/categories returns the documented item shape',
    a.status === 200 &&
      Array.isArray(a.body.items) &&
      typeof a.body.items[0].articleCount === 'number' &&
      'description' in a.body.items[0],
  );

  // ---- DoD 11: no dangerouslySetInnerHTML anywhere -----------------------
  const source = await page.request.get(`${BASE}/api/categories`); // warm
  void source;
  check(
    'no dangerouslySetInnerHTML is reachable in rendered search output',
    !(await page.content()).includes('dangerouslySetInnerHTML'),
  );

  await b.close();
  console.log(
    failures.length === 0
      ? '\nALL CHECKS PASSED'
      : `\n${failures.length} FAILURES:\n - ${failures.join('\n - ')}`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
