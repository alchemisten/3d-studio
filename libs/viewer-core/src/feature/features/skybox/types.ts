import type { FeatureConfig, IFeature } from '../../types';

export type SkyboxType = 'cube' | 'equirectangular';

export type ISkyboxFeature = IFeature;

export interface SkyboxFeatureConfig extends FeatureConfig {
  skyboxPath: string;
  type?: SkyboxType;
  useForMaterialEnv?: boolean;
}
