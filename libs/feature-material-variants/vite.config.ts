/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  esbuild: { jsxDev: false },
  cacheDir: '../../node_modules/.vite/feature-material-variants',

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
    outDir: '../../dist/libs/feature-material-variants',
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
        'zod',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'rxjs',
        '@schablone/3d-studio-ui',
        '@schablone/3d-studio-core',
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
    name: 'feature-material-variants',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/feature-material-variants',
      provider: 'v8',
    },
  },
});
