/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  esbuild: { jsxDev: false },
  cacheDir: '../../node_modules/.vite/core',

  plugins: [
    dts({
      pathsToAliases: false,
      entryRoot: resolve(__dirname, 'src'),
      tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
    }),
    react(),
    nxViteTsPaths(),
  ],

  build: {
    outDir: '../../dist/libs/core',
    emptyOutDir: true,
    reportCompressedSize: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'use-sync-external-store/with-selector',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'lucide-react',
        'rxjs',
        '@schablone/3d-studio-ui',
        '@react-three/fiber',
        '@react-three/drei',
        /^three(\/.*)?$/,
      ],
      output: {
        assetFileNames: (asset) => (asset.names?.some((n) => n.endsWith('.css')) ? 'style.css' : 'assets/[name][extname]'),
      },
    },
  },

  test: {
    name: 'core',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/core',
      provider: 'v8',
    },
  },
});
