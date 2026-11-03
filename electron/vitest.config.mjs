import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/__tests__/**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**', 'resources/**', 'build/**'],
  },
});
