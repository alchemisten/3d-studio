/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { packageManifest } from '../../tools/vite/package-manifest';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  root: __dirname,
  oxc: { jsx: { development: false } },
  cacheDir: '../../node_modules/.vite/feature-beauty-shot',

  plugins: [
    packageManifest(__dirname),
    dts({
      pathsToAliases: false,
      entryRoot: resolve(__dirname, 'src'),
      tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
    }),
    react(),
  ],

  build: {
    outDir: '../../dist/libs/feature-beauty-shot',
    emptyOutDir: true,
    reportCompressedSize: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    rolldownOptions: {
      external: [
        'react',
        'react-dom',
        'zod',
        'three-gpu-pathtracer/webgpu',
        'react/jsx-runtime',
        'rxjs',
        '@schablone/3d-studio-ui',
        '@schablone/3d-studio-core',
        '@react-three/fiber',
        '@react-three/drei',
        /^three(\/.*)?$/,
      ],
      output: {
        assetFileNames: (asset) =>
          asset.names?.some((n) => n.endsWith('.css')) ? 'style.css' : 'assets/[name][extname]',
      },
    },
  },

  test: {
    name: 'feature-beauty-shot',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/feature-beauty-shot',
      provider: 'v8',
    },
  },
});
