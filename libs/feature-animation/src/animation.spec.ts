import { resolveFeatureConfig } from '@schablone/3d-studio-core';
import { describe, expect, it } from 'vitest';
import { animation } from './index';

describe('animation feature', () => {
  it('has sensible defaults and reads the ALCM_animation extension', () => {
    const config = resolveFeatureConfig({
      feature: animation,
      gltfExtensions: { ALCM_animation: { loop: 'pingpong', autoplay: ['Drive'] } },
    });
    expect(config).toMatchObject({ enabled: true, loop: 'pingpong', autoplay: ['Drive'], speed: 1, controls: true });
  });

  it('puts the controls into the configured overlay region', () => {
    const config = resolveFeatureConfig({ feature: animation, props: { controls: { region: 'top-center' } } });
    const slots = animation.slots as (ctx: { config: typeof config }) => Record<string, unknown>;
    expect(Object.keys(slots({ config }))).toEqual(['overlay.top-center']);
  });

  it('adds no overlay fill when controls are off', () => {
    const config = resolveFeatureConfig({ feature: animation, props: { controls: false } });
    const slots = animation.slots as (ctx: { config: typeof config }) => Record<string, unknown>;
    expect(slots({ config })).toEqual({});
  });
});
