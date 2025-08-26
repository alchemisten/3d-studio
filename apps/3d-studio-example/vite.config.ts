/// <reference types="vitest" />
import { replaceFiles } from '@nx/vite/plugins/rollup-replace-files.plugin';
import { defineConfig } from 'vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  root: __dirname,
  build: {
    outDir: '../../dist/apps/3d-studio-example',
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  cacheDir: '../../.vite/3d-studio-example',

  server: {
    port: 4200,
    host: 'localhost',
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [
    replaceFiles([
      {
        replace: 'apps/3d-studio-example/src/environments/environment.ts',
        with: 'apps/3d-studio-example/src/environments/environment.prod.ts',
      },
    ]),
    nxViteTsPaths(),
  ],

  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [
  //    viteTsConfigPaths({
  //      root: '../../',
  //    }),
  //  ],
  // },

  test: {
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/3d-studio-example',
      provider: 'v8',
    },
    globals: true,
    cache: {
      dir: '../../.vitest',
    },
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
