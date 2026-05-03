import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/trpc': {
        target: 'http://localhost:5757',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    // WHY: exclude e2e/ directory — Playwright specs use a different test runner
    // and must not be picked up by vitest (Symbol($$jest-matchers-object) conflict)
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
});
