import { inject, injectable } from 'inversify';
import type {
  IAnimationService,
  IAssetService,
  IConfigService,
  IControlService,
  ILightService,
  ILoggerService,
  IMaterialService,
  IRenderService,
  ISceneService,
  IViewer,
  ViewerConfigModel,
} from '../types';
import type { IFeatureService } from '../feature';
import {
  AnimationServiceToken,
  AssetServiceToken,
  ConfigServiceToken,
  ControlServiceToken,
  FeatureServiceToken,
  LightServiceToken,
  LoggerServiceToken,
  MaterialServiceToken,
  RenderServiceToken,
  SceneServiceToken,
} from '../util';

/**
 * The viewer initializes all required services with the provided config.
 */
@injectable()
export class Viewer implements IViewer {
  public constructor(
    @inject(AnimationServiceToken) public animationService: IAnimationService,
    @inject(AssetServiceToken) public assetService: IAssetService,
    @inject(ConfigServiceToken) public configService: IConfigService,
    @inject(ControlServiceToken) public controlService: IControlService,
    @inject(FeatureServiceToken) public featureService: IFeatureService,
    @inject(LightServiceToken) public lightService: ILightService,
    @inject(LoggerServiceToken) public logger: ILoggerService,
    @inject(MaterialServiceToken) public materialService: IMaterialService,
    @inject(RenderServiceToken) public renderService: IRenderService,
    @inject(SceneServiceToken) public sceneService: ISceneService
  ) {}

  public init(config: ViewerConfigModel, context?: HTMLElement | WebGL2RenderingContext) {
    this.renderService.init(context);
    this.configService.loadConfig(config);
  }
}
