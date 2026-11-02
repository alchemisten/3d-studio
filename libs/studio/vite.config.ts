/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import dts from 'vite-plugin-dts';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  esbuild: { jsxDev: false },
  cacheDir: '../../node_modules/.vite/studio',

  plugins: [
    dts({
      pathsToAliases: false,
      entryRoot: resolve(__dirname, 'src'),
      tsconfigPath: resolve(__dirname, 'tsconfig.lib.json'),
    }),
    {
      name: 'studio-default-styles',
      apply: 'build',
      generateBundle: {
        order: 'post',
        handler(_, bundle) {
          const css = bundle['style.css'];
          if (!css || css.type !== 'asset') throw new Error('Missing Studio stylesheet');
          const packages = ['ui', 'core', 'feature-animation', 'feature-highlights'];
          css.source = packages.map(name => `@import "@schablone/3d-studio-${name}/style.css";`).join('\n') + '\n' + css.source;
        },
      },
    },
    react(),
    nxViteTsPaths(),
  ],

  build: {
    outDir: '../../dist/libs/studio',
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
        'lucide-react',
        'rxjs',
        '@schablone/3d-studio-ui',
        '@schablone/3d-studio-core',
        /^@schablone\/3d-studio-feature-/,
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
    name: 'studio',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/studio',
      provider: 'v8',
    },
  },
});
