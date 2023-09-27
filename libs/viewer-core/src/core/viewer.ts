import { inject, injectable } from 'inversify';
import type {
  IAnimationService,
  IAssetService,
  IConfigService,
  IControlService,
  ILightService,
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
    @inject(MaterialServiceToken) public materialService: IMaterialService,
    @inject(RenderServiceToken) public renderService: IRenderService,
    @inject(SceneServiceToken) public sceneService: ISceneService
  ) {}

  public init(config: ViewerConfigModel, context?: HTMLElement | WebGL2RenderingContext) {
    this.configService.loadConfig(config);
    this.renderService.init(config, context);

    this.sceneService.objectAddedToScene$.subscribe((object) => {
      this.animationService.addMixerForObject(object);
    });
    config.objects.forEach((objectSetup) => {
      this.assetService.loadObject(objectSetup.path).then((object) => {
        this.sceneService.addObjectToScene(object, objectSetup);
        this.renderService.renderSingleFrame();
      });
    });
  }
}
