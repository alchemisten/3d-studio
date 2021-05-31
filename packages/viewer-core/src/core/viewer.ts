import {provide} from 'inversify-binding-decorators';
import {BehaviorSubject, Observable} from 'rxjs';
import {IViewer, SizeModel, UIControlModel, ViewerConfigModel, ViewerStateModel} from '../types';
import {SceneService} from './services/scene.service';
import {PerspectiveCamera} from 'three';
import {RenderService} from './services/render.service';


@provide(Viewer)
export class Viewer implements IViewer<ViewerStateModel> {
    private config: ViewerConfigModel;
    private node: HTMLElement;
    private state: BehaviorSubject<ViewerStateModel>;

    constructor(
        private sceneService: SceneService,
        private renderService: RenderService
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
    }

    getControls(): UIControlModel[] {
        return [];
    }

    getState(): Observable<ViewerStateModel> {
        return this.state.asObservable();
    }
}
