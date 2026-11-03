import { resolveFeatureConfig } from '@schablone/3d-studio-core';
import { describe, expect, it } from 'vitest';
import { cameraRotation } from './index';

describe('camera rotation feature', () => {
  it('has defaults and lets props override speed', () => {
    expect(resolveFeatureConfig({ feature: cameraRotation })).toEqual({ enabled: false, speed: 2 });
    expect(resolveFeatureConfig({ feature: cameraRotation, props: { speed: 5 } }).speed).toBe(5);
  });
});
