import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// `server-only` throws unless resolved under the `react-server` condition,
// which Vite does not set. The `server/**` boundary is enforced by the
// production build and by ESLint, not by the test runner.
vi.mock('server-only', () => ({}));
