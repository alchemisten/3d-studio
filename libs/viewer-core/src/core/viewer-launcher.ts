import 'reflect-metadata';
import { Container } from 'inversify';
import type { interfaces } from 'inversify';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type {
  CustomManagerMap,
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
  IViewerLauncher,
  SizeModel,
  ViewerConfigModel,
} from '../types';
import { Viewer } from './viewer';
import {
  AnimationService,
  AssetService,
  ConfigService,
  ControlService,
  LightService,
  LoggerService,
  MaterialService,
  RenderService,
  SceneService,
} from './services';
import { FeatureRegistryService, FeatureService, IFeature, IFeatureRegistryService, IFeatureService } from '../feature';
import {
  AnimationServiceToken,
  AssetServiceToken,
  ConfigServiceToken,
  ControlServiceToken,
  FeatureRegistryServiceToken,
  FeatureServiceToken,
  LightServiceToken,
  LoggerServiceToken,
  MaterialServiceToken,
  RenderServiceToken,
  SceneServiceToken,
  ViewerToken,
} from '../util';

/**
 * The viewer launcher is used to initialize the actual viewer and register
 * additional features.
 */
export class ViewerLauncher implements IViewerLauncher {
  private readonly containerDI: Container;
  private readonly featureRegistry: IFeatureRegistryService;
  private readonly logger: ILoggerService;

  public constructor(customManager?: CustomManagerMap) {
    this.containerDI = new Container();
    this.containerDI
      .bind<IAnimationService>(AnimationServiceToken)
      .to(customManager?.animation ?? AnimationService)
      .inSingletonScope();
    this.containerDI
      .bind<IAssetService>(AssetServiceToken)
      .to(customManager?.asset ?? AssetService)
      .inSingletonScope();
    this.containerDI
      .bind<IConfigService>(ConfigServiceToken)
      .to(customManager?.config ?? ConfigService)
      .inSingletonScope();
    this.containerDI
      .bind<IControlService>(ControlServiceToken)
      .to(customManager?.control ?? ControlService)
      .inSingletonScope();
    this.containerDI
      .bind<ILightService>(LightServiceToken)
      .to(customManager?.light ?? LightService)
      .inSingletonScope();
    this.containerDI
      .bind<ILoggerService>(LoggerServiceToken)
      .to(customManager?.logger ?? LoggerService)
      .inSingletonScope();
    this.containerDI
      .bind<IMaterialService>(MaterialServiceToken)
      .to(customManager?.material ?? MaterialService)
      .inSingletonScope();
    this.containerDI
      .bind<IRenderService>(RenderServiceToken)
      .to(customManager?.render ?? RenderService)
      .inSingletonScope();
    this.containerDI
      .bind<ISceneService>(SceneServiceToken)
      .to(customManager?.scene ?? SceneService)
      .inSingletonScope();
    this.containerDI
      .bind<IFeatureService>(FeatureServiceToken)
      .to(customManager?.feature ?? FeatureService)
      .inSingletonScope();
    this.containerDI
      .bind<IFeatureRegistryService>(FeatureRegistryServiceToken)
      .to(customManager?.featureRegistry ?? FeatureRegistryService)
      .inSingletonScope();
    this.containerDI.bind<IViewer>(ViewerToken).to(Viewer);

    this.featureRegistry = this.containerDI.get<IFeatureRegistryService>(FeatureRegistryServiceToken);
    this.featureRegistry.setDIContainer(this.containerDI);

    this.logger = this.containerDI.get<ILoggerService>(LoggerServiceToken);
  }

  /**
   * Initializes a viewer that renders to a canvas element that is added to
   * the provided container.
   *
   * @param container The renderer's canvas element will be appended as a
   * child of this HTMLElement
   * @param config ViewerConfigModel containing at least one object that
   * should be loaded
   * @returns The created viewer instance
   */
  public createHTMLViewer(container: HTMLElement, config: ViewerConfigModel): IViewer {
    const viewer = this.containerDI.get<IViewer>(ViewerToken);
    const screenSize = container.getBoundingClientRect() as SizeModel;
    viewer.init(screenSize, config, container);

    return viewer;
  }

  /**
   * Initializes a viewer that renders images at the provided size and
   * returns them as an Observable.
   *
   * @param renderSize SizeModel with the width and height of the desired
   * rendering
   * @param config ViewerConfigModel containing at least one object that
   * should be loaded
   * @returns An Observable of base64 encoded image source strings
   */
  public createImageViewer(renderSize: SizeModel, config: ViewerConfigModel): Observable<string> {
    const viewer = this.containerDI.get<IViewer>(ViewerToken);
    viewer.init(renderSize, config);
    const renderService = this.containerDI.get<IRenderService>(RenderServiceToken);

    return renderService.hookAfterRender$.pipe(map(() => renderService.renderer.domElement.toDataURL()));
  }

  /**
   * Adds the provided feature to the feature registry, so it can be used in
   * the viewer. The feature has to be an inversify service and implement the
   * IFeature interface.
   *
   * @param id string identifier for the feature
   * @param feature ServiceIdentifier class implementing the IFeature
   * interface
   */
  public registerFeature(id: string, feature: interfaces.ServiceIdentifier<IFeature>): void {
    try {
      this.featureRegistry.registerFeature(id, feature);
    } catch (exception) {
      this.logger.warn(`Feature ${id} won't be usable`, { error: exception });
    }
  }
}
