import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Observable, Subject } from 'rxjs';
import { provide } from 'inversify-binding-decorators';

import { CameraRotationFeatureConfig, FeatureId, ICameraRotationFeature } from '../../types';
import { ControlService } from '../../core/services/control.service';
import { CoreFeature } from '../core-feature.map';



/**
 * When enabled, the orbit controls rotate around the objects in the scene.
 */
@provide(CameraRotationFeature)
export class CameraRotationFeature implements ICameraRotationFeature {
    readonly id: FeatureId = CoreFeature.CameraRotation;
    private controls: OrbitControls;
    private enabled: boolean;
    private readonly enabled$: Subject<boolean>;

    constructor(
        private controlService: ControlService,
    ) {
        this.enabled$ = new Subject<boolean>();
    }

    getEnabled(): Observable<boolean> {
        return this.enabled$.asObservable();
    }

    init(config: CameraRotationFeatureConfig): void {
        this.enabled = config.enabled;
        this.enabled$.next(this.enabled);
        this.controlService.getControls().subscribe((controls) => {
            this.controls = controls;
            this.setRotationEnabled(this.enabled);
            if (config.rotationSpeed) {
                this.setRotationSpeed(config.rotationSpeed);
            }
        });
    }


    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.enabled$.next(this.enabled);
    }

    setRotationEnabled(enabled: boolean): void {
        this.controls.autoRotate = enabled;
    }

    setRotationSpeed(speed: number) {
        this.controls.autoRotateSpeed = speed;
    }
}
