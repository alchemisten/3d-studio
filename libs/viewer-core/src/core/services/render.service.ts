import { inject, injectable } from 'inversify';
import { PerspectiveCamera, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { fromEvent, Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import type {
  CameraConfigModel,
  ILoggerService,
  IRenderService,
  ISceneService,
  RenderConfigModel,
  SizeModel,
  ViewerConfigModel,
} from '../../types';
import { defaultCameraConfig, defaultRenderConfig } from './config.service';
import { LoggerServiceToken, SceneServiceToken } from '../../util';

/**
 * The render service renders the current scene to its internal canvas. By
 * default a single image will be rendered on demand, but the renderer can be
 * configured to continuously render a new image every frame.
 */
@injectable()
export class RenderService implements IRenderService {
  public composer!: EffectComposer;
  public readonly hookAfterRender$: Observable<boolean>;
  public readonly hookBeforeRender$: Observable<boolean>;
  public renderer!: WebGLRenderer;
  protected readonly afterRender$: Subject<boolean>;
  protected readonly beforeRender$: Subject<boolean>;
  protected readonly camera: PerspectiveCamera;
  protected readonly camera$: Subject<PerspectiveCamera>;
  protected continuousRenderEnabled: boolean;
  protected logger: ILoggerService;
  protected node!: HTMLElement;
  protected postProcessingEnabled: boolean;
  protected renderConfig!: RenderConfigModel;
  protected renderConfig$: Subject<RenderConfigModel>;

  public constructor(
    @inject(LoggerServiceToken) logger: ILoggerService,
    @inject(SceneServiceToken) private sceneService: ISceneService
  ) {
    this.logger = logger.withOptions({ globalLogOptions: { tags: { service: 'RenderService' } } });
    this.afterRender$ = new Subject<boolean>();
    this.hookAfterRender$ = this.afterRender$.asObservable();
    this.beforeRender$ = new Subject<boolean>();
    this.hookBeforeRender$ = this.beforeRender$.asObservable();
    this.postProcessingEnabled = false;
    this.camera = new PerspectiveCamera();
    this.camera$ = new Subject<PerspectiveCamera>();
    this.continuousRenderEnabled = false;
    this.renderConfig$ = new Subject<RenderConfigModel>();
  }

  public getCamera(): Observable<PerspectiveCamera> {
    return this.camera$.asObservable();
  }

  public getRenderConfig(): Observable<RenderConfigModel> {
    return this.renderConfig$.asObservable();
  }

  public init(config: ViewerConfigModel, context?: HTMLElement | WebGL2RenderingContext): void {
    this.logger.debug(Object.prototype.toString.call(context));
    if (context && !(context instanceof HTMLElement)) {
      this.logger.fatal('This renderer needs an HTMLElement to render into.');
      return;
    }

    const renderSize: SizeModel = context
      ? (context.getBoundingClientRect() as SizeModel)
      : config.render?.renderSize ?? defaultRenderConfig.renderSize;
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
    this.composer = new EffectComposer(this.renderer);

    this.setCameraConfig(
      Object.assign(
        defaultCameraConfig,
        {
          aspect: renderSize.width / renderSize.height,
        },
        config.camera
      )
    );

    this.setRenderConfig(
      Object.assign(
        defaultRenderConfig,
        {
          pixelRatio: window ? window.devicePixelRatio : 1,
          renderSize,
        },
        config.render
      )
    );

    if (context && window) {
      this.node = context as HTMLElement;
      this.node.appendChild(this.renderer.domElement);

      fromEvent(window, 'resize').pipe(debounceTime(300)).subscribe(this.onWindowResize.bind(this));
    }
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

  private onWindowResize() {
    if (!this.node) {
      return;
    }

    const screenSize = this.node.getBoundingClientRect() as SizeModel;
    this.setRenderConfig({
      renderSize: screenSize,
    });
    this.setCameraConfig({
      aspect: screenSize.width / screenSize.height,
    });
    this.renderSingleFrame();
  }

  protected setContinuousRenderingEnabled(enabled: boolean): void {
    this.continuousRenderEnabled = enabled;
    if (this.continuousRenderEnabled) {
      this.renderer.setAnimationLoop(this.renderSingleFrame.bind(this));
    } else {
      this.renderer.setAnimationLoop(null);
    }
  }
}
