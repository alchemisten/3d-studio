import { inject, injectable } from 'inversify';
import { BehaviorSubject, Observable } from 'rxjs';
import { withLatestFrom } from 'rxjs/operators';
import type { Material, MeshStandardMaterial, Texture } from 'three';
import type { ILogger } from '@schablone/logging';
import type { IAssetService, ILoggerService, IMaterialService, ISceneService } from '../../../types';
import type { ISkyboxFeature, SkyboxFeatureConfig, SkyboxType } from './types';
import {
  AssetServiceToken,
  LoggerServiceToken,
  MaterialServiceToken,
  SceneServiceToken,
  SkyboxFeatureToken,
} from '../../../util';

@injectable()
export class SkyboxFeature implements ISkyboxFeature {
  public readonly id = SkyboxFeatureToken;
  private enabled!: boolean;
  private readonly enabled$: BehaviorSubject<boolean>;
  private logger: ILogger;
  private skybox!: Texture;
  private skyboxPath!: string;
  private type!: SkyboxType;
  private useForMaterialEnv!: boolean;

  public constructor(
    @inject(AssetServiceToken) private assetService: IAssetService,
    @inject(LoggerServiceToken) loggerService: ILoggerService,
    @inject(MaterialServiceToken) private materialService: IMaterialService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {
    this.logger = loggerService.withOptions({ globalLogOptions: { tags: { Feature: 'Skybox' } } });
    this.enabled$ = new BehaviorSubject<boolean>(false);
  }

  public init(config: SkyboxFeatureConfig): void {
    this.logger.debug('Initializing with config', { objects: config });
    this.enabled = config.enabled;
    this.skyboxPath = config.skyboxPath;
    this.type = config.type || 'cube';
    this.useForMaterialEnv = config.useForMaterialEnv ?? true;

    this.materialService
      .getMaterials()
      .pipe(withLatestFrom(this.enabled$))
      .subscribe(([materials, enabled]) => {
        this.setMaterialEnvironmentMap(enabled, materials);
      });
    if (this.enabled) {
      this.setSceneBackground();
    }
    this.enabled$.next(this.enabled);
  }

  public getEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.enabled) {
      this.setSceneBackground();
    } else {
      this.sceneService.scene.background = null;
    }
    this.enabled$.next(this.enabled);
  }

  private setMaterialEnvironmentMap(enabled: boolean, materials: Material[]): void {
    if (enabled && this.useForMaterialEnv) {
      materials.forEach((material) => {
        if (Object.prototype.hasOwnProperty.call(material, 'envMap')) {
          (material as MeshStandardMaterial).envMap = this.skybox;
          material.needsUpdate = true;
        }
      });
    } else {
      materials.forEach((material) => {
        if (Object.prototype.hasOwnProperty.call(material, 'envMap')) {
          (material as MeshStandardMaterial).envMap = null;
          material.needsUpdate = true;
        }
      });
    }
  }

  private setSceneBackground(): void {
    switch (this.type) {
      case 'cube':
        if (!this.skybox) {
          this.assetService.loadCubeTexture(this.skyboxPath).then((texture) => {
            this.skybox = texture;
            this.sceneService.scene.background = this.skybox;
          });
        } else {
          this.sceneService.scene.background = this.skybox;
        }
        break;
      case 'equirectangular':
        if (!this.skybox) {
          this.assetService.loadEnvironmentMap(this.skyboxPath, 1024).then((texture) => {
            this.skybox = texture.texture;
            this.sceneService.scene.background = this.skybox;
          });
        } else {
          this.sceneService.scene.background = this.skybox;
        }
        break;
      default:
        break;
    }
  }
}
