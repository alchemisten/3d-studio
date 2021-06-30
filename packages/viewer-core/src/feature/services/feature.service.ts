import { BehaviorSubject, Observable } from 'rxjs';
import { provideSingleton } from 'util/inversify';
import { FeatureSetup, IFeature, IFeatureService } from '../../types';
import { ConfigService } from '../../core/services/config.service';
import { FeatureRegistryService } from './feature-registry.service';



@provideSingleton(FeatureService)
export class FeatureService implements IFeatureService {
    private features: IFeature[];
    private features$: BehaviorSubject<IFeature[]>;

    constructor(
        private configService: ConfigService,
        private featureRegistry: FeatureRegistryService
    ) {
        this.features = [];
        this.features$ = new BehaviorSubject<IFeature[]>(this.features);
        this.configService.getConfig().subscribe((config) => {
            this.resetFeatureState();
            if (config.features) {
                this.initializeFeatures(config.features);
            }
        });
    }



    addFeature(feature: IFeature): void {
        this.features.push(feature);
        this.features$.next(this.features);
    }


    getFeatures(): Observable<IFeature[]> {
        return this.features$.asObservable();
    }


    removeFeature(featureId: string): void {
        const featureIndex = this.features.findIndex((feature) => feature.id === featureId);
        if (featureIndex !== -1) {
            this.features[featureIndex].setEnabled(false);
            this.features.splice(featureIndex, 1);
            this.features$.next(this.features);
        }
    }


    setFeatureEnabled(featureId: string, enabled: boolean): void {
        const feature = this.features.find((feature) => feature.id === featureId);
        if (feature) {
            feature.setEnabled(enabled);
        }
    }


    private initializeFeatures(features: FeatureSetup): void {
        Object.entries(features).forEach(([id, enabled]) => {
            try {
                const feature = this.featureRegistry.getFeatureInstance(id);
                feature.init(enabled);
                this.addFeature(feature);
            } catch (errorMessage) {
                console.warn(errorMessage);
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
