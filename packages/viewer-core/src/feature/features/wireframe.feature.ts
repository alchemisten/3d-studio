import { inject, injectable } from 'inversify';
import { Material, MeshStandardMaterial } from 'three';
import { Observable, Subject } from 'rxjs';
import {
    FeatureConfig,
    IMaterialService,
    IWireframeFeature,
    MaterialServiceToken,
    WireframeFeatureToken
} from '../../types';



/**
 * When enabled all materials of all objects in the scene will be set to
 * display as wireframe.
 */
@injectable()
export class WireframeFeature implements IWireframeFeature {
    readonly id = WireframeFeatureToken;
    private enabled: boolean;
    private readonly enabled$: Subject<boolean>;
    private materials: Material[];

    constructor(
        @inject(MaterialServiceToken) private materialService: IMaterialService
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