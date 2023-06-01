import { injectable } from 'inversify';
import type { Container, interfaces } from 'inversify';
import type { IFeature, IFeatureRegistryService } from '../../types';
import { coreFeatures } from '../core-feature.map';
import { FeatureAlreadyRegisteredError, FeatureNotRegisteredError, MissingDIContainerError } from '../../core';
import {
  CameraRotationFeature,
  HighlightFeature,
  ICameraRotationFeature,
  IHighlightFeature,
  ILightScenarioFeature,
  IWireframeFeature,
  LightScenarioFeature,
  SkyboxFeature,
  WireframeFeature,
} from '../features';
import {
  CameraRotationFeatureToken,
  HighlightFeatureToken,
  LightScenarioFeatureToken,
  SkyboxFeatureToken,
  WireframeFeatureToken,
} from '../../util';

/**
 * The feature registry service maintains a record of all features available
 * in the current viewer instance. Core features are always available and
 * additional features can be registered. Features registered here are not
 * necessarily used in the application. If a feature is supposed to be used
 * this service can provide an instance of the feature.
 *
 * This service should not be injected anywhere but the launcher because it
 * needs access to the dependency injection container of the application.
 */
@injectable()
export class FeatureRegistryService implements IFeatureRegistryService {
  private readonly registry: Record<symbol, interfaces.ServiceIdentifier<IFeature>>;
  private containerDI!: Container;

  public constructor() {
    this.registry = coreFeatures;
  }

  public getFeatureInstance(id: string): IFeature {
    if (!this.containerDI) {
      throw new MissingDIContainerError('Dependency injection container not set');
    }

    const token = Symbol.for(id);
    if (!Object.prototype.hasOwnProperty.call(this.registry, token)) {
      throw new FeatureNotRegisteredError(`No feature registered with id: ${token.toString()}`);
    }

    return this.containerDI.get<IFeature>(token);
  }

  public registerFeature(id: string, feature: interfaces.ServiceIdentifier<IFeature>): void {
    // TODO: Check if id is needed or can be deduced from feature via Decorator
    const token = Symbol.for(id);
    if (Object.prototype.hasOwnProperty.call(this.registry, token)) {
      throw new FeatureAlreadyRegisteredError(`Feature with id ${token.toString()} already registered`);
    }
    // TODO: Find out how to bind registered features or pass containerDI to new features so they can bind themselves
    this.registry[token] = feature;
  }

  public setDIContainer(containerDI: Container): void {
    this.containerDI = containerDI;
    this.containerDI
      .bind<ICameraRotationFeature>(CameraRotationFeatureToken)
      .to(CameraRotationFeature)
      .inSingletonScope();
    this.containerDI.bind<IHighlightFeature>(HighlightFeatureToken).to(HighlightFeature).inSingletonScope();
    this.containerDI.bind<ILightScenarioFeature>(LightScenarioFeatureToken).to(LightScenarioFeature).inSingletonScope();
    this.containerDI.bind<IFeature>(SkyboxFeatureToken).to(SkyboxFeature).inSingletonScope();
    this.containerDI.bind<IWireframeFeature>(WireframeFeatureToken).to(WireframeFeature).inSingletonScope();
  }
}
