import { Material, MeshStandardMaterial } from 'three';
import { Observable, Subject } from 'rxjs';
import { provide } from 'inversify-binding-decorators';
import { FeatureConfig, FeatureId, IWireframeFeature } from '../../types';
import { MaterialService } from '../../core/services/material.service';
import { CoreFeature } from '../core-feature.map';



/**
 * When enabled all materials of all objects in the scene will be set to
 * display as wireframe.
 */
@provide(WireframeFeature)
export class WireframeFeature implements IWireframeFeature {
    readonly id: FeatureId = CoreFeature.Wireframe;
    private enabled: boolean;
    private readonly enabled$: Subject<boolean>;
    private materials: Material[];

    constructor(
        private materialService: MaterialService
    ) {
        this.enabled$ = new Subject<boolean>();
    }

    getEnabled(): Observable<boolean> {
        return this.enabled$.asObservable();
    }

    init(config: FeatureConfig) {
        this.enabled = config.enabled;
        this.enabled$.next(this.enabled);
        this.materialService.getMaterials().subscribe((materials) => {
            this.materials = materials;
            this.setWireframeEnabled(this.enabled);
        });
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.enabled$.next(this.enabled);
    }

    setWireframeEnabled(enabled: boolean): void {
        this.materials.forEach((material) => {
            if ((material as MeshStandardMaterial).wireframe !== undefined) {
                (material as MeshStandardMaterial).wireframe = enabled;
                material.needsUpdate = true;
            }
        });
    }
}