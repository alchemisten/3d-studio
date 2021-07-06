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



/**
 * The viewer launcher is used to initialize the actual viewer and register
 * additional features.
 */
export class ViewerLauncher implements IViewerLauncher {
    private readonly containerDI: Container;
    private readonly featureRegistry: FeatureRegistryService;

    constructor() {
        this.containerDI = new Container();
        this.containerDI.load(buildProviderModule());
        this.featureRegistry = this.containerDI.get<FeatureRegistryService>(FeatureRegistryService);
        this.featureRegistry.setDIContainer(this.containerDI);
    }


    /**
     * Initializes a viewer that renders to a canvas element that is added to
     * the provided container.
     *
     * @param container The renderer's canvas element will be appended as a
     * child of this HTMLElement
     * @param config ViewerConfigModel containing at least one object that
     * should be loaded
     * @returns The created viewer instance
     */
    createHTMLViewer(container: HTMLElement, config: ViewerConfigModel): IViewer {
        const viewer = this.containerDI.get<Viewer>(Viewer);
        const screenSize = container.getBoundingClientRect() as SizeModel;
        viewer.init(screenSize, config, container);

        return viewer;
    }


    /**
     * Initializes a viewer that renders images at the provided size and
     * returns them as an Observable.
     *
     * @param renderSize SizeModel with the width and height of the desired
     * rendering
     * @param config ViewerConfigModel containing at least one object that
     * should be loaded
     * @returns An Observable of base64 encoded image source strings
     */
    createImageViewer(renderSize: SizeModel, config: ViewerConfigModel): Observable<string> {
        const viewer = this.containerDI.get<Viewer>(Viewer);
        viewer.init(renderSize, config);
        const rendererService = this.containerDI.get<RenderService>(RenderService);

        return rendererService.hookAfterRender$.pipe(
            map(() => rendererService.renderer.domElement.toDataURL())
        );
    }


    /**
     * Adds the provided feature to the feature registry so it can be used in
     * the viewer. The feature has to be an inversify service and implement the
     * IFeature interface.
     *
     * @param id string identifier for the feature
     * @param feature ServiceIdentifier class implementing the IFeature
     * interface
     */
    registerFeature(id: string, feature: ServiceIdentifier<IFeature>): void {
        try {
            this.featureRegistry.registerFeature(id, feature);
        } catch (exception) {
            console.warn(exception);
        }
    }
}
