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

    this.enabled$.subscribe((enabled) => {
      this.logger.debug('SkyboxFeature enabled:', { objects: String(enabled) });
      this.enabled = enabled;
      this.applySkybox();
    });
  }

  /**
   * The enabled flag controls the visible background only. Image based lighting
   * stays applied whenever a skybox is loaded, so switching the background off
   * yields a transparent background without unlighting every material.
   */
  private applySkybox(): void {
    if (!this.skybox) {
      this.sceneService.scene.background = null;
      return;
    }

    if (this.useForMaterialEnv) {
      this.sceneService.scene.environment = this.skybox;
    }

    this.sceneService.scene.background = this.enabled ? this.skybox : null;
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
              this.applySkybox();
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
              this.applySkybox();
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
