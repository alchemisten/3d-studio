import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const sandbox = await mkdtemp(join(tmpdir(), 'studio-consumer-'));
const app = join(sandbox, 'app');
const tarballs = join(sandbox, 'tarballs');
await mkdir(tarballs);
await cp('tools/fixtures/package-consumer', app, { recursive: true });
const pnpm = (cwd, ...args) =>
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, stdio: 'inherit' });
const dependencies = {};
for (const lib of await readdir('libs')) {
  if (!['core', 'ui', 'studio'].includes(lib) && !lib.startsWith('feature-')) continue;
  const stage = join(sandbox, lib);
  await cp(join('dist/libs', lib), stage, { recursive: true });
  const file = join(stage, 'package.json');
  const pkg = JSON.parse((await readFile(file, 'utf8')).replaceAll('__root_version__', manifest.version));
  pkg.version = manifest.version;
  await writeFile(file, JSON.stringify(pkg));
  pnpm(stage, 'pack', '--pack-destination', tarballs);
  dependencies[pkg.name] = 'file:../tarballs/' + pkg.name.slice(1).replace('/', '-') + '-' + pkg.version + '.tgz';
}
await writeFile(
  join(app, 'package-types.ts'),
  Object.keys(dependencies)
    .map((name, index) => 'export type * as Package' + index + ' from ' + JSON.stringify(name) + ';')
    .join('\n'),
);
for (const name of [
  'react',
  'react-dom',
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  'rxjs',
  'lucide-react',
  '@types/three',
  '@types/react',
  '@types/react-dom',
  'typescript',
  'vite',
]) {
  dependencies[name] = JSON.parse(await readFile(resolve('node_modules', name, 'package.json'), 'utf8')).version;
}
await writeFile(
  join(app, 'package.json'),
  JSON.stringify({ name: 'studio-consumer-smoke', private: true, type: 'module', dependencies }),
);
await writeFile(join(app, 'pnpm-workspace.yaml'), 'packages: []\nonlyBuiltDependencies: [esbuild]\n');
pnpm(app, 'install', '--prefer-offline', '--ignore-workspace');
pnpm(app, 'exec', 'tsc', '-p', 'tsconfig.json');
pnpm(app, 'exec', 'vite', 'build');
const appRequire = createRequire(join(app, 'package.json'));
const { preview } = await import(
  pathToFileURL(appRequire.resolve('vite/package.json').replace(/package\.json$/, 'dist/node/index.js')).href
);
const { chromium } = createRequire(resolve('libs/scene-preview/package.json'))('playwright-core');
const server = await preview({ root: app, preview: { host: '127.0.0.1', port: 0 } });
try {
  const browser = await chromium.launch({ channel: process.env.SCENE_BROWSER_CHANNEL });
  try {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error(error));
    const project = { id: 'demo', name: 'Demo scene', source: '/demo.gltf' };
    await page.route('**/api/projects', (route) => route.fulfill({ json: [project] }));
    await page.route('**/api/projects/demo', (route) => route.fulfill({ json: project }));
    await page.route('**/demo.gltf', (route) =>
      route.fulfill({ path: join(root, 'apps/docs/public/models/spinning-box/spinning-box.gltf') }),
    );
    await page.goto('http://127.0.0.1:' + server.httpServer.address().port);
    await page.getByRole('button', { name: 'Demo scene' }).click();
    await page.locator('[data-status=ready]').waitFor();
    assert.equal(await page.locator('.ds-overlay').evaluate((el) => getComputedStyle(el).display), 'grid');
    assert.equal(await page.locator('.ds-viewer').evaluate((el) => getComputedStyle(el).position), 'relative');
    assert.equal(
      await page.getByTestId('ds-animation-scrubber').evaluate((el) => getComputedStyle(el).appearance),
      'none',
    );
    await page.screenshot({ path: join(root, 'dist/packed-consumer.png') });
    await page.route('**/missing.gltf', (route) => route.fulfill({ status: 404, body: 'missing' }));
    await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/?recovery');
    await page.locator('[data-status=error]').waitFor();
    await page.getByRole('button', { name: 'Load valid scene' }).click();
    await page.locator('[data-status=ready]').waitFor();
    console.log('Source recovery on same Viewer passed.');
    console.log('Packed Studio: strict declarations, CSS bundle, real model and playback verified.');
  } finally {
    await browser.close();
  }
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
