import { inject, injectable } from 'inversify';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { BehaviorSubject, Observable } from 'rxjs';

import type { IControlService } from '../../../types';
import { CameraRotationFeatureToken, ControlServiceToken } from '../../../util';
import type { CameraRotationFeatureConfig, ICameraRotationFeature } from './types';

/**
 * When enabled, the orbit controls rotate around the objects in the scene.
 */
@injectable()
export class CameraRotationFeature implements ICameraRotationFeature {
  public readonly id = CameraRotationFeatureToken;
  private controls!: OrbitControls;
  private enabled!: boolean;
  private readonly enabled$: BehaviorSubject<boolean>;

  public constructor(@inject(ControlServiceToken) private controlService: IControlService) {
    this.enabled$ = new BehaviorSubject<boolean>(false);
  }

  public getEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  public init(config: CameraRotationFeatureConfig): void {
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

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.enabled$.next(this.enabled);
    this.setRotationEnabled(this.enabled);
  }

  public setRotationSpeed(speed: number) {
    this.controls.autoRotateSpeed = speed;
  }

  private setRotationEnabled(enabled: boolean): void {
    this.controls.autoRotate = enabled;
  }
}
