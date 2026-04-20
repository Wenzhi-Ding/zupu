/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'text-summary'],
      include: [
        'src/store/**/*.ts',
        'src/layout/**/*.ts',
        'src/utils/**/*.ts',
        'src/i18n/**/*.ts',
      ],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/store/useDataIO.ts',
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 35,
        statements: 45,
      },
    },
  },
})
