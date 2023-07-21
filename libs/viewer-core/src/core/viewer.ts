import { inject, injectable } from 'inversify';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
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
  SizeModel,
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
  private node!: HTMLElement;

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

    config.objects.forEach((objectSetup) => {
      this.assetService.loadObject(objectSetup.path).then((object) => {
        this.sceneService.addObjectToScene(object, objectSetup);
        this.renderService.renderSingleFrame();
      });
    });

    if (node && window) {
      this.node = node;

      this.node.appendChild(this.renderService.renderer.domElement);
      fromEvent(window, 'resize').pipe(debounceTime(300)).subscribe(this.onWindowResize.bind(this));
    }
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
