import { expect, it } from 'vitest';
import { beautyConfig } from './config';

it('resolves a complete scene preset and rejects an invalid sample count', () => {
  const config = beautyConfig.parse({});
  expect(config.presets.find((preset) => preset.id === config.initial)?.samples).toBe(32);
  expect(beautyConfig.safeParse({ presets: [{ ...config.presets[0], samples: 0 }] }).success).toBe(false);
});
