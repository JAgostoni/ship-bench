// Iteration 8.3: re-verify every contrast pair in `design-spec.md` §9.1 against the
// shipped `src/app/globals.css`, in both themes. This is the "script that parses the
// oklch() tokens and computes the ratios" the iteration brief asks for.
//
// Run: `node scripts/contrast-check.cjs`
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const css = fs.readFileSync(cssPath, 'utf8');

/** oklch(L C H) → sRGB triple in 0..1 (components outside range are clamped). */
function oklchToSrgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const encode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  return [encode(lr), encode(lg), encode(lb)].map((c) => Math.min(1, Math.max(0, c)));
}

/** WCAG relative luminance from an sRGB triple. */
function luminance([r, g, b]) {
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function ratio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Every `--color-x: oklch(...)` declaration inside `block`. */
function parseTokens(block) {
  const tokens = {};
  for (const m of block.matchAll(/--color-([a-z-]+):\s*oklch\(([^)]+)\)/g)) {
    const parts = m[2].trim().split(/\s+/);
    // Skip tokens with an alpha channel (only `--overlay`); the §9.1 pairs are opaque.
    if (parts.length > 3) continue;
    tokens[m[1]] = parts.map(Number);
  }
  return tokens;
}

// The `@theme { ... }` block is the light theme; `.dark { ... }` overrides it.
const themeBlock = css.slice(css.indexOf('@theme {'), css.indexOf('\n.dark {'));
const darkBlock = css.slice(css.indexOf('\n.dark {'), css.indexOf('/* Base */'));
const light = parseTokens(themeBlock);
const dark = { ...light, ...parseTokens(darkBlock) };

// §9.1's tables. `require` is the WCAG minimum the spec records.
const lightPairs = [
  ['ink', 'surface', 16.2, 4.5],
  ['ink', 'surface-muted', 15.16, 4.5],
  ['ink-muted', 'surface', 5.9, 4.5],
  ['ink-muted', 'surface-muted', 5.53, 4.5],
  ['ink-subtle', 'surface', 4.22, 4.5],
  ['accent-ink', 'surface', 6.82, 4.5],
  ['accent-ink', 'accent-soft', 6.22, 4.5],
  ['accent-on', 'accent', 5.47, 4.5],
  ['success', 'success-soft', 5.09, 4.5],
  ['warning', 'warning-soft', 5.71, 4.5],
  ['danger', 'surface', 5.36, 4.5],
  ['danger', 'danger-soft', 4.75, 4.5],
  ['danger-on', 'danger', 5.44, 4.5],
  ['danger-on', 'danger-hover', 6.75, 4.5],
  ['ink', 'mark-bg', 13.22, 4.5],
  ['border-strong', 'surface', 3.31, 3],
  ['ring', 'surface', 5.39, 3],
  ['disabled-ink', 'disabled-bg', 3.19, 3],
];

const darkPairs = [
  ['ink', 'surface', 16.68, 4.5],
  ['ink-muted', 'surface', 8.01, 4.5],
  ['ink-subtle', 'surface', 5.08, 4.5],
  ['accent-ink', 'surface', 9.8, 4.5],
  ['accent-ink', 'accent-soft', 7.49, 4.5],
  ['accent-on', 'accent', 4.61, 4.5],
  ['success', 'success-soft', 7.3, 4.5],
  ['warning', 'warning-soft', 7.77, 4.5],
  ['danger', 'danger-soft', 2.69, 4.5],
  ['danger-on', 'danger', 5.34, 4.5],
  ['danger-on', 'danger-hover', 4.71, 4.5],
  ['danger-ink', 'surface', 7.52, 4.5],
  ['danger-ink', 'danger-soft', 5.85, 4.5],
  ['ink', 'mark-bg', 7.07, 4.5],
  ['border-strong', 'surface-muted', 3.25, 3],
  ['disabled-ink', 'disabled-bg', 3.63, 3],
  ['border-strong', 'surface', 3.65, 3],
  ['ring', 'surface', 7.44, 3],
];

function check(themeName, tokens, pairs) {
  console.log(`\n=== ${themeName} theme (${pairs.length} pairs) ===`);
  let failures = 0;
  let maxDelta = 0;
  for (const [fg, bg, spec, required] of pairs) {
    const fr = tokens[fg];
    const br = tokens[bg];
    if (!fr || !br) {
      console.log(`  MISSING TOKEN: ${fg} / ${bg}`);
      failures++;
      continue;
    }
    const actual = ratio(oklchToSrgb(...fr), oklchToSrgb(...br));
    const delta = Math.abs(actual - spec);
    maxDelta = Math.max(maxDelta, delta);
    // The spec's own table is the reference; a drift of >0.05 means the shipped
    // colour no longer matches the documented pair.
    const matchesSpec = delta <= 0.05;
    const meetsRequirement = actual >= required;
    if (!matchesSpec || (!meetsRequirement && required !== 4.5)) failures++;
    const note = !matchesSpec
      ? `  ⚠ drifted from spec (${spec})`
      : !meetsRequirement
        ? '  (below AA — accepted, UX15)'
        : '';
    console.log(
      `  ${(fg + ' on ' + bg).padEnd(30)} ${actual.toFixed(2).padStart(6)}:1  spec ${String(spec).padStart(6)}  req ${required}  ${meetsRequirement ? 'PASS' : 'below'}
${note}`,
    );
  }
  console.log(`  max drift from spec: ${maxDelta.toFixed(3)}`);
  return failures;
}

console.log(
  `Parsed ${Object.keys(light).length} light tokens, ${Object.keys(dark).length} dark tokens from ${cssPath}`,
);
let failures = 0;
failures += check('Light', light, lightPairs);
failures += check('Dark', dark, darkPairs);
console.log(
  `\n${failures === 0 ? 'ALL CONTRAST PAIRS VERIFIED' : failures + ' pair(s) need review'}`,
);
