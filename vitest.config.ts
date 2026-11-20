import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Drop the repository-local git variables a hook exports (a linked worktree's GIT_DIR).
    setupFiles: ['tests/setup/scrub-git-env.ts'],
    environment: 'node',
    pool: 'forks',
    // Allow individual tests up to 60s (geodesic integration is expensive).
    testTimeout: 60000,
    // A hook that starts a subprocess does test-sized work: give it the same budget.
    hookTimeout: 60000,
    coverage: {
      include: ['src/composition/probe/**/*.ts'],
      exclude: ['src/composition/probe/index.ts', 'src/composition/probe/types.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 85,
      },
    },
  },
  benchmark: {
    include: ['bench/**/*.bench.ts'],
  },
});
