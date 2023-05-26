import type { interfaces } from 'inversify';
import type { IFeature } from '../types';
import { CameraRotationFeature, HighlightFeature, LightScenarioFeature, WireframeFeature } from './features';
import {
  CameraRotationFeatureToken,
  HighlightFeatureToken,
  LightScenarioFeatureToken,
  WireframeFeatureToken,
} from '../util/constants';

export const coreFeatures: Record<symbol, interfaces.ServiceIdentifier<IFeature>> = {
  [CameraRotationFeatureToken]: CameraRotationFeature,
  [HighlightFeatureToken]: HighlightFeature,
  [LightScenarioFeatureToken]: LightScenarioFeature,
  [WireframeFeatureToken]: WireframeFeature,
};
