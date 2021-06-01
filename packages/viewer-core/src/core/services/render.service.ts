import {PCFSoftShadowMap, PerspectiveCamera, sRGBEncoding, Vector3, WebGLRenderer} from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {Observable, Subject} from 'rxjs';
import {CameraConfigModel, IRenderService, RenderConfigModel} from '../../types';
import {SceneService} from './scene.service';
import {provideSingleton} from 'util/inversify';



// TODO: Move default config to config service
const defaultRenderConfig = <RenderConfigModel>{
    autoClear: true,
    clearColor: {
        alpha: 0.0,
        color: '#000000'
    },
    continuousRendering: false,
    outputEncoding: sRGBEncoding,
    pixelRatio: 1,
    renderSize: {
        height: 768,
        width: 1024
    },
    shadowMapEnabled: true,
    shadowMapType: PCFSoftShadowMap
};

const defaultCameraConfig = <CameraConfigModel>{
    aspect: 1024 / 768,
    far: 20000,
    fov: 37,
    near: 0.1,
    position: new Vector3(10, 10, 5),
    target: new Vector3(0, 0, 0)
};



@provideSingleton(RenderService)
export class RenderService implements IRenderService {
    readonly composer: EffectComposer;
    hookAfterRender$: Subject<boolean>;
    hookBeforeRender$: Subject<boolean>;
    readonly renderer: WebGLRenderer;
    private camera: PerspectiveCamera;
    private readonly camera$: Subject<PerspectiveCamera>;
    private continuousRenderEnabled: boolean;
    private postProcessingEnabled: boolean;
    private renderConfig: RenderConfigModel;
    private renderConfig$: Subject<RenderConfigModel>;

    constructor(
        private sceneService: SceneService
    ) {
        this.hookAfterRender$ = new Subject<boolean>();
        this.hookBeforeRender$ = new Subject<boolean>();
        this.renderer = new WebGLRenderer({ antialias: true, alpha: true });
        this.composer = new EffectComposer(this.renderer);
        this.camera = new PerspectiveCamera();
        this.camera$ = new Subject<PerspectiveCamera>();
        this.setCameraConfig(defaultCameraConfig);
        this.continuousRenderEnabled = false;
        this.renderConfig = defaultRenderConfig;
        this.renderConfig$ = new Subject<RenderConfigModel>();
        this.setRenderConfig(this.renderConfig);
    }



    getCamera(): Observable<PerspectiveCamera> {
        return this.camera$.asObservable();
    }


    getRenderConfig(): Observable<RenderConfigModel> {
        return this.renderConfig$.asObservable();
    }


    renderSingleFrame(): void {
        if (this.sceneService.scene && this.camera) {
            this.hookBeforeRender$.next(true);
            this.renderer.render(this.sceneService.scene, this.camera);
            this.hookAfterRender$.next(true);
        }
    }


    setCameraConfig(config: Partial<CameraConfigModel>): void {
        // TODO: Find better way to apply config then switch with ts-ignore
        Object.keys(config).forEach((key) => {
            switch (key) {
                case 'position':
                    // @ts-ignore
                    this.camera.position.set(config.position.x, config.position.y, config.position.z);
                    break;
                case 'target':
                    // @ts-ignore
                    this.camera.lookAt(config.target);
                    break;
                default:
                    // @ts-ignore
                    this.camera[key] = config[key];
                    break;
            }
        });
        this.camera.updateProjectionMatrix();
        this.camera$.next(this.camera);
    }


    setPostProcessingEnabled(enabled: boolean): void {
        this.postProcessingEnabled = enabled;
    }


    setRenderConfig(config: Partial<RenderConfigModel>): void {
        // TODO: Find better way to apply config then switch with ts-ignore
        Object.keys(config).forEach((key) => {
            switch (key) {
                case 'clearColor':
                    // @ts-ignore
                    if (config.clearColor.color) {
                        // @ts-ignore
                        this.renderer.setClearColor(config.clearColor.color, config.clearColor.alpha);
                    // @ts-ignore
                    } else if (config.clearColor.alpha) {
                        // @ts-ignore
                        this.renderer.setClearAlpha(config.clearColor.alpha);
                    }
                    break;
                case 'continuousRendering':
                    // @ts-ignore
                    this.setContinuousRenderingEnabled(config.continuousRendering);
                    break;
                case 'renderSize':
                    // @ts-ignore
                    this.renderer.setSize(config.renderSize.width, config.renderSize.height);
                    // @ts-ignore
                    this.composer.setSize(config.renderSize.width, config.renderSize.height);
                    break;
                case 'shadowMapEnabled':
                    // @ts-ignore
                    this.renderer.shadowMap.enabled = config.shadowMapEnabled;
                    break;
                case 'shadowMapType':
                    // @ts-ignore
                    this.renderer.shadowMap.type = config.shadowMapType;
                    break;
                default:
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