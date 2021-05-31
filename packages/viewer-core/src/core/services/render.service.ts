import {provide} from 'inversify-binding-decorators';
import {IRenderService, SizeModel} from '../../types';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {Subject} from 'rxjs';
import {PCFSoftShadowMap, PerspectiveCamera, sRGBEncoding, WebGLRenderer} from 'three';
import {SceneService} from './scene.service';
import {provideSingleton} from 'util/inversify';






@provideSingleton(RenderService)
export class RenderService implements IRenderService {
    readonly composer: EffectComposer;
    hookAfterRender$: Subject<boolean>;
    hookBeforeRender$: Subject<boolean>;
    readonly renderer: WebGLRenderer;
    private camera: PerspectiveCamera | null;
    private continuousRenderEnabled: boolean;
    private node: HTMLElement;
    private postProcessingEnabled: boolean;

    constructor(
        private sceneService: SceneService
    ) {
        this.hookAfterRender$ = new Subject<boolean>();
        this.hookBeforeRender$ = new Subject<boolean>();
        this.renderer = new WebGLRenderer();
        this.sceneService.getCamera().subscribe(camera => {
            this.camera = camera;
        });
    }



    init(node: HTMLElement): void {
        this.node = node;

        this.renderer.setClearColor('#ffffff', 0.0);
        this.renderer.autoClear = true;
        this.renderer.outputEncoding = sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        const { height, width } = this.getViewContainerSize();
        this.renderer.setSize(width, height);
        this.node.appendChild(this.renderer.domElement);
        console.log('Renderer ready', this.renderer);
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

    private getViewContainerSize(): SizeModel {
        return this.node.getBoundingClientRect() as SizeModel;
    }
}