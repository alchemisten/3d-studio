import type { ReactNode } from 'react';
import { Light } from 'three';
import { defineFeature, useFeature, useViewer, useViewerState } from '@schablone/3d-studio-core';
import { MenuRadioItem } from '@schablone/3d-studio-ui';

type Vec3 = [number, number, number];

interface LightBase {
  color?: string;
  intensity?: number;
}

export type LightSetup =
  | ({ type: 'ambient' } & LightBase)
  | ({ type: 'directional'; position: Vec3; target?: Vec3 } & LightBase)
  | ({ type: 'point'; position: Vec3; distance?: number; decay?: number } & LightBase)
  | ({ type: 'spot'; position: Vec3; distance?: number; angle?: number; penumbra?: number; decay?: number } & LightBase);

/** Declarative setups are serializable (glTF extension); raw three.js lights are for code-only configs. */
export type ScenarioLight = LightSetup | Light;

export interface LightScenario {
  id: string;
  /** Plain string, or a map of locale to label. */
  label: string | Record<string, string>;
  lights: ScenarioLight[];
}

export interface LightScenariosConfig {
  /** `false` renders no scenario lights at all. */
  enabled: boolean;
  /** Id of the scenario that is active first. Defaults to the first scenario. */
  initial?: string;
  scenarios: LightScenario[];
  /** Locale used to pick a label from a label map. */
  locale: string;
}

const FEATURE_ID = 'light-scenarios';

export const scenarioLabel = (scenario: LightScenario, locale: string): string =>
  typeof scenario.label === 'string'
    ? scenario.label
    : (scenario.label[locale] ?? Object.values(scenario.label)[0] ?? scenario.id);

/** Renders one declarative light. Reuse it for custom scenario rendering. */
export const LightSetupLight = ({ setup }: { setup: LightSetup }) => {
  switch (setup.type) {
    case 'ambient':
      return <ambientLight color={setup.color} intensity={setup.intensity} />;
    case 'directional':
      return <directionalLight color={setup.color} intensity={setup.intensity} position={setup.position} />;
    case 'point':
      return (
        <pointLight
          color={setup.color}
          intensity={setup.intensity}
          position={setup.position}
          distance={setup.distance}
          decay={setup.decay}
        />
      );
    case 'spot':
      return (
        <spotLight
          color={setup.color}
          intensity={setup.intensity}
          position={setup.position}
          distance={setup.distance}
          angle={setup.angle}
          penumbra={setup.penumbra}
          decay={setup.decay}
        />
      );
  }
};

/** Renders all lights of a scenario. Use inside a `<Canvas>`. */
export const LightScenarioScene = ({ scenario }: { scenario: LightScenario }) => (
  <>
    {scenario.lights.map((light, index) =>
      light instanceof Light ? (
        <primitive key={light.uuid} object={light} />
      ) : (
        <LightSetupLight key={index} setup={light} />
      ),
    )}
  </>
);

export interface LightScenariosApi {
  scenarios: LightScenario[];
  activeId: string | undefined;
  setActive: (id: string) => void;
}

/** Active scenario and a setter, usable in the DOM tree (overlay items) and in the scene. */
export const useLightScenarios = (scenarios: LightScenario[]): LightScenariosApi => {
  const viewer = useViewer();
  const activeId = useViewerState((s) => s.featureState[FEATURE_ID] as string | undefined);
  return { scenarios, activeId, setActive: (id) => viewer.setFeatureState(FEATURE_ID, id) };
};

const Scene = () => {
  const { config } = useFeature<LightScenariosConfig>();
  const { activeId } = useLightScenarios(config.scenarios);
  const active = config.scenarios.find((s) => s.id === activeId);
  return config.enabled && active ? <LightScenarioScene scenario={active} /> : null;
};

const ScenarioItems = ({ config }: { config: LightScenariosConfig }): ReactNode => {
  const { activeId, setActive } = useLightScenarios(config.scenarios);
  return config.scenarios.map((scenario) => (
    <MenuRadioItem
      key={scenario.id}
      label={scenarioLabel(scenario, config.locale)}
      checked={scenario.id === activeId}
      onSelect={() => setActive(scenario.id)}
    />
  ));
};

/** glTF extension: `ALCM_light_scenarios`. Adds one radio item per scenario to the 'View options' menu. */
export const lightScenarios = defineFeature<LightScenariosConfig>({
  id: FEATURE_ID,
  defaults: { enabled: true, scenarios: [], locale: 'en' },
  gltf: { extension: 'ALCM_light_scenarios' },
  scene: Scene,
  slots: (ctx) => ({
    'viewer.options': { mode: 'append', order: 10, content: <ScenarioItems config={ctx.config} /> },
  }),
  setup: ({ config, viewer }) => {
    if (viewer.getState().featureState[FEATURE_ID] === undefined) {
      viewer.setFeatureState(FEATURE_ID, config.initial ?? config.scenarios[0]?.id);
    }
  },
});
