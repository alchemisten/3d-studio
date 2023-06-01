import { FeatureConfig } from '../../../types';

export type SkyboxType = 'cube' | 'equirectangular';

export interface SkyboxFeatureConfig extends FeatureConfig {
  skyboxPath: string;
  type?: SkyboxType;
  useForMaterialEnv?: boolean;
}
