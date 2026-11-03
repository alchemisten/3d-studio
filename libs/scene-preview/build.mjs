import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const dir = 'dist/libs/scene-preview';
await mkdir(dir, { recursive: true });
const common = { bundle: true, tsconfig: 'tsconfig.base.json', logLevel: 'info' };
await build({
  ...common,
  entryPoints: ['libs/scene-preview/src/capture.tsx'],
  outfile: dir + '/capture.js',
  platform: 'browser',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
for (const name of ['index', 'cli']) {
  await build({
    ...common,
    entryPoints: ['libs/scene-preview/src/' + name + '.ts'],
    outfile: dir + '/' + name + '.js',
    platform: 'node',
    format: 'esm',
    external: ['playwright-core', 'zod'],
    banner: name === 'cli' ? { js: '#!/usr/bin/env node' } : undefined,
  });
}
await copyFile('libs/scene-preview/package.json', dir + '/package.json');
await copyFile('libs/scene-preview/README.md', dir + '/README.md');
await copyFile('LICENSE.md', dir + '/LICENSE.md');
