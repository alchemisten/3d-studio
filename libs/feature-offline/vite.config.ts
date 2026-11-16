/// <reference types="vitest" />
import { build, defineConfig, type Plugin } from 'vite';
import { packageManifest } from '../../tools/vite/package-manifest';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

/** Bundles the service worker into one dependency-free classic script, so hosts can ship it without a build step. */
const standaloneWorker = (): Plugin => ({
  name: 'studio-offline-standalone-worker',
  apply: 'build',
  async generateBundle() {
    const result = await build({
      configFile: false,
      root: __dirname,
      logLevel: 'warn',
      resolve: { tsconfigPaths: true },
      build: {
        write: false,
        minify: true,
        lib: {
          entry: 'src/worker/main.ts',
          formats: ['iife'],
          name: 'StudioOfflineWorker',
          fileName: () => 'sw.js',
        },
      },
    });
    const outputs = Array.isArray(result) ? result : [result];
    const chunks = outputs.flatMap((output) => ('output' in output ? output.output : []));
    const worker = chunks.find((chunk) => chunk.type === 'chunk');
    if (!worker || chunks.length !== 1) {
      throw new Error('The service worker must build into exactly one self-contained chunk.');
    }
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker.code });
  },
});

export default defineConfig({
  resolve: { tsconfigPaths: true },
  root: __dirname,
  oxc: { jsx: { development: false } },
  cacheDir: '../../node_modules/.vite/feature-offline',

  plugins: [
    packageManifest(__dirname),
    standaloneWorker(),
    dts({
      pathsToAliases: false,
      entryRoot: resolve(__dirname, 'src'),
      tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
    }),
    react(),
  ],

  build: {
    outDir: '../../dist/libs/feature-offline',
    emptyOutDir: true,
    reportCompressedSize: true,
    cssCodeSplit: false,
    lib: {
      entry: { index: 'src/index.ts', vite: 'src/vite.ts' },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ['es'],
    },
    rolldownOptions: {
      external: [
        'react',
        'react-dom',
        /^zod(\/.*)?$/,
        /^node:/,
        'vite',
        'react/jsx-runtime',
        'lucide-react',
        '@schablone/3d-studio-ui',
        '@schablone/3d-studio-core',
      ],
      output: {
        assetFileNames: (asset) =>
          asset.names?.some((n) => n.endsWith('.css')) ? 'style.css' : 'assets/[name][extname]',
      },
    },
  },

  test: {
    name: 'feature-offline',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/feature-offline',
      provider: 'v8',
    },
  },
});
