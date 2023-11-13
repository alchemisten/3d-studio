import type { Observable } from 'rxjs';
import type { Light, WebGLCubeRenderTarget } from 'three';
import type { I18nLanguageMap, LightSetupModel } from '../../../types';
import type { FeatureConfig, IFeature } from '../../types';

export type LightScenarioId = string;
export interface LightScenarioModel {
  i18n: I18nLanguageMap;
  id: LightScenarioId;
  lights: Record<string, Light>;
  lightSetups?: LightSetupModel[];
  backgroundEnvironment?: string; // Background image or skybox
  reflectionEnvironment?: WebGLCubeRenderTarget;
}

export interface LightScenarioFeatureConfig extends FeatureConfig {
  initialScenarioId: string;
  makeStudioDefaultSelectable?: boolean;
  scenarios: LightScenarioModel[];
}

export interface ILightScenarioFeature extends IFeature {
  getActiveScenario(): Observable<LightScenarioModel>;
  getLightScenarios(): LightScenarioModel[];
  setActiveScenario(id: LightScenarioId): void;
}
