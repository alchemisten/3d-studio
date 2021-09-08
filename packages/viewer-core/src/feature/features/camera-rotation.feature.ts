import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Observable, Subject } from 'rxjs';
import { provide } from 'inversify-binding-decorators';

import { FeatureId, ICameraRotationFeature } from '../../types';
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

    init(enabled: boolean): void {
        this.enabled = enabled;
        this.enabled$.next(this.enabled);
        this.controlService.getControls().subscribe((controls) => {
            this.controls = controls;
            this.setRotationEnabled(this.enabled);
        });
    }

    setRotationEnabled(enabled: boolean): void {
        this.controls.autoRotate = enabled;
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.enabled$.next(this.enabled);
    }
}
