import {PCFSoftShadowMap, PerspectiveCamera, sRGBEncoding, WebGLRenderer} from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {Observable, Subject} from 'rxjs';
import {IRenderService, RenderConfigModel} from '../../types';
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



@provideSingleton(RenderService)
export class RenderService implements IRenderService {
    readonly composer: EffectComposer;
    hookAfterRender$: Subject<boolean>;
    hookBeforeRender$: Subject<boolean>;
    readonly renderer: WebGLRenderer;
    private camera: PerspectiveCamera | null;
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
        this.sceneService.getCamera().subscribe(camera => {
            this.camera = camera;
        });
        this.continuousRenderEnabled = false;
        this.renderConfig = defaultRenderConfig;
        this.renderConfig$ = new Subject<RenderConfigModel>();
        this.setRenderConfig(this.renderConfig);
    }



    getRenderConfig(): Observable<RenderConfigModel> {
        return this.renderConfig$.asObservable();
    }


    renderSingleFrame(): void {
        this.animate();
    }


    setContinuousRenderingEnabled(enabled: boolean): void {
        this.continuousRenderEnabled = enabled;
    }


    setPostProcessingEnabled(enabled: boolean): void {
        this.postProcessingEnabled = enabled;
    }


    setRenderConfig(config: Partial<RenderConfigModel>): void {
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