import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  // Reuses the demo models and the Draco decoder of the docs app.
  publicDir: '../docs/public',
  cacheDir: '../../node_modules/.vite/example-tanstack',
  server: { port: 3000 },
  plugins: [nxViteTsPaths(), tanstackStart(), react({ babel: { configFile: false, babelrc: false } })],
  build: { outDir: '../../dist/apps/example-tanstack' },
});
