import type { interfaces } from 'inversify';
import type { IFeature } from '../types';
import { CameraRotationFeature, LightScenarioFeature, WireframeFeature } from './features';
import { CameraRotationFeatureToken, LightScenarioFeatureToken, WireframeFeatureToken } from '../util/constants';

export const coreFeatures: Record<symbol, interfaces.ServiceIdentifier<IFeature>> = {
  [CameraRotationFeatureToken]: CameraRotationFeature,
  [LightScenarioFeatureToken]: LightScenarioFeature,
  [WireframeFeatureToken]: WireframeFeature,
};
