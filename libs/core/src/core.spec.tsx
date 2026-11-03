import { describe, expect, it } from 'vitest';
import { defineFeature, resolveFeatureConfig, ViewerStore } from './index';

interface SkyConfig {
  preset: string;
  intensity: number;
}

const sky = defineFeature<SkyConfig>({
  id: 'sky',
  defaults: { preset: 'default', intensity: 1 },
  gltf: { extension: 'ALCM_sky' },
});

describe('resolveFeatureConfig', () => {
  it('applies precedence props > adapter > gltf > defaults', () => {
    const config = resolveFeatureConfig({
      feature: sky,
      props: { intensity: 4 },
      adapter: { intensity: 3, preset: 'adapter' },
      gltfExtensions: { ALCM_sky: { intensity: 2, preset: 'gltf' } },
    });
    expect(config).toEqual({ preset: 'adapter', intensity: 4 });
  });

  it('falls back to gltf, then defaults', () => {
    expect(resolveFeatureConfig({ feature: sky, gltfExtensions: { ALCM_sky: { preset: 'gltf' } } })).toEqual({
      preset: 'gltf',
      intensity: 1,
    });
    expect(resolveFeatureConfig({ feature: sky })).toEqual({ preset: 'default', intensity: 1 });
  });

  it('validates with the schema', () => {
    const strict = defineFeature<SkyConfig>({
      id: 'strict',
      config: {
        parse: (i) => {
          if (typeof (i as SkyConfig).preset !== 'string') throw new Error('bad');
          return i as SkyConfig;
        },
      },
    });
    expect(() => resolveFeatureConfig({ feature: strict, props: { intensity: 1 } })).toThrow('bad');
  });

  it('use() binds config', () => {
    expect(sky.use({ intensity: 5 }).config).toEqual({ intensity: 5 });
  });
});

describe('ViewerStore', () => {
  it('exposes selectable state and typed events', () => {
    const store = new ViewerStore();
    const statuses: string[] = [];
    const sub = store.select$((s) => s.status).subscribe((s) => statuses.push(s));
    store.setState({ status: 'loading' });
    store.setState({ status: 'loading' });
    store.setState({ status: 'ready' });
    expect(statuses).toEqual(['idle', 'loading', 'ready']);
    sub.unsubscribe();

    const errors: Error[] = [];
    store.on$('model:error').subscribe((e) => errors.push(e.error));
    store.emit('model:error', { error: new Error('x') });
    expect(errors).toHaveLength(1);
  });
});
