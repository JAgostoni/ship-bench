import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';

const shots = [
  { name: 'articles', url: 'http://localhost:3000/articles', wait: 'h1' },
  { name: 'article', url: 'http://localhost:3000/articles/setup-nodejs-development-environment', wait: 'article, h1' },
  { name: 'edit', url: 'http://localhost:3000/articles/setup-nodejs-development-environment/edit', wait: 'textarea, input[name="title"], form' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

for (const s of shots) {
  console.log('Navigating to', s.url);
  await page.goto(s.url, { waitUntil: 'networkidle' });
  try { await page.waitForSelector(s.wait, { timeout: 5000 }); } catch {}
  const path = `evals/screenshots/${s.name}.png`;
  await page.screenshot({ path, fullPage: false, clip: { x: 0, y: 0, width: 1366, height: 768 } });
  const buf = fs.readFileSync(path);
  const png = PNG.sync.read(buf);
  console.log(`${path}: ${png.width}x${png.height}`);
  if (png.width !== 1366 || png.height !== 768) throw new Error(`Bad dimensions for ${path}`);
}

await browser.close();
console.log('DONE');
