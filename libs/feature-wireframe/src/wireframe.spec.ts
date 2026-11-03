import { resolveFeatureConfig } from '@schablone/3d-studio-core';
import { describe, expect, it } from 'vitest';
import { wireframe } from './index';

describe('wireframe feature', () => {
  it('is a toggle, off by default, configurable via glTF', () => {
    expect(wireframe.toggle?.label).toBe('Wireframe');
    expect(resolveFeatureConfig({ feature: wireframe })).toEqual({ enabled: false });
    expect(resolveFeatureConfig({ feature: wireframe, gltfExtensions: { ALCM_wireframe: { enabled: true } } }).enabled).toBe(true);
  });
});
