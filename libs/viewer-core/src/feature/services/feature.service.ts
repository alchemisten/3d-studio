import { inject, injectable } from 'inversify';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ILogger } from '@schablone/logging';
import type { IConfigService, ILoggerService } from '../../types';
import type { FeatureSetup, IFeature, IFeatureRegistryService, IFeatureService } from '../types';
import { ConfigServiceToken, FeatureRegistryServiceToken, LoggerServiceToken } from '../../util';

/**
 * The feature service provides access to all feature instances created for
 * the current viewer instance.
 */
@injectable()
export class FeatureService implements IFeatureService {
  private features: IFeature[];
  private features$: BehaviorSubject<IFeature[]>;
  private readonly logger: ILogger;

  public constructor(
    @inject(ConfigServiceToken) private configService: IConfigService,
    @inject(FeatureRegistryServiceToken) private featureRegistry: IFeatureRegistryService,
    @inject(LoggerServiceToken) logger: ILoggerService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Service: 'Feature' } } });
    this.features = [];
    this.features$ = new BehaviorSubject<IFeature[]>(this.features);
    this.configService.getConfig().subscribe((config) => {
      this.resetFeatureState();
      if (config.features) {
        this.initializeFeatures(config.features);
      }
    });
  }

  public addFeature(feature: IFeature): void {
    this.features.push(feature);
    this.features$.next(this.features);
  }

  public getFeatures(): Observable<IFeature[]> {
    return this.features$.asObservable();
  }

  public removeFeature(featureId: symbol): void {
    const featureIndex = this.features.findIndex((feature) => feature.id === featureId);
    if (featureIndex !== -1) {
      this.features[featureIndex].setEnabled(false);
      this.features.splice(featureIndex, 1);
      this.features$.next(this.features);
    }
  }

  public setFeatureEnabled(featureId: symbol, enabled: boolean): void {
    const feature = this.features.find((feature) => feature.id === featureId);
    if (feature) {
      feature.setEnabled(enabled);
    }
  }

  private initializeFeatures(features: FeatureSetup): void {
    Object.entries(features).forEach(([token, config]) => {
      try {
        const feature = this.featureRegistry.getFeatureInstance(token);
        feature.init(config);
        this.addFeature(feature);
      } catch (errorMessage) {
        this.logger.warn(`Couldn't initialize feature ${token}`, { error: errorMessage });
      }
    });
  }

  private resetFeatureState(): void {
    if (this.features.length > 0) {
      this.features.forEach((feature) => {
        feature.setEnabled(false);
      });
      this.features = [];
      this.features$.next(this.features);
    }
  }
}
