import type { FeatureConfig, IFeature } from '../../types';

export interface CameraRotationFeatureConfig extends FeatureConfig {
  rotationSpeed?: number;
}

export interface ICameraRotationFeature extends IFeature {
  setRotationSpeed(speed: number): void;
}
