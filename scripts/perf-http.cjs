// Iteration 8.1 over HTTP. Measures the real server render path (`architecture.md`
// §13.1) against a running server backed by the 2,000-article perf dataset:
// time-to-first-byte and full render for the browse, search, and detail routes, plus
// the JSON search response.
//
// The server must already be running (see docs/verification-notes.md for the exact
// command). Run: `node scripts/perf-http.cjs http://127.0.0.1:3200`
const http = require('node:http');
const { performance } = require('node:perf_hooks');

const base = process.argv[2] ?? 'http://127.0.0.1:3200';
const RUNS = Number(process.env.PERF_RUNS ?? 30);
const url = new URL(base);

/** Resolves `{ ttfb, total, status }` for one GET. */
function request(path) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get(
      { hostname: url.hostname, port: url.port, path, headers: { connection: 'close' } },
      (res) => {
        const ttfb = performance.now() - start;
        res.resume();
        res.on('end', () =>
          resolve({ ttfb, total: performance.now() - start, status: res.statusCode }),
        );
        res.on('error', reject);
      },
    );
    req.on('error', reject);
  });
}

function p75(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1)];
}

async function measure(label, path, budget, metric = 'total') {
  const first = await request(path);
  if (first.status >= 400) {
    console.log(`${label.padEnd(32)} HTTP ${first.status} — ${path}`);
    return null;
  }
  const samples = [];
  for (let i = 0; i < RUNS; i++) samples.push((await request(path))[metric]);
  const value = p75(samples);
  const verdict = budget ? (value < budget ? 'PASS' : 'FAIL') : '—';
  console.log(
    `${label.padEnd(32)} p75 ${value.toFixed(1).padStart(7)} ms  budget ${String(budget ?? '—').padStart(5)}  ${verdict}`,
  );
  return value;
}

console.log(`Measuring ${base} with ${RUNS} runs per route (warm-up discarded)\n`);

(async () => {
  const results = {
    browseTtfb: await measure('browse / TTFB', '/', 150, 'ttfb'),
    browseRender: await measure('browse / full render', '/', 250),
    browsePage2: await measure('browse /?page=2 render', '/?page=2', null),
    searchRender: await measure('search /search?q=deploy render', '/search?q=deploy', 250),
    searchApi: await measure('api /api/search?q=deploy', '/api/search?q=deploy', 100),
    detailRender: await measure('detail /articles/deploy-guide-1', '/articles/deploy-guide-1', 200),
  };
  console.log('\n' + JSON.stringify(results, null, 2));
})();
