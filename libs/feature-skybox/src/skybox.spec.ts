import { resolveFeatureConfig } from '@schablone/3d-studio-core';
import { describe, expect, it } from 'vitest';
import { skybox } from './index';

describe('skybox feature', () => {
  it('reads config from the ALCM_skybox glTF extension and lets props override', () => {
    const config = resolveFeatureConfig({
      feature: skybox,
      props: { useAsEnvironment: false },
      gltfExtensions: { ALCM_skybox: { path: '/sky', type: 'cube' } },
    });
    expect(config).toMatchObject({ path: '/sky', type: 'cube', enabled: true, useAsEnvironment: false });
  });

  it('is bindable with use()', () => {
    expect(skybox.use({ path: '/x.hdr', type: 'equirectangular' }).config?.path).toBe('/x.hdr');
  });
});
