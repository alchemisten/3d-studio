import 'reflect-metadata';
import { Container } from 'inversify';
import { buildProviderModule } from 'inversify-binding-decorators';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IViewer, IViewerLauncher, SizeModel, ViewerConfigModel } from '../types';
import { Viewer } from './viewer';
import { RenderService } from './services/render.service';



export class ViewerLauncher implements IViewerLauncher {
    private readonly containerDI: Container;

    constructor() {
        this.containerDI = new Container();
        this.containerDI.load(buildProviderModule());
    }


    createHTMLViewer(container: HTMLElement, config: ViewerConfigModel): IViewer {
        const viewer = this.containerDI.get<Viewer>(Viewer);
        const screenSize = container.getBoundingClientRect() as SizeModel;
        viewer.init(screenSize, config, container);

        return viewer;
    }


    createImageViewer(renderSize: SizeModel, config: ViewerConfigModel): Observable<string> {
        const viewer = this.containerDI.get<Viewer>(Viewer);
        viewer.init(renderSize, config);
        const rendererService = this.containerDI.get<RenderService>(RenderService);

        return rendererService.hookAfterRender$.pipe(
            map(() => rendererService.renderer.domElement.toDataURL())
        );
    }
}
