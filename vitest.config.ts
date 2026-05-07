import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*', 'src/db/**/*', 'src/actions/**/*'],
    },
    alias: {
      '@/': path.resolve(__dirname, './') + '/',
    },
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './') + '/',
    },
  },
});
