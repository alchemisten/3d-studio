import type { FeatureConfig, IFeature } from '../../types';
import type { ColorSpace } from 'three';

export type SkyboxType = 'cube' | 'equirectangular';

export type ISkyboxFeature = IFeature;

export interface SkyboxFeatureConfig extends FeatureConfig {
  colorSpace?: ColorSpace;
  skyboxPath: string;
  type?: SkyboxType;
  useForMaterialEnv?: boolean;
}
