import { inject, injectable } from 'inversify';
import { BehaviorSubject, Observable } from 'rxjs';
import type { ColorSpace, Texture } from 'three';
import { SRGBColorSpace } from 'three';
import type { ILogger } from '@schablone/logging';
import type { IAssetService, ILoggerService, IRenderService, ISceneService } from '../../../types';
import type { ISkyboxFeature, SkyboxFeatureConfig, SkyboxType } from './types';
import {
  AssetServiceToken,
  LoggerServiceToken,
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

    this.loadSkyBox(config.skyboxPath, config.type, config.colorSpace).then((success) => {
      if (!success) {
        this.logger.warn('Failed to load skybox', { objects: config });
      } else {
        this.logger.debug('Skybox loaded', { objects: config });
      }
    });

    this.enabled$.next(this.enabled);

    // Set scene background
    this.enabled$.subscribe((enabled) => {
      this.logger.debug('SkyboxFeature enabled:', { objects: String(enabled) });
      if (enabled) {
        this.sceneService.scene.background = this.skybox;
        if (this.useForMaterialEnv) {
          this.sceneService.scene.environment = this.skybox;
        }
      } else {
        this.sceneService.scene.background = null;
        if (this.useForMaterialEnv) {
          this.sceneService.scene.environment = null;
        }
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

  private loadSkyBox(
    skyboxPath: string,
    type: SkyboxType = 'cube',
    colorSpace: ColorSpace = SRGBColorSpace
  ): Promise<boolean> {
    return new Promise((resolve) => {
      switch (type) {
        case 'cube':
          this.assetService
            .loadCubeTexture(skyboxPath)
            .then((texture) => {
              this.skybox = texture;
              this.skybox.colorSpace = colorSpace;
              if (this.enabled) {
                this.sceneService.scene.background = this.skybox;
                if (this.useForMaterialEnv) {
                  this.sceneService.scene.environment = this.skybox;
                }
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
                if (this.useForMaterialEnv) {
                  this.sceneService.scene.environment = this.skybox;
                }
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
}
