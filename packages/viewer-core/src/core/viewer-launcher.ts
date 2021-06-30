import 'reflect-metadata';
import { Container, interfaces } from 'inversify';
import { buildProviderModule } from 'inversify-binding-decorators';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IFeature, IViewer, IViewerLauncher, SizeModel, ViewerConfigModel } from '../types';
import { Viewer } from './viewer';
import { RenderService } from './services/render.service';
import { FeatureRegistryService } from '../feature/services/feature-registry.service';
import ServiceIdentifier = interfaces.ServiceIdentifier;



export class ViewerLauncher implements IViewerLauncher {
    private readonly containerDI: Container;
    private readonly featureRegistry: FeatureRegistryService;

    constructor() {
        this.containerDI = new Container();
        this.containerDI.load(buildProviderModule());
        this.featureRegistry = this.containerDI.get<FeatureRegistryService>(FeatureRegistryService);
        this.featureRegistry.setDIContainer(this.containerDI);
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


    registerFeature(id: string, feature: ServiceIdentifier<IFeature>) {
        try {
            this.featureRegistry.registerFeature(id, feature);
        } catch (exception) {
            console.warn(exception);
        }
    }
}
