// Iteration 8.1: first-load JS per route (`architecture.md` §13.1).
//
// Turbopack's `next build` prints the route table without per-route first-load JS,
// so this measures the thing the budget actually names: fetch the route's HTML,
// collect every same-origin `<script src>` it references, and sum the gzip size of
// those files. That is the JS the browser must download before the route is
// interactive, including the chunks Next preloads for client navigation.
//
// Run against a running server: `node scripts/perf-bundle.cjs http://127.0.0.1:3200`
const http = require('node:http');
const { gzipSync } = require('node:zlib');

const base = process.argv[2] ?? 'http://127.0.0.1:3200';
const url = new URL(base);

function get(path) {
  return new Promise((resolve, reject) => {
    http
      .get(
        { hostname: url.hostname, port: url.port, path, headers: { connection: 'close' } },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }),
          );
          res.on('error', reject);
        },
      )
      .on('error', reject);
  });
}

/** Every `<script src="...">` in the HTML, same-origin only, de-duplicated. */
function scriptSources(html) {
  const found = new Set();
  for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
    const src = m[1];
    if (src.startsWith('/')) found.add(src);
  }
  return [...found];
}

async function route(label, path, budgetKb) {
  const { status, body } = await get(path);
  if (status >= 400) {
    console.log(`${label.padEnd(28)} HTTP ${status}`);
    return null;
  }
  const sources = scriptSources(body.toString('utf8'));
  let raw = 0;
  let gz = 0;
  for (const src of sources) {
    const asset = await get(src);
    if (asset.status !== 200) continue;
    raw += asset.body.length;
    gz += gzipSync(asset.body, { level: 9 }).length;
  }
  const gzKb = gz / 1024;
  const verdict = budgetKb ? (gzKb < budgetKb ? 'PASS' : 'FAIL') : '—';
  console.log(
    `${label.padEnd(28)} ${sources.length} scripts  raw ${(raw / 1024).toFixed(1).padStart(7)} KB  gzip ${gzKb.toFixed(1).padStart(6)} KB  budget ${String(budgetKb ?? '—').padStart(5)} KB  ${verdict}`,
  );
  return { scripts: sources.length, rawBytes: raw, gzipBytes: gz };
}

(async () => {
  const results = {
    browse: await route('browse /', '/', 150),
    editorEdit: await route('editor .../edit', '/articles/deploy-guide-1/edit', 320),
    articleDetail: await route('detail /articles/[slug]', '/articles/deploy-guide-1', null),
    search: await route('search /search', '/search?q=deploy', null),
  };
  console.log('\n' + JSON.stringify(results, null, 2));
})();
