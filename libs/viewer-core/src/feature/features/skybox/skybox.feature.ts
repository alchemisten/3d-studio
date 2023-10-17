import { inject, injectable } from 'inversify';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import type { Material, MeshStandardMaterial, Texture } from 'three';
import type { ILogger } from '@schablone/logging';
import type { IAssetService, ILoggerService, IMaterialService, IRenderService, ISceneService } from '../../../types';
import type { ISkyboxFeature, SkyboxFeatureConfig, SkyboxType } from './types';
import {
  AssetServiceToken,
  LoggerServiceToken,
  MaterialServiceToken,
  RenderServiceToken,
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
  private useForMaterialEnv!: boolean;

  public constructor(
    @inject(AssetServiceToken) private assetService: IAssetService,
    @inject(LoggerServiceToken) loggerService: ILoggerService,
    @inject(MaterialServiceToken) private materialService: IMaterialService,
    @inject(RenderServiceToken) private renderService: IRenderService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {
    this.logger = loggerService.withOptions({ globalLogOptions: { tags: { Feature: 'Skybox' } } });
    this.enabled$ = new BehaviorSubject<boolean>(false);
  }

  public init(config: SkyboxFeatureConfig): void {
    this.logger.debug('Initializing with config', { objects: config });
    this.enabled = config.enabled;
    this.useForMaterialEnv = config.useForMaterialEnv ?? true;

    this.loadSkyBox(config.skyboxPath, config.type).then((success) => {
      if (!success) {
        this.logger.warn('Failed to load skybox', { objects: config });
      } else {
        this.logger.debug('Skybox loaded', { objects: config });
      }

      // Set environment map for all materials
      combineLatest([this.materialService.getMaterials(), this.enabled$]).subscribe(([materials, enabled]) => {
        this.setMaterialEnvironmentMap(enabled, materials);
      });
    });

    this.enabled$.next(this.enabled);

    // Set scene background
    this.enabled$.subscribe((enabled) => {
      this.logger.debug('SkyboxFeature enabled:', { objects: String(enabled) });
      if (enabled) {
        this.sceneService.scene.background = this.skybox;
      } else {
        this.sceneService.scene.background = null;
      }
    });
  }

  public getEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.enabled$.next(this.enabled);
  }

  private loadSkyBox(skyboxPath: string, type: SkyboxType = 'cube'): Promise<boolean> {
    return new Promise((resolve) => {
      switch (type) {
        case 'cube':
          this.assetService
            .loadCubeTexture(skyboxPath)
            .then((texture) => {
              this.skybox = texture;
              if (this.enabled) {
                this.sceneService.scene.background = this.skybox;
              }
              resolve(true);
            })
            .catch(() => {
              resolve(false);
            });
          break;
        case 'equirectangular':
          this.assetService
            .loadEnvironmentMap(skyboxPath, 1024, this.renderService.renderer)
            .then((texture) => {
              this.skybox = texture.texture;
              if (this.enabled) {
                this.sceneService.scene.background = this.skybox;
              }
              resolve(true);
            })
            .catch(() => {
              resolve(false);
            });
          break;
        default:
          break;
      }
    });
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
}
