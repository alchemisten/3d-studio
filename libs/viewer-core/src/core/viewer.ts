import { inject, injectable } from 'inversify';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import type {
  IAnimationService,
  IAssetService,
  IConfigService,
  IControlService,
  IFeatureService,
  ILightService,
  IMaterialService,
  IRenderService,
  ISceneService,
  IViewer,
  SizeModel,
  ViewerConfigModel,
} from '../types';
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
  private node!: HTMLElement;

  public constructor(
    @inject(AnimationServiceToken) private animationService: IAnimationService,
    @inject(AssetServiceToken) private assetService: IAssetService,
    @inject(ConfigServiceToken) private configService: IConfigService,
    @inject(ControlServiceToken) private controlService: IControlService,
    @inject(FeatureServiceToken) private featureService: IFeatureService,
    @inject(LightServiceToken) private lightService: ILightService,
    @inject(MaterialServiceToken) private materialService: IMaterialService,
    @inject(RenderServiceToken) private renderService: IRenderService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {}

  public init(screenSize: SizeModel, config: ViewerConfigModel, node?: HTMLElement) {
    this.configService.loadConfig(config);
    this.renderService.setCameraConfig(
      Object.assign(
        {
          aspect: screenSize.width / screenSize.height,
        },
        config.camera
      )
    );
    this.renderService.setRenderConfig(
      Object.assign(
        {
          pixelRatio: window ? window.devicePixelRatio : 1,
          renderSize: screenSize,
        },
        config.render
      )
    );
    if (node && window) {
      this.node = node;
      this.node.appendChild(this.renderService.renderer.domElement);

      fromEvent(window, 'resize').pipe(debounceTime(300)).subscribe(this.onWindowResize.bind(this));
    }

    config.objects.forEach((object) => {
      this.assetService.loadObject(object.path).then((loaded) => {
        this.sceneService.addObjectToScene(loaded);
        this.renderService.renderSingleFrame();
        this.animationService.addMixerForObject(loaded);
      });
    });
  }

  private onWindowResize() {
    if (!this.node) {
      return;
    }

    const screenSize = this.node.getBoundingClientRect() as SizeModel;
    this.renderService.setRenderConfig({
      renderSize: screenSize,
    });
    this.renderService.setCameraConfig({
      aspect: screenSize.width / screenSize.height,
    });
    this.renderService.renderSingleFrame();
  }
}
