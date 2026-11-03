import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';

const require = createRequire(new URL('../../libs/scene-preview/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const server = await createServer({
  configFile: 'apps/example-tanstack/vite.config.mts',
  server: { host: '127.0.0.1', port: 0 },
});

try {
  await server.listen();
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(server.resolvedUrls.local[0]);
    assert.equal(response.status(), 200);
    await page.getByText('Spinning box', { exact: true }).click();
    await page.waitForURL('**/projects/spinning-box');
    await page.locator('[data-status="ready"]').waitFor();
    await page.reload();
    await page.locator('[data-status="ready"]').waitFor();
    await mkdir('dist/dependency-evidence', { recursive: true });
    await page.screenshot({ path: 'dist/dependency-evidence/tanstack-viewer.png' });
    assert.equal(await page.locator('a button, button a').count(), 0);
    const back = page.getByRole('link', { name: 'Back to scenes' });
    let focused = false;
    for (let step = 0; step < 20 && !focused; step++) {
      await page.keyboard.press('Tab');
      focused = await back.evaluate((element) => element === document.activeElement);
    }
    assert.ok(focused, 'Back to scenes must be keyboard reachable');
    await page.keyboard.press('Enter');
    await page.waitForURL(server.resolvedUrls.local[0]);
    await page.getByRole('heading', { name: 'Scenes', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('TanStack Start: SSR response, client navigation, model load and direct-route reload passed.');
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
