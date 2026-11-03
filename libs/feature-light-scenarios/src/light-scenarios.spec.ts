import { resolveFeatureConfig, ViewerStore } from '@schablone/3d-studio-core';
import { AmbientLight } from 'three';
import { describe, expect, it } from 'vitest';
import { lightScenarios, scenarioLabel } from './index';

describe('light scenarios feature', () => {
  it('reads scenarios from the glTF extension and lets props override', () => {
    const config = resolveFeatureConfig({
      feature: lightScenarios,
      props: { initial: 'b' },
      gltfExtensions: {
        ALCM_light_scenarios: { scenarios: [{ id: 'a', label: 'A', lights: [{ type: 'ambient' }] }] },
      },
    });
    expect(config.scenarios).toHaveLength(1);
    expect(config).toMatchObject({ initial: 'b', enabled: true });
  });

  it('keeps raw three.js lights untouched', () => {
    const light = new AmbientLight();
    const config = resolveFeatureConfig({
      feature: lightScenarios,
      props: { scenarios: [{ id: 'raw', label: 'Raw', lights: [light] }] },
    });
    expect(config.scenarios[0].lights[0]).toBe(light);
  });

  it('seeds the active scenario with the first one', () => {
    const viewer = new ViewerStore();
    const config = resolveFeatureConfig({
      feature: lightScenarios,
      props: { scenarios: [{ id: 'first', label: 'First', lights: [] }] },
    });
    lightScenarios.setup?.({ id: 'light-scenarios', config, viewer, overlay: {} as never });
    expect(viewer.getState().featureState['light-scenarios']).toBe('first');
  });

  it('picks labels by locale with fallback', () => {
    const scenario = { id: 'x', label: { de: 'Warm', en: 'Warm EN' }, lights: [] };
    expect(scenarioLabel(scenario, 'de')).toBe('Warm');
    expect(scenarioLabel(scenario, 'fr')).toBe('Warm');
  });
});
