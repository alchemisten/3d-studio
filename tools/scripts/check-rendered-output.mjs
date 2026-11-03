import assert from 'node:assert/strict';

export const checkRenderedOutput = async (browser, base) => {
  const page = await browser.newPage({viewport: {width: 480, height: 400}});
  try {
    await page.goto(new URL('scenes/desk-lamp', base).href);
    await page.locator('[data-status=ready]').waitFor();
    await page.getByRole('button', { name: 'Output' }).click();
    await page.getByRole('menuitem', { name: 'Beauty shot' }).click();
    await page.getByText('More settings').click();
    await page.getByRole('spinbutton').fill('2');
    await page.getByRole('button', { name: 'Render image' }).click();
    const result = page.getByAltText('Denoised render');
    await result.waitFor({ timeout: 120000 });
    const pixels = image => image.evaluate(async element => {
      await element.decode();
      const canvas = document.createElement('canvas');
      canvas.width = element.naturalWidth;
      canvas.height = element.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(element, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data.data)));
    });
    const filtered = await pixels(result);
    assert.equal(await page.getByText('Save image').getAttribute('href'), await result.getAttribute('src'));
    await page.getByText('Original', { exact: true }).click();
    assert.notDeepEqual(await pixels(page.getByAltText('Original render')), filtered);
    console.log('GPU capture: denoised preview matches the download URL and differs from original pixels.');
  } finally {
    await page.close();
  }
};
