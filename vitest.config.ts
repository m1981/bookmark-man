import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: ['**/.stryker-tmp/**', '**/node_modules/**'],
    typecheck: {
      tsconfig: './tsconfig.test.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**', 
        '**/*.test.ts', 
        '**/vitest.setup.ts',
        '**/.stryker-tmp/**'
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    }
  }
})