import { Observable } from 'rxjs';
import { FeatureConfig, I18nLanguageMap, IFeature, LightSetupModel } from '../../../types';
import { Light, WebGLCubeRenderTarget } from 'three';

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
