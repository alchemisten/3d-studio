import {provide} from 'inversify-binding-decorators';
import {fromEvent} from 'rxjs';
import {debounceTime} from 'rxjs/operators';
import {IViewer, SizeModel, UIControlModel, ViewerConfigModel} from '../types';
import {SceneService} from './services/scene.service';
import {
    AmbientLight,
    DirectionalLight, Material,
    Object3D,
} from 'three';
import {RenderService} from './services/render.service';
import {LightService} from './services/light.service';
import {AssetService} from './services/asset.service';
import {ControlService} from './services/control.service';
import {MaterialService} from './services/material.service';
import { ConfigService } from './services/config.service';



@provide(Viewer)
export class Viewer implements IViewer {
    private node: HTMLElement;

    constructor(
        private assetService: AssetService,
        private configService: ConfigService,
        private controlService: ControlService,
        private lightService: LightService,
        private materialService: MaterialService,
        private renderService: RenderService,
        private sceneService: SceneService,
    ) {}



    init(node: HTMLElement, config: ViewerConfigModel): void {
        const screenSize = node.getBoundingClientRect() as SizeModel;
        this.node = node;
        this.configService.loadConfig(config);
        // TODO: Check alternative use cases for rendering without node attachment
        this.renderService.setCameraConfig({
            aspect: screenSize.width / screenSize.height
        });
        this.renderService.setRenderConfig({
            pixelRatio: window.devicePixelRatio,
            renderSize: screenSize
        });
        this.node.appendChild(this.renderService.renderer.domElement);

        fromEvent(window, 'resize').pipe(
            debounceTime(300)
        ).subscribe(this.onWindowResize.bind(this));

        config.objects.forEach(object => {
            this.assetService.loadObject(object.path).then((loaded) => {
                this.sceneService.addObjectToScene(loaded);
                this.renderService.renderSingleFrame();
            });
        });
        this.materialService.getMaterials().subscribe((materials: Material[]) => {
            console.log(materials);
        });

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
    }


    getControls(): UIControlModel[] {
        return [];
    }


    private onWindowResize() {
        const screenSize = this.node.getBoundingClientRect() as SizeModel;
        this.renderService.setRenderConfig({
            renderSize: screenSize
        });
        this.renderService.setCameraConfig({
            aspect: screenSize.width / screenSize.height
        });
        this.renderService.renderSingleFrame();
    }
}
