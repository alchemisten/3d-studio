import {provide} from 'inversify-binding-decorators';
import {BehaviorSubject, Observable} from 'rxjs';
import {IViewer, SizeModel, UIControlModel, ViewerConfigModel, ViewerStateModel} from '../types';
import {SceneService} from './services/scene.service';
import {
    AmbientLight,
    DirectionalLight,
    Object3D,
    PerspectiveCamera,
    Vector3
} from 'three';
import {RenderService} from './services/render.service';
import {LightService} from './services/light.service';



@provide(Viewer)
export class Viewer implements IViewer<ViewerStateModel> {
    private config: ViewerConfigModel;
    private node: HTMLElement;
    private state: BehaviorSubject<ViewerStateModel>;

    constructor(
        private lightService: LightService,
        private renderService: RenderService,
        private sceneService: SceneService,
    ) {
        this.state = new BehaviorSubject<ViewerStateModel>({});
    }



    init(node: HTMLElement, config: ViewerConfigModel): void {
        const screenSize = node.getBoundingClientRect() as SizeModel;
        this.node = node;
        this.config = config;
        this.sceneService.setCamera(
            new PerspectiveCamera()
        );
        // TODO: Check alternative use cases for rendering without node attachment
        this.renderService.setRenderConfig({
            pixelRatio: window.devicePixelRatio,
            renderSize: screenSize
        });
        this.node.appendChild(this.renderService.renderer.domElement);

        const directionalLight = new DirectionalLight(0xffffff, 1.9);
        directionalLight.position.set(3, 10, -5);
        directionalLight.target = new Object3D();
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 60;
        this.lightService.addLights({
            'ambient': new AmbientLight('#aaaaaa'),
            'directional': directionalLight
        });

        this.renderService.renderSingleFrame();
    }

    getControls(): UIControlModel[] {
        return [];
    }

    getState(): Observable<ViewerStateModel> {
        return this.state.asObservable();
    }
}
