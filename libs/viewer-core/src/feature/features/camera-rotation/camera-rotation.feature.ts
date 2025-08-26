import { inject, injectable } from 'inversify';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ILogger } from '@schablone/logging';

import type { IControlService, ILoggerService } from '../../../types';
import { CameraRotationFeatureToken, ControlServiceToken, LoggerServiceToken } from '../../../util';
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
  private readonly logger: ILogger;

  public constructor(
    @inject(ControlServiceToken) private controlService: IControlService,
    @inject(LoggerServiceToken) logger: ILoggerService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { Feature: 'CameraRotation' } } });
    this.enabled$ = new BehaviorSubject<boolean>(false);
  }

  public getEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  public init(config: CameraRotationFeatureConfig): void {
    this.enabled = config.enabled;
    this.logger.debug('Initialized with config', { objects: config });
    this.enabled$.next(this.enabled);
    this.controlService.getControls().subscribe((controls) => {
      if (controls) {
        this.controls = controls;
        this.setRotationEnabled(this.enabled);
        if (config.rotationSpeed) {
          this.setRotationSpeed(config.rotationSpeed);
        }
      }
    });

    if (this.controls) {
      this.setRotationEnabled(this.enabled);
      if (config.rotationSpeed) {
        this.setRotationSpeed(config.rotationSpeed);
      }
    }
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
    if (this.controls) {
      this.controls.autoRotate = enabled;
    }
  }
}
