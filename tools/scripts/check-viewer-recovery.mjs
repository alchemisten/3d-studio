import assert from 'node:assert/strict';

export const checkViewerRecovery = async (browser, base) => {
  const page = await browser.newPage();
  try {
    let requests = 0;
    await page.route('**/models/desk-lamp/desk-lamp.glb', route => {
      requests++;
      return requests === 1 ? route.fulfill({ status: 503, body: 'Unavailable' }) : route.continue();
    });
    const chunks = [];
    page.on('request', request => {
      if (/render-shot|three-gpu-pathtracer/.test(request.url())) chunks.push(request.url());
    });
    await page.addInitScript(() => {
      let checks = 0;
      Object.defineProperty(navigator, 'gpu', { configurable: true, value: {
        requestAdapter: () => ++checks === 1 ? new Promise(() => {}) : Promise.resolve(null),
      } });
    });
    await page.goto(new URL('scenes/desk-lamp', base).href);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.locator('[data-status=ready]').waitFor();
    assert.equal(requests, 2);
    const output = page.getByRole('button', { name: 'Output' });
    const action = page.getByRole('menuitem', { name: 'Beauty shot' });
    await output.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    assert.ok(await action.evaluate(el => el === document.activeElement));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.getAttribute('data-testid') === 'ds-output');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.getByRole('menu').waitFor({ state: 'hidden' });
    const start = async () => {
      await output.click();
      await action.click();
      await page.getByRole('button', { name: 'Render image' }).click();
    };
    await start();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await start();
    await page.getByText('No compatible graphics device is available.').waitFor();
    await page.getByRole('button', { name: 'Back to scene', exact: true }).click();
    assert.deepEqual(chunks, []);
    console.log('Same-URL retry, menu focus, cancelled preparation and unavailable GPU passed.');
  } finally {
    await page.close();
  }
};
