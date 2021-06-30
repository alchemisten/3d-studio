import { Container, interfaces } from 'inversify';
import ServiceIdentifier = interfaces.ServiceIdentifier;
import { IFeature, IFeatureRegistryService } from '../../types';
import { coreFeatures } from '../core-feature.map';
import { provideSingleton } from 'util/inversify';
import {
    FeatureAlreadyRegisteredError,
    FeatureNotRegisteredError,
    MissingDIContainerError
} from '../../core/exceptions';


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


    getFeatureInstance(id: string): IFeature {
        if (!this.containerDI) {
            throw new MissingDIContainerError('Dependency injection container not set');
        }

        if (!Object.prototype.hasOwnProperty.call(this.registry, id)) {
            throw new FeatureNotRegisteredError(`No feature registered with id: ${id}`);
        }

        return this.containerDI.get<IFeature>(this.registry[id]);
    }


    registerFeature(id: string, feature: ServiceIdentifier<IFeature>): void {
        // TODO: Check if id is needed or can be deduced from feature via Decorator
        if (Object.prototype.hasOwnProperty.call(this.registry, feature)) {
            throw new FeatureAlreadyRegisteredError(`Feature with id ${id} already registered`);
        }
        this.registry[id] = feature;
    }


    setDIContainer(containerDI: Container): void {
        this.containerDI = containerDI;
    }
}
