import { Observable } from 'rxjs';
import { Container, interfaces } from 'inversify';

export type FeatureSetup = Record<string, FeatureConfig>;

export type FeatureId = symbol;
export interface FeatureConfig {
  enabled: boolean;
  [key: string]: string | number | boolean | object | undefined;
}
export interface IFeature {
  id: FeatureId;
  getEnabled(): Observable<boolean>;
  init(config: FeatureConfig): void;
  setEnabled(enabled: boolean): void;
}

export interface IFeatureService {
  addFeature(feature: IFeature): void;
  getFeatures(): Observable<IFeature[]>;
  removeFeature(featureId: symbol): void;
  setFeatureEnabled(featureId: symbol, enabled: boolean): void;
}

export interface IFeatureRegistryService {
  getFeatureInstance(id: string): IFeature;
  registerFeature(id: string, feature: interfaces.ServiceIdentifier<IFeature>): void;
  setDIContainer(containerDI: Container): void;
}
