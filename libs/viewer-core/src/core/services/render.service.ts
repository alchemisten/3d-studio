import { inject, injectable } from 'inversify';
import { PerspectiveCamera, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { Observable, Subject } from 'rxjs';
import type { CameraConfigModel, IConfigService, IRenderService, ISceneService, RenderConfigModel } from '../../types';
import { defaultCameraConfig, defaultRenderConfig } from './config.service';
import { ConfigServiceToken, SceneServiceToken } from '../../util';

/**
 * The render service renders the current scene to its internal canvas. By
 * default, a single image will be rendered on demand, but the renderer can be
 * configured to continuously render a new image every frame.
 */
@injectable()
export class RenderService implements IRenderService {
  public readonly composer: EffectComposer;
  public readonly hookAfterRender$: Observable<boolean>;
  public readonly hookBeforeRender$: Observable<boolean>;
  public readonly renderer: WebGLRenderer;
  private readonly afterRender$: Subject<boolean>;
  private readonly beforeRender$: Subject<boolean>;
  private readonly camera: PerspectiveCamera;
  private readonly camera$: Subject<PerspectiveCamera>;
  private continuousRenderEnabled: boolean;
  private postProcessingEnabled: boolean;
  private renderConfig: RenderConfigModel;
  private renderConfig$: Subject<RenderConfigModel>;

  public constructor(
    @inject(ConfigServiceToken) private configService: IConfigService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {
    this.afterRender$ = new Subject<boolean>();
    this.hookAfterRender$ = this.afterRender$.asObservable();
    this.beforeRender$ = new Subject<boolean>();
    this.hookBeforeRender$ = this.beforeRender$.asObservable();
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.postProcessingEnabled = false;
    this.composer = new EffectComposer(this.renderer);
    this.camera = new PerspectiveCamera();
    this.camera$ = new Subject<PerspectiveCamera>();
    this.setCameraConfig(defaultCameraConfig);
    this.continuousRenderEnabled = false;
    this.renderConfig = defaultRenderConfig;
    this.renderConfig$ = new Subject<RenderConfigModel>();
    this.setRenderConfig(this.renderConfig);

    this.configService.getConfig().subscribe((config) => {
      if (config.render) {
        this.setRenderConfig(config.render);
      }
      if (config.camera) {
        this.setCameraConfig(config.camera);
      }
    });

    this.sceneService.objectAddedToScene$.subscribe(() => {
      this.renderSingleFrame();
    });
  }

  public getCamera(): Observable<PerspectiveCamera> {
    return this.camera$.asObservable();
  }

  public getRenderConfig(): Observable<RenderConfigModel> {
    return this.renderConfig$.asObservable();
  }

  public renderSingleFrame(): void {
    if (this.sceneService.scene && this.camera) {
      this.beforeRender$.next(true);
      this.renderer.render(this.sceneService.scene, this.camera);
      this.afterRender$.next(true);
    }
  }

  public setCameraConfig(config: Partial<CameraConfigModel>): void {
    // TODO: Find better way to apply config then switch with ts-ignore
    Object.keys(config).forEach((key) => {
      switch (key) {
        case 'position':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.camera.position.set(config.position.x, config.position.y, config.position.z);
          break;
        case 'target':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.camera.lookAt(config.target);
          break;
        default:
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.camera[key] = config[key];
          break;
      }
    });
    this.camera.updateProjectionMatrix();
    this.camera$.next(this.camera);
  }

  public setPostProcessingEnabled(enabled: boolean): void {
    this.postProcessingEnabled = enabled;
  }

  public setRenderConfig(config: Partial<RenderConfigModel>): void {
    // TODO: Find better way to apply config then switch with ts-ignore
    Object.keys(config).forEach((key) => {
      switch (key) {
        case 'clearColor':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (config.clearColor.color) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.renderer.setClearColor(config.clearColor.color, config.clearColor.alpha);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
          } else if (config.clearColor?.alpha) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.renderer.setClearAlpha(config.clearColor.alpha);
          }
          break;
        case 'continuousRendering':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.setContinuousRenderingEnabled(config.continuousRendering);
          break;
        case 'renderSize':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.renderer.setSize(config.renderSize.width, config.renderSize.height);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.composer.setSize(config.renderSize.width, config.renderSize.height);
          break;
        case 'shadowMapEnabled':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.renderer.shadowMap.enabled = config.shadowMapEnabled;
          break;
        case 'shadowMapType':
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.renderer.shadowMap.type = config.shadowMapType;
          break;
        default:
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this.renderer[key] = config[key];
          break;
      }
    });
    this.renderConfig = Object.assign({}, this.renderConfig, config);
    this.renderConfig$.next(this.renderConfig);
  }

  private setContinuousRenderingEnabled(enabled: boolean): void {
    this.continuousRenderEnabled = enabled;
    if (this.continuousRenderEnabled) {
      this.renderer.setAnimationLoop(this.renderSingleFrame.bind(this));
    } else {
      this.renderer.setAnimationLoop(null);
    }
  }
}
