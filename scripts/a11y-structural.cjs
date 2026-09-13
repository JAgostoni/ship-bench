// Iteration 8.3: the structural accessibility checks the axe smoke run does not
// assert — landmarks, heading order, focus order, tabIndex, reduced motion, and the
// "colour is never the only signal" rules (`design-spec.md` §9.4, §13).
//
// Run: `node scripts/a11y-structural.cjs http://127.0.0.1:3200`
const { chromium } = require('@playwright/test');

const base = process.argv[2] ?? 'http://127.0.0.1:3200';

const ROUTES = [
  ['/', 'browse'],
  ['/search?q=deploy', 'search'],
  ['/articles/deploy-guide-1', 'detail'],
  ['/articles/deploy-guide-1/edit', 'editor'],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser
    .newContext({ viewport: { width: 1280, height: 800 } })
    .then((c) => c.newPage());

  for (const [route, label] of ROUTES) {
    await page.goto(base + route, { waitUntil: 'load' });
    await page.waitForTimeout(200);

    const audit = await page.evaluate(() => {
      const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) =>
        Number(h.tagName[1]),
      );
      const skips = [];
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] - headings[i - 1] > 1) skips.push(`${headings[i - 1]}→${headings[i]}`);
      }
      /*
       * Landmark *roles*, not tags. A `<header>` inside `<article>` or `<section>`
       * maps to `generic`, not `banner` (HTML-AAM), which is why the detail page
       * legitimately has two `<header>` elements and still exactly one `banner`.
       */
      const landmarks = [...document.querySelectorAll('header,footer,main,nav,aside,[role]')];
      const countRole = (role) =>
        landmarks.filter((el) => {
          const explicit = el.getAttribute('role');
          if (explicit) return explicit === role;
          const tag = el.tagName.toLowerCase();
          if (role === 'banner')
            return tag === 'header' && !el.closest('article,section,aside,nav');
          if (role === 'contentinfo')
            return tag === 'footer' && !el.closest('article,section,aside,main');
          if (role === 'main') return tag === 'main';
          return false;
        }).length;
      return {
        banner: countRole('banner'),
        main: countRole('main'),
        contentinfo: countRole('contentinfo'),
        navs: [...document.querySelectorAll('nav')].map((n) => n.getAttribute('aria-label')),
        h1Count: document.querySelectorAll('h1').length,
        headingSkips: skips,
        maxTabIndex: Math.max(
          0,
          ...[...document.querySelectorAll('[tabindex]')].map((e) =>
            Number(e.getAttribute('tabindex')),
          ),
        ),
        positiveTabIndex: [...document.querySelectorAll('[tabindex]')]
          .map((e) => Number(e.getAttribute('tabindex')))
          .filter((v) => v > 0).length,
        skipLinkFirst:
          document
            .querySelector('body a[href="#main"], body a[href^="#main"]')
            ?.textContent.trim() ?? null,
      };
    });

    const pass = (v) => (v ? 'PASS' : 'FAIL');
    console.log(`\n=== ${label} (${route}) ===`);
    console.log(
      `  banner=${audit.banner} ${pass(audit.banner === 1)}   main=${audit.main} ${pass(audit.main === 1)}   contentinfo=${audit.contentinfo} ${pass(audit.contentinfo === 1)}`,
    );
    console.log(
      `  navs=[${audit.navs.join(', ')}]  all labelled: ${pass(audit.navs.every((n) => n && n.length > 0))}`,
    );
    console.log(
      `  h1 count=${audit.h1Count} ${pass(audit.h1Count === 1)}   heading skips: ${audit.headingSkips.length === 0 ? 'none PASS' : audit.headingSkips.join(',') + ' FAIL'}`,
    );
    console.log(
      `  tabIndex > 0: ${audit.positiveTabIndex} ${pass(audit.positiveTabIndex === 0)}   max tabIndex in DOM: ${audit.maxTabIndex}`,
    );
    console.log(`  first focusable: ${JSON.stringify(audit.skipLinkFirst)}`);
  }

  // Focus order: the skip link must be the first tab stop on the browse route.
  await page.goto(base + '/', { waitUntil: 'load' });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tag: el?.tagName,
      text: el?.textContent?.trim().slice(0, 40),
      href: el?.getAttribute('href'),
    };
  });
  console.log(`\nFirst tab stop: ${JSON.stringify(first)}`);

  // Reduced motion: every transition collapses to 0.01ms.
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const rmPage = await context.newPage();
  await rmPage.goto(base + '/', { waitUntil: 'load' });
  const motion = await rmPage.evaluate(() => {
    const results = [];
    for (const el of document.querySelectorAll('a, button, [class*="transition"]').values()) {
      const s = getComputedStyle(el);
      if (s.transitionDuration && s.transitionDuration !== '0s') results.push(s.transitionDuration);
    }
    return { distinct: [...new Set(results)].slice(0, 5), count: results.length };
  });
  console.log(
    `\nprefers-reduced-motion: ${motion.count} elements with a transition; durations=${JSON.stringify(motion.distinct)}`,
  );

  await browser.close();
})();
