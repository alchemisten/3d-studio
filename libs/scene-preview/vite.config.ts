import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  root: import.meta.dirname,
  test: {
    name: 'scene-preview',
    include: ['src/**/*.spec.ts'],
  },
});
