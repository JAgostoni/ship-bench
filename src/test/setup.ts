import '@testing-library/jest-dom/vitest';

// NOTE: `server-only` is aliased to an empty module in `vitest.config.ts`
// (`architecture.md` §11.2). A `vi.mock` here cannot cover a deep import chain, because
// the mock only applies once Vite has resolved the specifier at all.

// jsdom implements neither PointerEvent nor the pointer-capture methods that
// Radix's Select primitive calls when its trigger is clicked, so opening a
// `ui/select` throws `target.hasPointerCapture is not a function` before any
// assertion runs. These shims are the whole of what jsdom is missing for that
// component — no behaviour is stubbed out, since pointer capture is a no-op in a
// single-pointer test environment anyway.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
