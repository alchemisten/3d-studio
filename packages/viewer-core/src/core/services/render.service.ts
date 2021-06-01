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
        this.renderer = new WebGLRenderer();
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
        this.animate();
    }


    setCameraConfig(config: Partial<CameraConfigModel>): void {
        // TODO: Find better way to apply config then switch with ts-ignore
        Object.entries(config).forEach(([key, value]) => {
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


    setContinuousRenderingEnabled(enabled: boolean): void {
        this.continuousRenderEnabled = enabled;
    }


    setPostProcessingEnabled(enabled: boolean): void {
        this.postProcessingEnabled = enabled;
    }


    setRenderConfig(config: Partial<RenderConfigModel>): void {
        // TODO: Complete implementation
        if (config.renderSize) {
            this.renderer.setSize(config.renderSize.width, config.renderSize.height);
            this.composer.setSize(config.renderSize.width, config.renderSize.height);
        }
        this.renderConfig = Object.assign({}, this.renderConfig, config);
        this.renderConfig$.next(this.renderConfig);
    }


    private animate() {
        this.hookBeforeRender$.next(true);
        if (this.continuousRenderEnabled) {
            requestAnimationFrame(this.animate);
            // this.controls.update();
        }
        if (this.sceneService.scene && this.camera) {
            this.renderer.render(this.sceneService.scene, this.camera);
        }
        this.hookAfterRender$.next(true);
    }
}