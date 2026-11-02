import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  base: '/',
  resolve: { dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'] },
  optimizeDeps: { include: ['@react-three/fiber', '@react-three/drei', 'react-router-dom'] },
  // Reuses the demo models and the Draco decoder of the docs app.
  publicDir: '../docs/public',
  cacheDir: '../../node_modules/.vite/example',
  plugins: [react({ babel: { configFile: false, babelrc: false } }), nxViteTsPaths()],
  build: { outDir: '../../dist/apps/example', emptyOutDir: true },
});
