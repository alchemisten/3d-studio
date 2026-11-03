import { checkViewerRecovery } from './check-viewer-recovery.mjs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

const require = createRequire(new URL('../../libs/scene-preview/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const server = await createServer({
  configFile: 'apps/example/vite.config.ts',
  server: { host: '127.0.0.1', port: 0 },
});

try {
  await server.listen();
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    await checkViewerRecovery(browser, server.resolvedUrls.local[0]);
    if (process.env.STUDIO_TEST_WEBGPU === '1') {
      const { checkRenderedOutput } = await import('./check-rendered-output.mjs');
      await checkRenderedOutput(browser, server.resolvedUrls.local[0]);
    }
    const page = await browser.newPage();
    await page.goto(new URL('scenes/variants-shoe', server.resolvedUrls.local[0]).href);
    const marker = page.getByTestId('ds-hotspot-upper');
    await page.locator('[data-status=ready]').waitFor();
    await page.locator('[data-testid="ds-hotspot-upper"][data-positioned]').waitFor();
    await marker.evaluate((element) => {
      const positions = [];
      const sample = () => {
        const rect = element.getBoundingClientRect();
        positions.push([rect.x + rect.width / 2, rect.y + rect.height / 2]);
        requestAnimationFrame(sample);
      };
      window.markerPositions = positions;
      sample();
    });
    const bounds = await marker.boundingBox();
    assert.ok(bounds);
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const street = page.getByTestId('ds-highlight-detail').getByRole('button', { name: 'Street', exact: true });
    await street.click();
    await page.waitForURL((url) => url.searchParams.get('variant') === 'street');
    await page.evaluate(() => new Promise((resolve) => {
      const until = performance.now() + 1200;
      const tick = () => performance.now() >= until ? resolve() : requestAnimationFrame(tick);
      requestAnimationFrame(tick);
    }));
    const drift = await page.evaluate(() => {
      const [[x, y]] = window.markerPositions;
      return Math.max(...window.markerPositions.map(([left, top]) => Math.hypot(left - x, top - y)));
    });
    assert.ok(drift < 0.5, `Upper finish moved ${drift} CSS pixels`);
    console.log(`Upper finish to Street: ${drift} CSS pixels of marker drift`);
    await page.getByTestId('ds-highlight-detail-close').click();
    await marker.evaluate(async (element) => {
      const fiber = performance.getEntriesByType('resource').find(({ name }) => name.includes('@react-three_fiber.js'));
      const { _roots } = await import(fiber.name);
      const canvas = document.querySelector('canvas');
      const { camera, scene, gl } = _roots.get(canvas).store.getState();
      const anchor = camera.position.clone().set(-0.11, 0.19, 0.02);
      const orbit = { error: 0, minX: Infinity, maxX: -Infinity };
      window.orbitMeasurement = orbit;
      const afterRender = scene.onAfterRender;
      scene.onAfterRender = function (...args) {
        afterRender.apply(this, args);
        if (args[2] !== camera || gl.getRenderTarget()) return;
        const point = anchor.clone().project(camera);
        const view = canvas.getBoundingClientRect();
        const pin = element.getBoundingClientRect();
        const x = view.left + (1 + point.x) * view.width / 2;
        const y = view.top + (1 - point.y) * view.height / 2;
        orbit.minX = Math.min(orbit.minX, x);
        orbit.maxX = Math.max(orbit.maxX, x);
        orbit.error = Math.max(orbit.error, Math.hypot(x - pin.left - pin.width / 2, y - pin.top - pin.height / 2));
      };
    });
    await page.mouse.move(620, 350);
    await page.mouse.down();
    await page.mouse.move(900, 390, { steps: 45 });
    await page.mouse.up();
    const orbit = await page.evaluate(() => window.orbitMeasurement);
    assert.ok(orbit.maxX - orbit.minX > 20, 'Orbit must move the projected anchor');
    assert.ok(orbit.error < 0.5, `Orbit pin lagged by ${orbit.error} CSS pixels`);
    console.log(`Orbit: ${orbit.error} CSS pixels of maximum pin error`);
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
