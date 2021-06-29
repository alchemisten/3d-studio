import { Container, interfaces } from 'inversify';
import ServiceIdentifier = interfaces.ServiceIdentifier;
import { IFeature, IFeatureRegistryService } from '../../types';
import { coreFeatures } from '../core-feature.map';
import { provideSingleton } from 'util/inversify';


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
@provideSingleton(FeatureRegistryService)
export class FeatureRegistryService implements IFeatureRegistryService {
    private readonly registry: Record<string, ServiceIdentifier<IFeature>>;
    private containerDI: Container;

    constructor() {
        this.registry = coreFeatures;
    }


    getFeatureInstance(id: string): IFeature | null {
        if (!this.containerDI) {
            console.warn('Dependency injection container not set');
            return null;
        }

        if (!Object.prototype.hasOwnProperty.call(this.registry, id)) {
            console.warn(`No feature registered with id: ${id}`);
            return null;
        }

        return this.containerDI.get<IFeature>(this.registry[id]);
    }


    registerFeature(id: string, feature: ServiceIdentifier<IFeature>): void {
        if (!Object.prototype.hasOwnProperty.call(this.registry, id)) {
            this.registry[id] = feature;
        }
    }


    setDIContainer(containerDI: Container): void {
        this.containerDI = containerDI;
    }
}
