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
  execFileSync(process.execPath, [process.env.npm_execpath, ...args], { cwd, stdio: 'inherit', timeout: 180000 });
const dependencies = {};
for (const lib of await readdir('libs')) {
  if (!['core', 'ui', 'studio', 'scene-preview'].includes(lib) && !lib.startsWith('feature-')) continue;
  const stage = join(sandbox, lib);
  await cp(join('dist/libs', lib), stage, { recursive: true });
  const file = join(stage, 'package.json');
  assert.ok((await readFile(join(stage, 'README.md'), 'utf8')).length > 0);
  assert.match(await readFile(join(stage, 'LICENSE.md'), 'utf8'), /MIT/);
  const pkg = JSON.parse((await readFile(file, 'utf8')).replaceAll('__root_version__', manifest.version));
  pkg.version = manifest.version;
  await writeFile(file, JSON.stringify(pkg));
  pnpm(stage, 'pack', '--pack-destination', tarballs);
  dependencies[pkg.name] = 'file:../tarballs/' + pkg.name.slice(1).replace('/', '-') + '-' + pkg.version + '.tgz';
}
await writeFile(
  join(app, 'package-types.ts'),
  Object.keys(dependencies)
    .filter((name) => name !== '@schablone/3d-studio-scene-preview')
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
  '@types/node',
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
await writeFile(
  join(app, 'node-types.ts'),
  `import type { Buffer } from 'node:buffer';
import { renderScene, type SceneDescriptor } from '@schablone/3d-studio-scene-preview';
const scene: SceneDescriptor = { source: './model.glb' };
const png: Buffer = await renderScene(scene, { timeout: 1000 });
const width: number = png.readUInt32BE(16);
export { png, width };
`,
);
await writeFile(
  join(app, 'tsconfig.node.json'),
  JSON.stringify({
    compilerOptions: {
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      types: ['node'],
      strict: true,
      skipLibCheck: false,
      noEmit: true,
    },
    files: ['node-types.ts'],
  }),
);
pnpm(app, 'exec', 'tsc', '-p', 'tsconfig.node.json');
pnpm(app, 'exec', 'vite', 'build');
const appRequire = createRequire(join(app, 'package.json'));
const thumbnailTest = join(app, 'thumbnail-test.mjs');
await writeFile(
  thumbnailTest,
  `
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { renderScene } from '@schablone/3d-studio-scene-preview';
const png = await renderScene({ source: ${JSON.stringify(join(root, 'apps/docs/public/models/spinning-box/spinning-box.gltf'))}, preview: { width: 320, height: 180 } }, { channel: process.env.SCENE_BROWSER_CHANNEL });
assert.equal(png.subarray(1, 4).toString(), 'PNG');
assert.equal(png.readUInt32BE(16), 320);
assert.equal(png.readUInt32BE(20), 180);
await writeFile(${JSON.stringify(join(root, 'dist/packed-thumbnail.png'))}, png);
`,
);
execFileSync(process.execPath, [thumbnailTest], { timeout: 60000, stdio: 'inherit' });
const descriptor = join(app, 'scene.json');
await writeFile(
  descriptor,
  JSON.stringify({
    source: join(root, 'apps/docs/public/models/spinning-box/spinning-box.gltf'),
    preview: { width: 160, height: 90 },
  }),
);
pnpm(app, 'exec', 'scene-preview', descriptor, join(root, 'dist/packed-thumbnail-cli.png'));
const cliThumbnail = await readFile(join(root, 'dist/packed-thumbnail-cli.png'));
assert.equal(cliThumbnail.subarray(1, 4).toString(), 'PNG');
assert.equal(cliThumbnail.readUInt32BE(16), 160);
assert.equal(cliThumbnail.readUInt32BE(20), 90);
console.log('Packed thumbnail API and CLI rendered PNGs.');
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
    const beautyRequests = [];
    page.on('request', (request) => {
      if (request.url().includes('render-shot')) beautyRequests.push(request.url());
    });
    await page.setViewportSize({ width: 480, height: 400 });
    await page.goto('http://127.0.0.1:' + server.httpServer.address().port + '/?beauty');
    await page.locator('[data-status=ready]').waitFor();
    await page.getByRole('button', { name: 'Output' }).click();
    await page.getByRole('menuitem', { name: 'Beauty shot' }).click();
    assert.equal(beautyRequests.length, 0, 'Renderer must remain lazy until Render');
    if (process.env.STUDIO_TEST_WEBGPU === '1') {
      await page.getByRole('button', { name: 'Render image' }).click();
      const result = page.getByAltText('Denoised render');
      await result.waitFor({ timeout: 120000 });
      assert.ok(beautyRequests.length > 0, 'Render loads the packaged renderer chunk');
      assert.equal(await page.getByText('Save image').getAttribute('href'), await result.getAttribute('src'));
      await result.evaluate((image) => image.decode());
      const litFraction = await result.evaluate((image) => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let lit = 0;
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3] > 0 && Math.max(data[index], data[index + 1], data[index + 2]) > 15) lit++;
        }
        return lit / (canvas.width * canvas.height);
      });
      assert.ok(litFraction > 0.01, `Expected a lit model, got ${litFraction} lit pixels`);
      await page.screenshot({ path: join(root, 'dist/packed-beauty-shot.png') });
      console.log('Packed Beauty Shot: lazy renderer, inline denoiser worker, and downloadable PNG passed.');
    }
    console.log('Packed Studio: strict declarations, CSS bundle, real model and playback verified.');
  } finally {
    await browser.close();
  }
} finally {
  await new Promise((resolve) => server.httpServer.close(resolve));
}
