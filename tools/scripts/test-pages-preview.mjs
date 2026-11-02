import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, resolve, sep } from 'node:path';

const prefix = '/example-repo/pr/123/';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) {
      res.writeHead(404).end();
      return;
    }
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const sample = path.startsWith('sample/');
    const root = resolve(sample ? 'dist/apps/example' : 'dist/pages/storybook');
    let file = resolve(root, './' + (sample ? path.slice(7) : path));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' + url.search }).end();
        return;
      }
      file = resolve(file, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500).end();
  }
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
try {
  const { chromium } = createRequire(resolve('libs/scene-preview/package.json'))('playwright-core');
  const browser = await chromium.launch({ channel: process.env.SCENE_BROWSER_CHANNEL });
  try {
    const root = 'http://127.0.0.1:' + server.address().port + prefix;
    const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
    const escaped = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.protocol === 'http:' && u.origin === new URL(root).origin && !u.pathname.startsWith(prefix) && u.pathname !== '/favicon.ico')
        escaped.push(u.pathname);
    });
    await page.goto(root + 'sample/scenes/variants-shoe?variant=street&color=sage');
    await page.locator('[data-status=ready]').waitFor();
    await page.reload();
    await page.locator('[data-status=ready]').waitFor();
    await page.getByTestId('ds-model-tools').click();
    for (const name of ['Street', 'Sage'])
      assert.equal(await page.getByRole('menuitemradio', { name, exact: true }).getAttribute('aria-checked'), 'true');
    await page.getByTestId('ds-model-tools').click();
    await page.getByTestId('ds-studio-back').click();
    await page.getByRole('link', { name: /Milk Truck/ }).click();
    await page.locator('[data-status=ready]').waitFor();
    await page.reload();
    await page.locator('[data-status=ready]').waitFor();
    await mkdir('dist/pages-check', { recursive: true });
    await page.screenshot({ path: 'dist/pages-check/live-sample.png' });
    assert.deepEqual(escaped, []);
    const index = await (await page.request.get(root + 'index.json')).json();
    for (const id of [
      'features-customization--variant-and-tint',
      'features-highlights--wheel-inspection',
      'features-playback--disabled-with-highlights',
      'viewer-loading-and-recovery--recover-on-source-change',
      'integration-router-and-share-links--restore-and-share',
    ]) {
      assert.ok(index.entries[id], id);
      await page.goto(root + 'iframe.html?id=' + id + '&viewMode=story');
      if (id.includes('variant-and-tint')) {
        await page.waitForFunction(
          () =>
            document.querySelector('[data-testid=ds-highlight-detail] button[aria-pressed=true]')?.textContent ===
            'Street',
        );
        await page.screenshot({ path: 'dist/pages-check/variants-story.png' });
      } else if (id.includes('wheel-inspection')) await page.getByRole('button', { name: 'Freeze wheel' }).waitFor();
      else if (id.includes('disabled-with-highlights')) {
        await page.getByTestId('ds-highlight-select-current').waitFor();
        assert.equal(await page.getByTestId('ds-animation-play').count(), 0);
      } else if (id.includes('recover-on-source-change')) {
        await page.locator('[data-status=error]').waitFor();
        await page.getByRole('button', { name: 'Load Milk Truck' }).click();
        await page.locator('[data-status=ready]').waitFor();
      } else {
        await page.getByRole('button', { name: 'Reset link' }).click();
        assert.equal(await page.locator('.studio-example__address code').innerText(), '/scenes/variants-shoe');
        await page.locator('[data-status=ready]').waitFor();
      }
      console.log('Story verified:', id);
    }
    console.log('Verified nested Storybook and sample, settings restoration, refresh, navigation, Draco and HDRI.');
  } finally {
    await browser.close();
  }
} finally {
  await new Promise((done) => server.close(done));
}
