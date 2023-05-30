import { FeatureConfig, IFeature } from '../../../types';

export interface CameraRotationFeatureConfig extends FeatureConfig {
  rotationSpeed?: number;
}

export interface ICameraRotationFeature extends IFeature {
  setRotationEnabled(enabled: boolean): void;
  setRotationSpeed(speed: number): void;
}
