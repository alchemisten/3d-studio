import { Material, MeshStandardMaterial } from 'three';
import { Observable, Subject } from 'rxjs';
import { provide } from 'inversify-binding-decorators';
import { FeatureId, IWireframeFeature, UIControlModel } from '../../types';
import { MaterialService } from '../../core/services/material.service';
import { CoreFeature } from '../core-feature.map';



/**
 * When enabled all materials of all objects in the scene will be set to
 * display as wireframe.
 */
@provide(WireframeFeature)
export class WireframeFeature implements IWireframeFeature {
    readonly id: FeatureId = CoreFeature.Wireframe;
    private readonly controls: UIControlModel[];
    private enabled: boolean;
    private readonly enabled$: Subject<boolean>;
    private materials: Material[];

    constructor(
        private materialService: MaterialService
    ) {
        this.controls = [
            {
                i18n: {
                    de: {
                        label: 'Wireframe'
                    },
                    en: {
                        label: 'Wireframe'
                    }
                },
                id: 'wireframeEnabled',
                type: 'toggle',
                value: false
            }
        ];
        this.enabled$ = new Subject<boolean>();
    }

    getControls(): UIControlModel[] {
        return this.controls;
    }

    getEnabled(): Observable<boolean> {
        return this.enabled$.asObservable();
    }

    init(enabled: boolean) {
        this.enabled = enabled;
        this.enabled$.next(this.enabled);
        this.materialService.getMaterials().subscribe((materials) => {
            this.materials = materials;
            this.setWireframeEnabled(this.enabled);
        });
        this.controls[0].value = this.enabled;
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