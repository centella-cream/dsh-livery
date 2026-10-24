import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/browser/**', 'node_modules/**', 'lib/**', '.tmp/**'],
    environment: 'node',
    reporters: ['default'],
  },
})
