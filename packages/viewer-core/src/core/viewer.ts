import {provide} from 'inversify-binding-decorators';
import {BehaviorSubject, Observable} from 'rxjs';
import {IViewer, UIControlModel, ViewerConfigModel, ViewerStateModel} from '../types';
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
        this.node = node;
        this.config = config;
        this.node.innerHTML = `<ul>${this.config.objects.map(object => '<li>' + object.name + ': ' + object.path + '</li>').join()}</ul>`;
        this.sceneService.setCamera(
            new PerspectiveCamera()
        );
        this.renderService.init(node);
    }

    getControls(): UIControlModel[] {
        return [];
    }

    getState(): Observable<ViewerStateModel> {
        return this.state.asObservable();
    }
}
