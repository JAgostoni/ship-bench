import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// `server-only` throws unless resolved under the `react-server` condition,
// which Vite does not set. The `server/**` boundary is enforced by the
// production build and by ESLint, not by the test runner.
vi.mock('server-only', () => ({}));

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
