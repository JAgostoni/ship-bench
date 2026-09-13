const http = require('node:http');
const { gzipSync } = require('node:zlib');

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:3200');

function get(p) {
  return new Promise((resolve, reject) => {
    http
      .get(
        { hostname: url.hostname, port: url.port, path: p, headers: { connection: 'close' } },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
          res.on('error', reject);
        },
      )
      .on('error', reject);
  });
}

(async () => {
  for (const [label, p] of [
    ['404 floor', '/nope-not-real'],
    ['browse', '/'],
    ['editor', '/articles/deploy-guide-1/edit'],
  ]) {
    const { body } = await get(p);
    const html = body.toString('utf8');
    const srcs = [
      ...new Set(
        [...html.matchAll(/<script[^>]*src="([^"]+)"/g)]
          .map((m) => m[1])
          .filter((s) => s.startsWith('/')),
      ),
    ];
    let gz = 0;
    for (const s of srcs) {
      const a = await get(s);
      gz += gzipSync(a.body, { level: 9 }).length;
    }
    console.log(
      label.padEnd(12),
      String(srcs.length).padStart(2),
      'scripts',
      (gz / 1024).toFixed(1).padStart(7),
      'KB gz',
    );
  }
})();
