import { expect, it } from 'vitest';
import { finishPixels } from './finish-pixels';

it('smooths grain on each side of a contrasting edge and preserves opacity', () => {
  const width = 32;
  const data = new Uint8ClampedArray(width * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < width; x++) {
      const i = 4 * (y * width + x);
      const value = (x < 16 ? 48 : 200) + ((x + y) % 2 ? 14 : -14);
      data.set([value, value, value, 180], i);
    }
  }
  const pixels = { width, height: 16, data } as ImageData;
  const original = data.slice();
  expect(finishPixels(pixels, false).data).toEqual(original);
  finishPixels(pixels, true);
  const sample = (x: number) => data[4 * (8 * width + x)];
  expect(Math.abs(sample(8) - sample(9))).toBeLessThan(5);
  expect(sample(16) - sample(15)).toBeGreaterThan(135);
  expect(data[3]).toBe(180);
});
