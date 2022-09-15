import { interfaces } from 'inversify';
import ServiceIdentifier = interfaces.ServiceIdentifier;
import { CameraRotationFeatureToken, IFeature, LightScenarioFeatureToken, WireframeFeatureToken } from '../types';
import { CameraRotationFeature, LightScenarioFeature, WireframeFeature } from './features';

export const coreFeatures: Record<symbol, ServiceIdentifier<IFeature>> = {
  [CameraRotationFeatureToken]: CameraRotationFeature,
  [LightScenarioFeatureToken]: LightScenarioFeature,
  [WireframeFeatureToken]: WireframeFeature,
};
