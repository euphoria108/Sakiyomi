import { defineConfig } from 'vitest/config';

// Integration tests: hit a live API (see test/integration/*.test.ts).
// Run with `pnpm test:integration` (host) or `make test` (Docker).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 45000,
  },
});
