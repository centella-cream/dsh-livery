import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/browser/**', 'node_modules/**', 'lib/**', '.tmp/**'],
    environment: 'node',
    // The compiler CLI integration tests spawn multiple subprocesses; GitHub's
    // shared runners can exceed Vitest's 5s default even when local runs finish
    // in ~4s. A bounded 20s timeout keeps real hangs visible without flaking CI.
    testTimeout: 20_000,
    reporters: ['default'],
  },
})
