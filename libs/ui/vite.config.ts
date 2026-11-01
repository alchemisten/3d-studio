/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import dts from 'vite-plugin-dts';
import { joinPathFragments } from '@nx/devkit';

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/ui',

  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: joinPathFragments(__dirname, 'tsconfig.lib.json'),
    }),
    react(),
    nxViteTsPaths(),
  ],

  build: {
    outDir: '../../dist/libs/ui',
    emptyOutDir: true,
    reportCompressedSize: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', /^@radix-ui\//],
      output: {
        assetFileNames: (asset) => (asset.names?.some((n) => n.endsWith('.css')) ? 'style.css' : 'assets/[name][extname]'),
      },
    },
  },

  test: {
    name: 'ui',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/ui',
      provider: 'v8',
    },
  },
});
